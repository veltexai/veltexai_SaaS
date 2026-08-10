import { classifyEvent } from "./event-classification";
import { computeEventFingerprint } from "./fingerprint";
import { normalizeEmail, normalizeTimestamp } from "./normalize";
import { NORMALIZATION_VERSION } from "./types";
import type { EventProvider, InstantlyEventType, InstantlyWebhookPayload, NormalizedOutboundEvent } from "./types";

export interface ValidationError { field: string; reason: string }
// Both discriminant-dependent properties are declared (optional-never on the opposite branch) so the
// union narrows correctly under strict AND non-strict tsconfig settings (cli.mjs compiles non-strict).
export type NormalizeResult =
  | { ok: true; event: NormalizedOutboundEvent; error?: never }
  | { ok: false; error: ValidationError; event?: never };

// Validate the minimal payload shape and build a provider-neutral normalized event. Reply/email bodies
// are never read here; only PII-free metadata (step/variant/isFirst/hasEmailId) is retained. `occurredAt`
// must be present and parseable, and a lead email is required for lead-scoped events (everything except
// campaign_completed / account_error, which may be campaign/account scoped).
const EMAIL_OPTIONAL = new Set<string>(["campaign_completed", "account_error"]);

export function validateAndNormalizeInstantlyEvent(
  payload: InstantlyWebhookPayload,
  campaignConfigId: string | null,
  now: Date,
  provider: EventProvider = "instantly",
): NormalizeResult {
  if (!payload || typeof payload !== "object") return { ok: false, error: { field: "body", reason: "not an object" } };
  const rawEventType = typeof payload.event_type === "string" ? payload.event_type.trim() : "";
  if (!rawEventType) return { ok: false, error: { field: "event_type", reason: "missing" } };

  const occurredAt = normalizeTimestamp(payload.timestamp ?? null);
  if (!occurredAt) return { ok: false, error: { field: "timestamp", reason: "missing or invalid" } };

  const normalizedEmail = normalizeEmail(payload.lead_email ?? null);
  if (!normalizedEmail && !EMAIL_OPTIONAL.has(rawEventType)) {
    return { ok: false, error: { field: "lead_email", reason: "missing or invalid for a lead-scoped event" } };
  }

  const cls = classifyEvent(rawEventType);
  const providerEventId = computeEventFingerprint({
    provider,
    workspace: payload.workspace ?? null,
    campaignId: payload.campaign_id ?? null,
    eventType: rawEventType,
    leadEmail: payload.lead_email ?? null,
    timestamp: payload.timestamp ?? null,
    emailId: payload.email_id ?? null,
    step: payload.step ?? null,
    variant: payload.variant ?? null,
  });

  // PII-free provider metadata: never includes email, reply text, subject, html, or unibox url.
  const providerMetadata: Record<string, unknown> = {
    step: payload.step ?? null,
    variant: payload.variant ?? null,
    isFirst: typeof payload.is_first === "boolean" ? payload.is_first : null,
    hasEmailId: Boolean(payload.email_id),
    hasEmailAccount: Boolean(payload.email_account),
  };

  const eventType: InstantlyEventType | "unknown" = cls.category === "unknown" ? "unknown" : (rawEventType as InstantlyEventType);
  return {
    ok: true,
    event: {
      provider,
      providerEventId,
      eventType,
      rawEventType,
      workspaceId: (payload.workspace ?? null) as string | null,
      campaignId: (payload.campaign_id ?? null) as string | null,
      campaignConfigId,
      normalizedEmail,
      occurredAt,
      receivedAt: now.toISOString(),
      suppresses: cls.suppresses,
      suppressionKind: cls.suppressionKind,
      engagementCategory: cls.category,
      providerMetadata,
      normalizationVersion: NORMALIZATION_VERSION,
    },
  };
}
