// 100C Instantly Campaign Sync — provider-neutral outbound-sync contracts.
// Synchronizes ONLY currently-verified, eligible, non-suppressed 100B contacts into an APPROVED
// Instantly campaign. Eligibility from 100B is a point-in-time input, not permanent permission to
// send: 100C rechecks every applicable rule immediately before creating a lead. Nothing here sends
// email, activates a campaign, exposes a route, or runs on a schedule.

export const WORKFLOW_ID = "100C" as const;
export const SYNC_RULES_VERSION = "campaign-sync-rules-v1" as const;

// Outbound providers are named generically so Instantly can be supplemented/replaced later.
export type OutboundProvider = "instantly" | "fixture";
export const APPROVED_OUTBOUND_PROVIDERS: readonly OutboundProvider[] = ["instantly", "fixture"];

// Normalized campaign state (mapped from a provider's own status). Only draft/paused are safe for
// the pilot; every other state (and unknown) fails closed.
export type CampaignState =
  | "draft" | "paused" | "active" | "completed" | "running_subsequences"
  | "accounts_unhealthy" | "bounce_protect" | "account_suspended" | "unknown";
export const PILOT_SAFE_CAMPAIGN_STATES: readonly CampaignState[] = ["draft", "paused"];

// Submission lifecycle. A contact/campaign pair moves through these; terminal states never resubmit.
export type SubmissionState =
  | "eligible" | "reserved" | "submitting" | "submitted" | "skipped_duplicate"
  | "reconciliation_required" | "failed_retryable" | "failed_terminal" | "suppressed" | "cancelled";

// Suppression/bounce events that can arrive AFTER 100B marked a contact ready. Any of these,
// newer than the contact's last verification, forces a fail-closed suppression.
export type SuppressionEventType =
  | "hard_bounce" | "unsubscribe" | "do_not_contact" | "spam_complaint" | "global_suppression";
export interface SuppressionEvent { type: SuppressionEventType; occurredAt: string }

// The 100B-origin contact 100C may consider. These are the CURRENT (freshly read) values; 100C
// never trusts a cached snapshot. Sourced from prospect_contacts joined to internal_prospects.
export interface SyncCandidate {
  canonicalContactId: string;
  canonicalProspectId: string;
  workEmail: string | null;
  normalizedEmail: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  title: string | null;
  companyName: string;
  website: string | null;
  outreachEligibility: string;        // must be 'ready_for_outreach'
  emailVerificationStatus: string;    // must be 'verified'
  suppressionStatus: string;          // must be 'none'
  isCurrentContact: boolean;
  provider: string;                   // origin enrichment provider (e.g. 'apollo')
  providerRecordId: string;
  lastVerifiedAt: string | null;      // used for staleness; null => treated as stale
  // Parent-prospect gates (freshly read):
  eligibleCleaningCompany: boolean;
  isCustomer: boolean;
}

// Fresh recheck decision (deterministic, auditable, fail-closed).
export type RecheckOutcome = "eligible" | "duplicate" | "suppressed" | "ineligible" | "stale";
export interface RecheckDecision { outcome: RecheckOutcome; reason: string; version: typeof SYNC_RULES_VERSION }

// Approved campaign mapping + safety configuration (the allowlist entry).
export interface ApprovedCampaign {
  configId: string;                   // internal campaign configuration id
  instantlyCampaignId: string | null; // provider campaign id (null while unapproved placeholder)
  label: string;
  segment: string;
  environment: string;                // must match the approved operator environment id
  approved: boolean;
  approvalReference: string | null;
  expectedWorkspaceId: string | null; // optional provider workspace allowlist
  allowedStates: CampaignState[];     // pilot: draft/paused only
  dailySyncCap: number;
  totalPilotCap: number;
  active: boolean;                    // per-campaign enable switch (disabled by default)
}

// The smallest provider-neutral lead the runner asks an adapter to create.
export interface OutboundLead {
  campaignConfigId: string;
  workEmail: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  website: string | null;
  jobTitle: string | null;
  personalization: string | null;
  attribution: { canonicalContactId: string; campaignConfigId: string }; // nonsecret internal ids only
}

// Durable, provider-neutral suppression / relationship registry (100C-owned). Separate from the
// per-send `SuppressionEvent` and from 100B's `suppression_status`. Customer/active-trial entries
// exclude a contact from cold outreach; the rest are hard suppressions. Append-only + auditable.
export type SuppressionKind =
  | "existing_customer" | "active_trial" | "unsubscribed" | "hard_bounce"
  | "spam_complaint" | "do_not_contact" | "manual_block" | "legal_compliance";
export const CUSTOMER_SUPPRESSION_KINDS: readonly SuppressionKind[] = ["existing_customer", "active_trial"];
export interface SuppressionRegistryEntry {
  kind: SuppressionKind;
  matchedBy: "email" | "domain";
  source: string;                 // provider-neutral origin: 'manual','hubspot','customer_db','instantly','pilot_seed', ...
  reason: string | null;
  externalReference: string | null;
  occurredAt: string;
}

