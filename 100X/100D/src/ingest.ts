import { matchApprovedCampaign, type AllowlistCampaign } from "./allowlist";
import { validateAndNormalizeInstantlyEvent } from "./normalize-event";
import { normalizeCustomerStatus } from "./customer-status";
import type {
  CustomerStatusPayload, IngestRepository, IngestResult, InstantlyWebhookPayload,
} from "./types";

export interface IngestDeps {
  campaigns: AllowlistCampaign[];
  repository: IngestRepository;
  now: () => Date;
  enabled: boolean;
  runId: string;
}

// Instantly event ingestion pipeline (Part 11). Order: enabled -> allowlist -> validate/normalize ->
// (fingerprint inside normalize) -> atomic apply (resolve + idempotent receipt + suppression +
// processing + hold). Returns success for already-processed valid replays. Never throws on a normal
// rejection; only a repository/DB failure propagates so the route returns 5xx and the provider retries.
export async function ingestInstantlyEvent(payload: InstantlyWebhookPayload, deps: IngestDeps): Promise<IngestResult> {
  const base: IngestResult = { outcome: "rejected_invalid", providerEventId: null, suppressionApplied: false, suppressionKind: null, resolution: null, reason: "" };
  if (!deps.enabled) return { ...base, outcome: "rejected_invalid", reason: "100D is disabled" };

  // Allowlist workspace + campaign BEFORE any normalization/DB work.
  const rawWorkspace = typeof payload?.workspace === "string" ? payload.workspace : null;
  const rawCampaign = typeof payload?.campaign_id === "string" ? payload.campaign_id : null;
  const allow = matchApprovedCampaign(rawWorkspace, rawCampaign, deps.campaigns);
  if (!allow.ok) return { ...base, outcome: "rejected_allowlist", reason: allow.reason };

  const normalized = validateAndNormalizeInstantlyEvent(payload, allow.campaignConfigId, deps.now());
  if (!normalized.ok) return { ...base, outcome: "rejected_invalid", reason: `${normalized.error.field}: ${normalized.error.reason}` };
  const event = normalized.event;

  const applied = await deps.repository.applyEvent(event);
  const outcome = !applied.inserted ? "duplicate" : (applied.matched ? "processed" : "held_unmatched");
  await deps.repository.emitDiagnostic({
    runId: deps.runId, level: applied.matched ? "info" : "warn",
    event: `event.${outcome}`,
    data: {
      providerEventId: event.providerEventId, eventType: event.eventType, category: event.engagementCategory,
      suppresses: event.suppresses, resolution: applied.resolution, campaignConfigId: event.campaignConfigId,
    },
  });
  return {
    outcome,
    providerEventId: event.providerEventId,
    suppressionApplied: applied.suppressionInserted,
    suppressionKind: event.suppressionKind,
    resolution: applied.resolution,
    reason: outcome === "duplicate" ? "idempotent replay" : (applied.matched ? "processed" : "held for reconciliation"),
  };
}

// Customer/trial status ingestion pipeline (Part 9). Applies a durable customer/active-trial
// suppression through the same registry, idempotently. No billing data, no Stripe.
export interface CustomerStatusResultOut { outcome: "processed" | "duplicate" | "rejected_invalid"; kind: string | null; reason: string }
export async function ingestCustomerStatus(payload: CustomerStatusPayload, deps: IngestDeps): Promise<CustomerStatusResultOut> {
  if (!deps.enabled) return { outcome: "rejected_invalid", kind: null, reason: "100D is disabled" };
  const norm = normalizeCustomerStatus(payload, deps.now());
  if (!norm.ok) return { outcome: "rejected_invalid", kind: null, reason: `${norm.field}: ${norm.reason}` };
  const res = await deps.repository.applyCustomerStatus(norm.kind, norm.normalizedEmail, norm.source, norm.externalReference, norm.occurredAt);
  await deps.repository.emitDiagnostic({
    runId: deps.runId, level: "info", event: `customer_status.${res.inserted ? "applied" : "duplicate"}`,
    data: { kind: norm.kind, source: norm.source, inserted: res.inserted },
  });
  return { outcome: res.inserted ? "processed" : "duplicate", kind: norm.kind, reason: res.inserted ? "suppression applied" : "idempotent replay" };
}
