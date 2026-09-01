import {
  APOLLO_DECISION_MAKER_SENIORITIES, APOLLO_DECISION_MAKER_TITLES,
  APOLLO_EXPANDED_DECISION_MAKER_TITLES, APOLLO_ENDPOINTS,
  APOLLO_PILOT_ENRICHMENT_FLAGS, APOLLO_PILOT_LIMITS, REQUIRED_APOLLO_CAPABILITIES,
} from "./apollo-config";
import { classifyRole } from "./normalize";
import { ROLE_RANK } from "./types";
import type {
  CompanyContext, EnrichmentProvider, ProviderContactCandidate, ProviderEnrichmentResult,
  ProviderRequestAccounting,
} from "./types";

// Apollo adapter BOUNDARY — two-stage, capped, credit-aware. Makes NO live call unless a real
// apiKey + fetch are injected. All business logic (eligibility, suppression) stays in the runner;
// this adapter only coordinates Apollo's own search->enrichment sequencing and returns the
// provider-neutral candidate contract.
//
// Stage 1  People Search   POST /api/v1/mixed_people/api_search  (domain-constrained; NO email)
// Stage 2  People Enrich    POST /api/v1/people/match            (work email only; may cost 1 credit)
//
// A People Search result is NEVER outreach-ready: it carries no email. Only an Apollo-returned
// work email with an approved verification status can later become eligible (decided by the runner).

export type ApolloErrorKind =
  | "timeout" | "rate_limit" | "transient" | "permanent" | "malformed" | "request_cap"
  | "auth" | "permission" | "credit";

export class ApolloError extends Error {
  constructor(
    public readonly kind: ApolloErrorKind,
    message: string,
    public readonly status?: number,
    public readonly attempts?: number,
  ) {
    super(message);
    this.name = "ApolloError";
  }
}

// Kinds that must never be retried and, when raised during enrichment, are systemic (they will
// recur for every company): stop rather than burn budget/credits.
const TERMINAL_KINDS: ReadonlySet<ApolloErrorKind> = new Set(["permanent", "malformed", "auth", "permission", "credit"]);

export interface ApolloClientOptions {
  timeoutMs?: number;
  maxAttemptsPerRequest?: number;
  maxBackoffMs?: number;
  maxCandidatesEnrichedPerCompany?: number;
  maxEnrichmentOperationsPerCompany?: number;
  sleep?: (ms: number) => Promise<void>;
}

interface SearchPerson {
  providerRecordId: string;
  firstName: string | null; lastName: string | null; fullName: string | null;
  title: string | null; linkedinUrl: string | null;
}

interface RunContext {
  remaining: number;       // shared physical-request budget from the runner
  requestsUsed: number;    // total physical requests performed (search + enrichment + retries)
  accounting: ProviderRequestAccounting;
}

const clean = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed : null;
};
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const zeroAccounting = (): ProviderRequestAccounting => ({
  searchRequests: 0, fallbackSearchRequests: 0, enrichmentRequests: 0, retryAttempts: 0,
  successfulEnrichments: 0, providerErrors: 0, estimatedCreditConsumingMatches: 0,
});

function classifyHttpStatus(status: number, attempt: number): ApolloError {
  if (status === 401) return new ApolloError("auth", "Apollo authentication failed (401)", status, attempt);
  if (status === 402) return new ApolloError("credit", "Apollo rejected the request for credits (402)", status, attempt);
  if (status === 403) return new ApolloError("permission", "Apollo API key lacks endpoint permission (403)", status, attempt);
  if (status === 429) return new ApolloError("rate_limit", "Apollo rate limit (429)", status, attempt);
  if (status >= 500) return new ApolloError("transient", `Apollo server error (${status})`, status, attempt);
  return new ApolloError("permanent", `Apollo request rejected (${status})`, status, attempt);
}