// Current/authoritative provider source row (from prospect_contact_sources) used for attribution.
export interface ContactSourceRow { provider: string; providerRecordId: string; lastObservedAt: string }

// Provider adapter results. `observedWorkspaceId` is the Instantly `organization` id when present.
export interface CampaignStateResult { state: CampaignState; observedWorkspaceId: string | null; providerStatusRaw: unknown; requestsUsed: number }
export type LeadCreateDisposition = "submitted" | "skipped_duplicate";
export interface LeadCreateResult { disposition: LeadCreateDisposition; providerLeadId: string | null; requestsUsed: number }
export interface LeadReconcileResult { existsInCampaign: boolean; providerLeadId: string | null; requestsUsed: number }

export interface OutboundRequestAccounting {
  campaignReads: number;      // GET campaign state calls
  leadWrites: number;         // POST create-lead calls
  reconcileReads: number;     // POST leads/list reconciliation calls
  retryAttempts: number;      // physical calls that were retries (attempt > 1)
  providerErrors: number;
  ambiguousOutcomes: number;  // create calls whose acceptance is unknown
}

// The outbound-sync provider port. Business logic (recheck, idempotency, caps) stays in the runner.
// Each method receives the remaining physical-request budget and must not exceed it (retries count).
export interface OutboundSyncProvider {
  readonly name: OutboundProvider;
  getCampaignState(instantlyCampaignId: string, budget: number): Promise<CampaignStateResult>;
  createLead(instantlyCampaignId: string, lead: OutboundLead, budget: number): Promise<LeadCreateResult>;
  reconcileLead(instantlyCampaignId: string, workEmail: string, budget: number): Promise<LeadReconcileResult>;
  getAccounting(): OutboundRequestAccounting;
}

// Diagnostics (mirrors 100A/100B).
export interface DiagnosticEvent {
  workflow: typeof WORKFLOW_ID; runId: string; level: "info" | "warn" | "error";
  event: string; at: string; data?: Record<string, unknown>;
}
export interface DiagnosticSink { emit(event: DiagnosticEvent): Promise<void> | void }
export interface Clock { now(): Date }

// Repository port — the sync store. Mutations are lock- and idempotency-scoped.
export interface AssignmentRecord {
  id: string; contactId: string; campaignConfigId: string; state: SubmissionState;
  providerLeadId: string | null; reason: string | null; updatedAt: string;
}
export interface ReserveResult { assignmentId: string; reserved: boolean; existingState: SubmissionState | null }

export interface SyncRepository {
  acquireLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  renewLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  releaseLock(workflow: typeof WORKFLOW_ID, runId: string): Promise<void>;
  loadCandidates(campaignConfigId: string, limit: number): Promise<SyncCandidate[]>;
  loadSuppressionEvents(contactId: string): Promise<SuppressionEvent[]>;
  // Durable customer/suppression registry, matched by normalized email and/or company domain.
  loadSuppressionRegistry(normalizedEmail: string | null, normalizedDomain: string | null): Promise<SuppressionRegistryEntry[]>;
  findAssignment(contactId: string, campaignConfigId: string): Promise<AssignmentRecord | null>;
  // Idempotent reservation: inserts (contact_id, campaign_config_id) or reports the existing state.
  reserveAssignment(runId: string, contactId: string, campaignConfigId: string): Promise<ReserveResult>;
  transitionAssignment(runId: string, assignmentId: string, state: SubmissionState, reason: string | null, providerLeadId?: string | null): Promise<void>;
  recordAttempt(runId: string, assignmentId: string, outcome: string, errorCategory: string | null): Promise<void>;
  recordLeadMapping(runId: string, assignmentId: string, providerLeadId: string): Promise<void>;
}

export interface SyncSummary {
  runId: string;
  campaignConfigId: string;
  campaignState: CampaignState;
  considered: number;
  eligibleAfterRecheck: number;
  reserved: number;
  submitted: number;
  skippedDuplicate: number;
  suppressed: number;
  ineligible: number;
  stale: number;
  reconciliationRequired: number;
  failedRetryable: number;
  failedTerminal: number;
  providerRequests: number;
  providerErrors: number;
  ambiguousOutcomes: number;
  capped: boolean;
  capReason?: string;
  diagnosticFailures: number;
}

// Future 100D event-ingestion contract (defined, NOT implemented here). Documented in
// docs/100D_EVENT_HANDOFF.md. Provider-neutral, authenticated, idempotent, append-only, replay-safe.
export type OutboundEventType =
  | "email_sent" | "email_bounced" | "email_opened" | "reply_received" | "auto_reply_received"
  | "link_clicked" | "lead_unsubscribed" | "campaign_completed" | "lead_interested"
  | "lead_not_interested" | "lead_meeting_booked" | "lead_closed" | "lead_out_of_office" | "lead_wrong_person";
export interface OutboundEventReceipt {
  provider: OutboundProvider; providerEventId: string; // unique per provider event (idempotency key)
  type: OutboundEventType; campaignConfigId: string; contactId: string | null;
  occurredAt: string; // event time from provider
  // Whether this event must immediately suppress the contact (bounce/unsub/complaint).
  suppresses: boolean;
}
