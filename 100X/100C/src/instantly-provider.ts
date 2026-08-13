import { INSTANTLY_ENDPOINTS, INSTANTLY_PILOT_LEAD_FLAGS, INSTANTLY_PILOT_LIMITS, REQUIRED_INSTANTLY_SCOPES, mapCampaignStatus } from "./instantly-config";
import type {
  CampaignStateResult, LeadCreateResult, LeadReconcileResult, OutboundLead,
  OutboundRequestAccounting, OutboundSyncProvider,
} from "./types";

// Instantly API V2 adapter BOUNDARY. Makes NO live call unless a real apiKey + fetch are injected.
// Bearer auth, bounded retries, Retry-After, physical-request accounting, structured errors, secret
// redaction. Business logic (campaign safety, recheck, idempotency, caps) stays in the runner.
//
// Ambiguity rule: a create-lead whose acceptance is uncertain (timeout or 5xx after the request was
// sent) is NEVER blindly retried — it raises `ambiguous`, and the runner routes it to
// reconciliation_required. Reads (campaign state, reconcile) are idempotent and may retry.

export type InstantlyErrorKind =
  | "auth" | "scope" | "rate_limit" | "payment" | "campaign_not_found" | "campaign_unsafe_state"
  | "duplicate" | "invalid_lead" | "blocklisted" | "transient" | "permanent" | "timeout"
  | "malformed" | "ambiguous" | "request_cap";

export class InstantlyError extends Error {
  constructor(
    public readonly kind: InstantlyErrorKind,
    message: string,
    public readonly status?: number,
    public readonly attempts?: number,
  ) { super(message); this.name = "InstantlyError"; }
}

const TERMINAL_KINDS: ReadonlySet<InstantlyErrorKind> = new Set(["auth", "scope", "payment", "permanent", "malformed", "campaign_not_found", "invalid_lead", "blocklisted", "duplicate"]);

export interface InstantlyClientOptions {
  timeoutMs?: number; maxAttemptsPerRequest?: number; maxBackoffMs?: number; sleep?: (ms: number) => Promise<void>;
}

const clean = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object";
const zero = (): OutboundRequestAccounting => ({ campaignReads: 0, campaignWrites: 0, leadWrites: 0, reconcileReads: 0, retryAttempts: 0, providerErrors: 0, ambiguousOutcomes: 0 });

type Kind = "campaign_read" | "campaign_write" | "lead_write" | "reconcile_read";