export class ApolloEnrichmentProvider implements EnrichmentProvider {
  readonly name = "apollo" as const;
  private readonly timeoutMs: number;
  private readonly maxAttemptsPerRequest: number;
  private readonly maxBackoffMs: number;
  private readonly maxCandidatesEnrichedPerCompany: number;
  private readonly maxEnrichmentOperationsPerCompany: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
    options: ApolloClientOptions = {},
  ) {
    if (!apiKey) throw new Error("APOLLO_API_KEY is required");
    this.timeoutMs = options.timeoutMs ?? APOLLO_PILOT_LIMITS.timeoutMs;
    this.maxAttemptsPerRequest = options.maxAttemptsPerRequest ?? APOLLO_PILOT_LIMITS.maxAttemptsPerRequest;
    this.maxBackoffMs = options.maxBackoffMs ?? APOLLO_PILOT_LIMITS.maxBackoffMs;
    this.maxCandidatesEnrichedPerCompany = options.maxCandidatesEnrichedPerCompany ?? APOLLO_PILOT_LIMITS.maxCandidatesEnrichedPerCompany;
    this.maxEnrichmentOperationsPerCompany = options.maxEnrichmentOperationsPerCompany ?? APOLLO_PILOT_LIMITS.maxEnrichmentOperationsPerCompany;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  // Least-privilege capabilities an Apollo key must carry for this pilot. Documented for a future
  // read-only preflight; intentionally not exercised here (no live call in 100B).
  static requiredCapabilities(): typeof REQUIRED_APOLLO_CAPABILITIES { return REQUIRED_APOLLO_CAPABILITIES; }

  async enrichCompany(company: CompanyContext, requestBudget: number): Promise<ProviderEnrichmentResult> {
    const ctx: RunContext = { remaining: requestBudget, requestsUsed: 0, accounting: zeroAccounting() };

    // Fail closed: Apollo search is domain-constrained. Never search the whole database.
    const domain = clean(company.websiteDomain);
    if (!domain) throw new ApolloError("permanent", "Apollo search requires a company domain; failing closed", undefined, 0);
    if (ctx.remaining <= 0) throw new ApolloError("request_cap", "Apollo request budget exhausted before search", undefined, 0);

    // Stage 1 — People Search (a search failure fails the company; the runner records it).
    const searchJson = await this.logicalRequest(APOLLO_ENDPOINTS.peopleSearch, this.searchBody(domain, false), "search", ctx);
    let parsed = this.parseSearchResponse(searchJson, ctx);
    // A strict exact-title query can miss legitimate small-business decision makers such as
    // managing members and principals. Retry once with Apollo's related-title matching while
    // retaining the employer-domain and seniority constraints. The shared physical-request cap
    // is checked before the fallback, so this can never create an unbounded provider loop.
    if (parsed.length === 0 && ctx.remaining > 0 && APOLLO_PILOT_LIMITS.maxSearchOperationsPerCompany > 1) {
      const fallbackJson = await this.logicalRequest(APOLLO_ENDPOINTS.peopleSearch, this.searchBody(domain, true), "fallback_search", ctx);
      parsed = this.parseSearchResponse(fallbackJson, ctx);
    }
    // Apollo can repeat the same person in search results. Deduplicate before the credit-bearing
    // enrichment calls so one provider id can never consume multiple matches in a run.
    const found = [...new Map(parsed.map((person) => [person.providerRecordId, person])).values()];
    if (found.length === 0) return this.result([], ctx); // no matches OR none had a usable id

    // Rank decision-makers locally, then cap the enrichment subset — BEFORE any credit call.
    const ranked = this.rankDecisionMakers(found).filter((person) =>
      ROLE_RANK[classifyRole(person.title, false, Boolean(person.fullName))] < ROLE_RANK.generic_mailbox
    );
    const selected = ranked.slice(0, this.maxCandidatesEnrichedPerCompany);

    // Stage 2 — People Enrichment for the ranked subset (work email only).
    const candidates: ProviderContactCandidate[] = [];
    let enrichmentOps = 0;
    for (const person of selected) {
      if (ctx.remaining <= 0) break;                                   // budget exhausted before enrichment
      if (enrichmentOps >= this.maxEnrichmentOperationsPerCompany) break;
      enrichmentOps += 1;
      let enrichJson: Record<string, unknown>;
      try {
        enrichJson = await this.logicalRequest(APOLLO_ENDPOINTS.peopleEnrichment, this.enrichmentBody(person.providerRecordId), "enrichment", ctx);
      } catch (error) {
        ctx.accounting.providerErrors += 1;
        if (error instanceof ApolloError && error.kind === "request_cap") break; // out of budget mid-enrichment
        if (error instanceof ApolloError && (error.kind === "auth" || error.kind === "permission" || error.kind === "credit")) throw error; // systemic
        continue; // transient/timeout/rate_limit/malformed for this candidate — skip, try the next
      }
      const matched = this.extractPerson(enrichJson);
      if (!matched) continue; // enrichment returned no match
      const email = clean(matched.email); // WORK email only (personal reveal disabled)
      if (email) { ctx.accounting.successfulEnrichments += 1; ctx.accounting.estimatedCreditConsumingMatches += 1; }
      candidates.push(this.mergeCandidate(person, matched, email));
    }
    return this.result(candidates, ctx);
  }

  private result(candidates: ProviderContactCandidate[], ctx: RunContext): ProviderEnrichmentResult {
    return { candidates, requestsUsed: ctx.requestsUsed, accounting: ctx.accounting };
  }

  private headers(): Record<string, string> {
    // The key travels only in this header object; it is never placed in a log or error message.
    return { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": this.apiKey };
  }

  private searchBody(domain: string, fallback: boolean): Record<string, unknown> {
    return {
      q_organization_domains_list: [domain],
      person_titles: [...(fallback ? APOLLO_EXPANDED_DECISION_MAKER_TITLES : APOLLO_DECISION_MAKER_TITLES)],
      person_seniorities: [...APOLLO_DECISION_MAKER_SENIORITIES],
      include_similar_titles: fallback,
      page: 1,
      per_page: APOLLO_PILOT_LIMITS.searchPerPage,
    };
  }

  private parseSearchResponse(payload: Record<string, unknown>, ctx: RunContext): SearchPerson[] {
    const rawPeople = payload.people;
    if (!Array.isArray(rawPeople)) {
      throw new ApolloError("malformed", "Apollo search response missing people[]", undefined, ctx.accounting.searchRequests);
    }
    return rawPeople.filter(isObject).map((person) => this.parseSearchPerson(person)).filter((person): person is SearchPerson => person !== null);
  }

  private enrichmentBody(personId: string): Record<string, unknown> {
    // Explicit disabled flags: work email only, no personal email, no phone, no waterfall, no webhook.
    return { id: personId, ...APOLLO_PILOT_ENRICHMENT_FLAGS };
  }

  // One logical request with bounded retries. Every physical attempt (including retries) counts
  // against the shared budget and the per-kind accounting.
  private async logicalRequest(
    endpoint: string, body: Record<string, unknown>, kind: "search" | "fallback_search" | "enrichment", ctx: RunContext,
  ): Promise<Record<string, unknown>> {
    let lastError: ApolloError | undefined;
    for (let attempt = 1; attempt <= this.maxAttemptsPerRequest; attempt += 1) {
      if (ctx.remaining <= 0) throw lastError ?? new ApolloError("request_cap", "Apollo request budget exhausted", undefined, attempt - 1);
      ctx.remaining -= 1;
      ctx.requestsUsed += 1;
      if (kind === "enrichment") ctx.accounting.enrichmentRequests += 1;
      else {
        ctx.accounting.searchRequests += 1;
        if (kind === "fallback_search") ctx.accounting.fallbackSearchRequests += 1;
      }
      if (attempt > 1) ctx.accounting.retryAttempts += 1;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(endpoint, { method: "POST", signal: controller.signal, headers: this.headers(), body: JSON.stringify(body) });
        if (!response.ok) {
          const error = classifyHttpStatus(response.status, attempt);
          if (TERMINAL_KINDS.has(error.kind) || attempt === this.maxAttemptsPerRequest) throw error;
          lastError = error; // transient / rate_limit — retry
        } else {
          let payload: unknown;
          try { payload = await response.json(); } catch { throw new ApolloError("malformed", "Apollo returned invalid JSON", response.status, attempt); }
          if (!isObject(payload)) throw new ApolloError("malformed", "Apollo returned a malformed response", response.status, attempt);
          return payload;
        }
      } catch (error) {
        if (error instanceof ApolloError) {
          if (TERMINAL_KINDS.has(error.kind) || attempt === this.maxAttemptsPerRequest) throw error;
          lastError = error;
        } else if (error instanceof Error && error.name === "AbortError") {
          lastError = new ApolloError("timeout", "Apollo request timed out", undefined, attempt);
          if (attempt === this.maxAttemptsPerRequest) throw lastError;
        } else {
          lastError = new ApolloError("transient", error instanceof Error ? error.message : "Apollo network failure", undefined, attempt);
          if (attempt === this.maxAttemptsPerRequest) throw lastError;
        }
      } finally {
        clearTimeout(timer);
      }
      await this.sleep(Math.min(100 * 2 ** (attempt - 1), this.maxBackoffMs));
    }
    throw lastError ?? new ApolloError("transient", "Apollo retry exhaustion");
  }

  private parseSearchPerson(person: Record<string, unknown>): SearchPerson | null {
    const providerRecordId = clean(person.id); // People Search identifier; defensively required
    if (!providerRecordId) return null;
    const firstName = clean(person.first_name);
    const lastName = clean(person.last_name);
    return {
      providerRecordId, firstName, lastName,
      fullName: clean(person.name) ?? clean([firstName, lastName].filter(Boolean).join(" ")),
      title: clean(person.title),
      linkedinUrl: clean(person.linkedin_url),
    };
  }

  private rankDecisionMakers(people: SearchPerson[]): SearchPerson[] {
    // Stable sort by decision-maker strength (lower ROLE_RANK = stronger). Ties keep search order.
    return people
      .map((person, index) => ({ person, index, rank: ROLE_RANK[classifyRole(person.title, false, Boolean(person.fullName))] }))
      .sort((a, b) => (a.rank - b.rank) || (a.index - b.index))
      .map((entry) => entry.person);
  }

  private extractPerson(payload: Record<string, unknown>): Record<string, unknown> | null {
    if (isObject(payload.person)) return payload.person as Record<string, unknown>;
    // Some responses return the person at the top level; accept only if it carries an id/email.
    if (clean(payload.id) || clean(payload.email)) return payload;
    return null;
  }

  private mergeCandidate(search: SearchPerson, enriched: Record<string, unknown>, email: string | null): ProviderContactCandidate {
    return {
      providerRecordId: search.providerRecordId, // stable person id from Stage 1
      firstName: clean(enriched.first_name) ?? search.firstName,
      lastName: clean(enriched.last_name) ?? search.lastName,
      fullName: clean(enriched.name) ?? search.fullName,
      title: clean(enriched.title) ?? search.title,
      email,                                   // work email from enrichment only (may be null -> needs_enrichment)
      phone: null,                             // phone enrichment is disabled; never surfaced
      linkedinUrl: clean(enriched.linkedin_url) ?? search.linkedinUrl,
      providerVerificationStatus: clean(enriched.email_status),
      providerMetadata: { apolloStage: "people/match" }, // non-sensitive provenance only
    };
  }
}
