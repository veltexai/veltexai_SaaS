// 100D — Automated Suppression & Event Intelligence: provider-neutral types.
// 100D receives outbound events (Instantly) + internal customer/trial status, records them
// idempotently, and feeds the durable outbound_suppression_registry that 100C already reads. It never
// stores raw email or reply bodies, never sends anything, and never mutates a campaign.

export const WORKFLOW_ID = "100D" as const;

// Bumped whenever the normalization mapping changes shape (persisted alongside events).
export const NORMALIZATION_VERSION = "100D-normalize-v1" as const;
// Bumped whenever the deterministic fingerprint algorithm/canonical subset changes.
export const FINGERPRINT_VERSION = "100D-fpv1" as const;

// The provider a receipt/event belongs to. Constrained to what migration 003 already allows.
export type EventProvider = "instantly" | "fixture";

// Documented Instantly V2 webhook event types (verified 2026-08 against developer.instantly.ai).
// `account_error` is operational (not lead-scoped); any other/custom label is treated as unknown.
export const INSTANTLY_EVENT_TYPES = [
  "email_sent", "email_opened", "email_link_clicked", "campaign_completed",
  "reply_received", "auto_reply_received", "lead_neutral", "lead_interested",
  "lead_not_interested", "lead_out_of_office", "lead_wrong_person",
  "lead_meeting_booked", "lead_meeting_completed", "lead_closed", "lead_no_show",
  "email_bounced", "lead_unsubscribed", "spam_complaint", "do_not_contact",
  "account_error",
] as const;
export type InstantlyEventType = (typeof INSTANTLY_EVENT_TYPES)[number];

// Provider-neutral engagement classification.
export type EngagementCategory =
  | "delivery"        // sent/opened/clicked/campaign_completed
  | "reply"           // reply/auto_reply/interest signals
  | "meeting"         // meeting/close/no-show conversion signals
  | "suppression"     // bounce/unsubscribe/complaint/DNC
  | "operational"     // account_error and other non-lead signals
  | "unknown";        // unmapped -> held, never suppresses

// Durable suppression kinds (must match the 003 outbound_suppression_registry check constraint).
export type SuppressionKind =
  | "existing_customer" | "active_trial" | "unsubscribed" | "hard_bounce"
  | "spam_complaint" | "do_not_contact" | "manual_block" | "legal_compliance";

// The minimal, PII-safe Instantly webhook payload 100D accepts. Reply/email bodies are intentionally
// NOT part of this type — they are never read into the domain model or persisted.
export interface InstantlyWebhookPayload {
  event_type: string;
  workspace?: string | null;      // workspace/organization UUID
  campaign_id?: string | null;    // campaign UUID
  campaign_name?: string | null;
  lead_email?: string | null;
  timestamp?: string | null;      // ISO occurred-at
  email_id?: string | null;       // reply_to_uuid (present on some events)
  step?: number | string | null;
  variant?: number | string | null;
  is_first?: boolean | null;
  email_account?: string | null;
  [ignored: string]: unknown;     // extra fields (incl. reply_text/html) are ignored, never persisted
}

// Provider-neutral normalized event. `normalizedEmail` is used transiently for matching/suppression
// and is NEVER written into the fingerprint or the event receipt; only its hash appears in the id.
export interface NormalizedOutboundEvent {
  provider: EventProvider;
  providerEventId: string;        // deterministic SHA-256 fingerprint (Part 5)
  eventType: InstantlyEventType | "unknown";
  rawEventType: string;           // exact provider label (for audit; no PII)
  workspaceId: string | null;
  campaignId: string | null;      // provider campaign UUID
  campaignConfigId: string | null;// resolved internal config id (allowlist)
  normalizedEmail: string | null; // transient; not persisted in receipts
  occurredAt: string;             // ISO
  receivedAt: string;             // ISO
  suppresses: boolean;
  suppressionKind: SuppressionKind | null;
  engagementCategory: EngagementCategory;
  providerMetadata: Record<string, unknown>; // PII-free: step/variant/isFirst/hasEmailId only
  normalizationVersion: string;
}

// Contact resolution outcomes (Part 7). Fail closed to `unmatched`/`ambiguous`; never guess.
export type ResolutionStatus = "matched" | "unmatched" | "ambiguous" | "wrong_campaign";
export interface ContactResolution {
  status: ResolutionStatus;
  contactId: string | null;
  reason: string;
}

// The terminal outcome of ingesting one event.
export type IngestOutcome =
  | "processed"            // receipt inserted (+ suppression when applicable)
  | "duplicate"            // idempotent replay -> no-op
  | "held_unmatched"       // recorded for reconciliation, no suppression
  | "rejected_unauthorized"
  | "rejected_allowlist"
  | "rejected_invalid";

export interface IngestResult {
  outcome: IngestOutcome;
  providerEventId: string | null;
  suppressionApplied: boolean;
  suppressionKind: SuppressionKind | null;
  resolution: ResolutionStatus | null;
  reason: string;
}

// Internal customer/trial status ingestion (Part 9). No billing data, no Stripe.
export const CUSTOMER_STATUS_EVENTS = [
  "trial_started", "subscription_trialing", "subscription_active", "customer_confirmed",
] as const;
export type CustomerStatusEvent = (typeof CUSTOMER_STATUS_EVENTS)[number];
export interface CustomerStatusPayload {
  status: string;
  email?: string | null;
  occurredAt?: string | null;
  externalReference?: string | null;
  source?: string | null;
}

// Diagnostics are PII-free and never carry secrets, emails, or bodies.
export interface DiagnosticEvent {
  runId: string;
  level: "info" | "warn" | "error";
  event: string;
  data?: Record<string, unknown>;
}

// The result of the single atomic apply (receipt + optional suppression + processing + optional hold).
export interface ApplyEventResult {
  inserted: boolean;              // receipt newly inserted (false => idempotent replay)
  suppressionInserted: boolean;   // durable suppression newly inserted
  matched: boolean;               // resolved to exactly one internal contact
  resolution: ResolutionStatus;   // authoritative resolution used for the write
}

// The repository 100D depends on. In-memory impl backs every test; the Supabase impl delegates to the
// migration-004 SECURITY DEFINER functions (the route/worker gets EXECUTE only — no broad table creds).
// applyEvent is a SINGLE atomic operation: it resolves the contact internally (no TOCTOU), inserts the
// idempotent receipt, applies the durable suppression when the event suppresses, records the processing
// outcome, and holds the event for reconciliation when it cannot be linked — all or nothing.
export interface IngestRepository {
  // Read-only resolution used by the pipeline (for the returned outcome) and by reconciliation.
  resolveContact(normalizedEmail: string | null, campaignConfigId: string | null): Promise<ContactResolution>;
  // The atomic write. Resolves internally; the passed event carries everything it needs.
  applyEvent(event: NormalizedOutboundEvent): Promise<ApplyEventResult>;
  // Apply a customer/trial (or other) durable suppression idempotently, email-keyed.
  applyCustomerStatus(kind: SuppressionKind, normalizedEmail: string, source: string, externalReference: string | null, occurredAt: string): Promise<{ inserted: boolean }>;
  // List held unmatched events for reconciliation.
  listUnmatched(): Promise<Array<{ providerEventId: string; event: NormalizedOutboundEvent }>>;
  // Complete an unmatched event once a contact link exists. Idempotent; never resends or mutates a
  // campaign. Returns whether the held event was linked this call.
  markReconciled(providerEventId: string, contactId: string): Promise<{ reconciled: boolean }>;
  emitDiagnostic(event: DiagnosticEvent): Promise<void>;
}