export class InstantlyOutboundProvider implements OutboundSyncProvider {
  readonly name = "instantly" as const;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly maxBackoffMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly accounting = zero();

  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch, options: InstantlyClientOptions = {}) {
    if (!apiKey) throw new Error("INSTANTLY_API_KEY is required");
    this.timeoutMs = options.timeoutMs ?? INSTANTLY_PILOT_LIMITS.timeoutMs;
    this.maxAttempts = options.maxAttemptsPerRequest ?? INSTANTLY_PILOT_LIMITS.maxAttemptsPerRequest;
    this.maxBackoffMs = options.maxBackoffMs ?? INSTANTLY_PILOT_LIMITS.maxBackoffMs;
    this.sleep = options.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  static requiredScopes(): typeof REQUIRED_INSTANTLY_SCOPES { return REQUIRED_INSTANTLY_SCOPES; }
  getAccounting(): OutboundRequestAccounting { return { ...this.accounting }; }

  async getCampaignState(instantlyCampaignId: string, budget: number): Promise<CampaignStateResult> {
    const ctx = { remaining: budget, used: 0 };
    const json = await this.request("GET", INSTANTLY_ENDPOINTS.campaignById(instantlyCampaignId), undefined, "campaign_read", ctx, false);
    if (!isObject(json) || !("status" in json)) throw new InstantlyError("malformed", "campaign response missing status", undefined, ctx.used);
    // Instantly V2 exposes the workspace/organization as `organization` (UUID). Parse it defensively;
    // null when absent/blank so the allowlist check can fail closed when a workspace is expected.
    const observedWorkspaceId = clean((json as { organization?: unknown }).organization);
    return { state: mapCampaignStatus((json as { status: unknown }).status), observedWorkspaceId, providerStatusRaw: null, requestsUsed: ctx.used };
  }

  async createLead(instantlyCampaignId: string, lead: OutboundLead, budget: number): Promise<LeadCreateResult> {
    const ctx = { remaining: budget, used: 0 };
    // Smallest safe payload. Duplicate-skip flags explicit; verify_leads_on_import false; no phone,
    // no private provider metadata, no Supabase ids beyond nonsecret attribution custom_variables.
    const body: Record<string, unknown> = {
      campaign: instantlyCampaignId,
      email: lead.workEmail,
      first_name: lead.firstName ?? undefined,
      last_name: lead.lastName ?? undefined,
      company_name: lead.companyName ?? undefined,
      website: lead.website ?? undefined,
      job_title: lead.jobTitle ?? undefined,
      personalization: lead.personalization ?? undefined,
      custom_variables: { veltex_contact_id: lead.attribution.canonicalContactId, veltex_campaign_config_id: lead.attribution.campaignConfigId },
      ...INSTANTLY_PILOT_LEAD_FLAGS,
    };
    const json = await this.request("POST", INSTANTLY_ENDPOINTS.createLead, body, "lead_write", ctx, true);
    if (!isObject(json)) throw new InstantlyError("malformed", "create-lead response is not an object", undefined, ctx.used);
    // Skip signals from the explicit duplicate-safety flags => safe no-op.
    const skipped = json.skipped === true || Boolean(clean(json.skip_reason)) || Boolean(clean(json.skipped_reason));
    const providerLeadId = clean(json.id);
    if (skipped && !providerLeadId) return { disposition: "skipped_duplicate", providerLeadId: null, requestsUsed: ctx.used };
    if (!providerLeadId) throw new InstantlyError("malformed", "create-lead response has no lead id", undefined, ctx.used);
    return { disposition: "submitted", providerLeadId, requestsUsed: ctx.used };
  }

  async reconcileLead(instantlyCampaignId: string, workEmail: string, budget: number): Promise<LeadReconcileResult> {
    const ctx = { remaining: budget, used: 0 };
    const json = await this.request("POST", INSTANTLY_ENDPOINTS.listLeads, { campaign: instantlyCampaignId, search: workEmail, limit: 1 }, "reconcile_read", ctx, false);
    if (!isObject(json)) throw new InstantlyError("malformed", "reconcile response is not an object", undefined, ctx.used);
    const items = Array.isArray(json.items) ? json.items : [];
    const match = items.filter(isObject).find((it) => clean(it.email)?.toLowerCase() === workEmail.toLowerCase());
    return { existsInCampaign: Boolean(match), providerLeadId: match ? clean(match.id) : null, requestsUsed: ctx.used };
  }

  async activateCampaign(instantlyCampaignId: string, budget: number) {
    const ctx = { remaining: budget, used: 0 };
    await this.request("POST", INSTANTLY_ENDPOINTS.activateCampaign(instantlyCampaignId), undefined, "campaign_write", ctx, false, true);
    return { activated: true, requestsUsed: ctx.used };
  }

  private headers(): Record<string, string> {
    // The key travels only in this Authorization header; it is never logged or placed in an error.
    return { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` };
  }

  private countKind(kind: Kind): void {
    if (kind === "campaign_read") this.accounting.campaignReads += 1;
    else if (kind === "campaign_write") this.accounting.campaignWrites += 1;
    else if (kind === "lead_write") this.accounting.leadWrites += 1;
    else this.accounting.reconcileReads += 1;
  }

  private classify(status: number, attempt: number): InstantlyError {
    if (status === 401) return new InstantlyError("auth", "Instantly authentication failed (401)", status, attempt);
    if (status === 403) return new InstantlyError("scope", "Instantly key lacks the required scope (403)", status, attempt);
    if (status === 402) return new InstantlyError("payment", "Instantly plan/payment limitation (402)", status, attempt);
    if (status === 404) return new InstantlyError("campaign_not_found", "Instantly campaign not found (404)", status, attempt);
    if (status === 409) return new InstantlyError("duplicate", "Instantly reports the lead already exists (409)", status, attempt);
    if (status === 422 || status === 400) return new InstantlyError("invalid_lead", `Instantly rejected the lead payload (${status})`, status, attempt);
    if (status === 429) return new InstantlyError("rate_limit", "Instantly rate limit (429)", status, attempt);
    if (status >= 500) return new InstantlyError("transient", `Instantly server error (${status})`, status, attempt);
    return new InstantlyError("permanent", `Instantly request rejected (${status})`, status, attempt);
  }

  // One logical request with bounded retries. `writeUncertain` marks a non-idempotent write whose
  // acceptance becomes ambiguous on timeout / 5xx (no blind retry).
  private async request(
    method: "GET" | "POST", url: string, body: Record<string, unknown> | undefined, kind: Kind,
    ctx: { remaining: number; used: number }, writeUncertain: boolean, allowEmptyResponse = false,
  ): Promise<unknown> {
    let lastError: InstantlyError | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      if (ctx.remaining <= 0) throw lastError ?? new InstantlyError("request_cap", "Instantly request budget exhausted", undefined, attempt - 1);
      ctx.remaining -= 1; ctx.used += 1; this.countKind(kind);
      if (attempt > 1) this.accounting.retryAttempts += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(url, { method, signal: controller.signal, headers: this.headers(), body: body ? JSON.stringify(body) : undefined });
        if (!response.ok) {
          if (writeUncertain && response.status >= 500) { this.accounting.ambiguousOutcomes += 1; throw new InstantlyError("ambiguous", "create-lead server error; acceptance is unknown", response.status, attempt); }
          const error = this.classify(response.status, attempt);
          if (error.kind === "rate_limit" && attempt < this.maxAttempts) { lastError = error; await this.backoff(response, attempt); continue; }
          if (TERMINAL_KINDS.has(error.kind) || attempt === this.maxAttempts) { this.accounting.providerErrors += 1; throw error; }
          lastError = error;
        } else {
          if (allowEmptyResponse && response.status === 204) return {};
          let payload: unknown;
          try { payload = await response.json(); } catch { throw new InstantlyError("malformed", "Instantly returned invalid JSON", response.status, attempt); }
          return payload;
        }
      } catch (error) {
        if (error instanceof InstantlyError) {
          if (error.kind === "ambiguous" || TERMINAL_KINDS.has(error.kind) || attempt === this.maxAttempts) { if (error.kind !== "ambiguous") this.accounting.providerErrors += 1; throw error; }
          lastError = error;
        } else if (error instanceof Error && error.name === "AbortError") {
          if (writeUncertain) { this.accounting.ambiguousOutcomes += 1; throw new InstantlyError("ambiguous", "create-lead timed out; acceptance is unknown", undefined, attempt); }
          lastError = new InstantlyError("timeout", "Instantly request timed out", undefined, attempt);
          if (attempt === this.maxAttempts) { this.accounting.providerErrors += 1; throw lastError; }
        } else {
          if (writeUncertain) { this.accounting.ambiguousOutcomes += 1; throw new InstantlyError("ambiguous", "create-lead network failure; acceptance is unknown", undefined, attempt); }
          lastError = new InstantlyError("transient", error instanceof Error ? error.message : "Instantly network failure", undefined, attempt);
          if (attempt === this.maxAttempts) { this.accounting.providerErrors += 1; throw lastError; }
        }
      } finally { clearTimeout(timer); }
      await this.sleep(Math.min(100 * 2 ** (attempt - 1), this.maxBackoffMs));
    }
    this.accounting.providerErrors += 1;
    throw lastError ?? new InstantlyError("transient", "Instantly retry exhaustion");
  }

  private async backoff(response: Response, attempt: number): Promise<void> {
    const header = response.headers?.get?.("retry-after");
    const retryAfterMs = header && Number.isFinite(Number(header)) ? Number(header) * 1000 : INSTANTLY_PILOT_LIMITS.defaultRetryAfterMs;
    await this.sleep(Math.min(retryAfterMs, this.maxBackoffMs));
  }
}
