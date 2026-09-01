import { classifyRole } from "./normalize";
import { ROLE_RANK } from "./types";
import type {
  CompanyContext, EnrichmentProvider, ProviderContactCandidate, ProviderEnrichmentResult,
  ProviderRequestAccounting,
} from "./types";

const DOMAIN_SEARCH = "https://api.hunter.io/v2/domain-search";
const EMAIL_VERIFIER = "https://api.hunter.io/v2/email-verifier";

type HunterErrorKind = "auth" | "credit" | "rate_limit" | "transient" | "permanent" | "malformed" | "request_cap";

export class HunterError extends Error {
  constructor(public readonly kind: HunterErrorKind, message: string, public readonly status?: number) {
    super(message);
    this.name = "HunterError";
  }
}

export interface HunterClientOptions {
  timeoutMs?: number;
  maxCandidatesVerifiedPerCompany?: number;
}

interface HunterEmail {
  value: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  linkedinUrl: string | null;
  confidence: number | null;
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const clean = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;
const accounting = (): ProviderRequestAccounting => ({
  searchRequests: 0, fallbackSearchRequests: 0, enrichmentRequests: 0, retryAttempts: 0,
  successfulEnrichments: 0, providerErrors: 0, estimatedCreditConsumingMatches: 0,
});

export class HunterEnrichmentProvider implements EnrichmentProvider {
  readonly name = "hunter" as const;
  private readonly timeoutMs: number;
  private readonly maxCandidatesVerifiedPerCompany: number;

  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch, options: HunterClientOptions = {}) {
    if (!apiKey) throw new Error("HUNTER_API_KEY is required");
    this.timeoutMs = options.timeoutMs ?? 8_000;
    this.maxCandidatesVerifiedPerCompany = options.maxCandidatesVerifiedPerCompany ?? 3;
  }

  async enrichCompany(company: CompanyContext, requestBudget: number): Promise<ProviderEnrichmentResult> {
    const domain = clean(company.websiteDomain);
    if (!domain) throw new HunterError("permanent", "Hunter domain search requires a company domain");
    if (requestBudget < 1) throw new HunterError("request_cap", "Hunter request budget exhausted before domain search");
    const usage = accounting();
    let remaining = requestBudget;
    const search = await this.get(DOMAIN_SEARCH, { domain, type: "personal", limit: "10" });
    remaining -= 1;
    usage.searchRequests += 1;
    const ranked = this.parseDomainSearch(search)
      .filter((candidate) => ROLE_RANK[classifyRole(candidate.title, false, Boolean(candidate.fullName))] < ROLE_RANK.generic_mailbox)
      .sort((a, b) => ROLE_RANK[classifyRole(a.title, false, Boolean(a.fullName))] - ROLE_RANK[classifyRole(b.title, false, Boolean(b.fullName))]
        || (b.confidence ?? 0) - (a.confidence ?? 0))
      .slice(0, this.maxCandidatesVerifiedPerCompany);

    const candidates: ProviderContactCandidate[] = [];
    for (const person of ranked) {
      if (remaining < 1) break;
      remaining -= 1;
      usage.enrichmentRequests += 1;
      usage.estimatedCreditConsumingMatches += 1;
      let verification: Record<string, unknown>;
      try {
        verification = await this.get(EMAIL_VERIFIER, { email: person.value });
      } catch (error) {
        usage.providerErrors += 1;
        if (error instanceof HunterError && ["auth", "credit"].includes(error.kind)) throw error;
        continue;
      }
      const data = object(verification.data) ? verification.data : null;
      const status = clean(data?.status);
      if (status === "valid") usage.successfulEnrichments += 1;
      candidates.push({
        providerRecordId: person.value.toLowerCase(), firstName: person.firstName, lastName: person.lastName,
        fullName: person.fullName, title: person.title, email: person.value, linkedinUrl: person.linkedinUrl,
        providerVerificationStatus: status, providerMetadata: { confidence: person.confidence, source: "domain_search_and_verifier" },
      });
    }
    return { candidates, requestsUsed: usage.searchRequests + usage.enrichmentRequests, accounting: usage };
  }

  private headers(): Record<string, string> {
    return { Accept: "application/json", "X-API-KEY": this.apiKey };
  }

  private async get(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
    const url = new URL(endpoint);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { method: "GET", headers: this.headers(), signal: controller.signal });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new HunterError("auth", "Hunter authentication or permission failure", response.status);
        if (response.status === 402) throw new HunterError("credit", "Hunter credit limit reached", response.status);
        if (response.status === 429) throw new HunterError("rate_limit", "Hunter rate limit reached", response.status);
        if (response.status >= 500) throw new HunterError("transient", `Hunter server error (${response.status})`, response.status);
        throw new HunterError("permanent", `Hunter request rejected (${response.status})`, response.status);
      }
      const payload: unknown = await response.json();
      if (!object(payload)) throw new HunterError("malformed", "Hunter returned a malformed response", response.status);
      return payload;
    } catch (error) {
      if (error instanceof HunterError) throw error;
      if (error instanceof Error && error.name === "AbortError") throw new HunterError("transient", "Hunter request timed out");
      throw new HunterError("transient", error instanceof Error ? error.message : "Hunter network failure");
    } finally {
      clearTimeout(timer);
    }
  }

  private parseDomainSearch(payload: Record<string, unknown>): HunterEmail[] {
    const data = object(payload.data) ? payload.data : null;
    if (!data || !Array.isArray(data.emails)) throw new HunterError("malformed", "Hunter domain search response missing data.emails[]");
    return data.emails.filter(object).flatMap((email) => {
      const value = clean(email.value);
      if (!value) return [];
      const firstName = clean(email.first_name);
      const lastName = clean(email.last_name);
      const confidence = typeof email.confidence === "number" ? email.confidence : null;
      return [{
        value, firstName, lastName, fullName: clean([firstName, lastName].filter(Boolean).join(" ")),
        title: clean(email.position), linkedinUrl: clean(email.linkedin), confidence,
      }];
    });
  }
}
