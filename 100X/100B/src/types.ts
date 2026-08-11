// 100B Contact Enrichment — provider-neutral contracts.
// Converts a discovered 100A company into normalized, deduplicated decision-maker
// contacts and a deterministic, auditable outreach-readiness decision. No outreach here.
export const WORKFLOW_ID = "100B" as const;
export const ELIGIBILITY_VERSION = "enrichment-rules-v1" as const;

// Providers are named generically so Apollo can be replaced or supplemented later.
export type Provider = "apollo" | "data_axle" | "csv_import" | "referral" | "fixture";
export const APPROVED_PROVIDERS: readonly Provider[] = ["apollo", "data_axle", "csv_import", "referral", "fixture"];

// Cleaning company types 100A can produce (parent-company eligibility gate).
export type CompanyType =
  | "commercial_janitorial" | "commercial_cleaning" | "office_cleaning"
  | "building_cleaning" | "maid_service" | "residential_cleaning";

// Decision-maker prioritization (lower rank = stronger contact). generic_mailbox and
// other are never treated as decision-makers.
export type RoleCategory =
  | "owner" | "founder" | "president" | "chief_executive" | "general_manager"
  | "operations" | "sales_bd" | "estimator" | "office_manager" | "generic_mailbox" | "other";
export const ROLE_RANK: Record<RoleCategory, number> = {
  owner: 1, founder: 2, president: 3, chief_executive: 4, general_manager: 5,
  operations: 6, sales_bd: 7, estimator: 8, office_manager: 9, generic_mailbox: 98, other: 99,
};

// Verification status returned/confirmed by a provider, then mapped to a canonical set.
export type VerificationStatus = "verified" | "accept_all" | "unknown" | "invalid" | "unverified";
// Only these are acceptable for outreach-readiness (explicit allowlist).
export const VERIFIED_ALLOWLIST: readonly VerificationStatus[] = ["verified"];

export type SuppressionStatus =
  | "none" | "unsubscribed" | "hard_bounce" | "do_not_contact" | "global_suppression";

// Fail-closed outreach-readiness states. Only ready_for_outreach is safe to sync to 100C.
export type OutreachEligibility =
  | "ready_for_outreach" | "needs_enrichment" | "unverified" | "identity_conflict"
  | "suppressed" | "already_contacted" | "customer" | "ineligible" | "provider_error";

// The company context a discovered 100A prospect provides to enrichment.
export interface CompanyContext {
  prospectId: string;
  companyName: string;
  companyType: CompanyType | null;
  websiteDomain: string | null;
  eligibleCleaningCompany: boolean; // parent-company gate (derived from company_type)
  isCustomer: boolean;              // already a Veltex AI customer
  isGloballySuppressed: boolean;    // company-level global suppression
}

// Raw contact as returned by a provider adapter (provider-neutral shape).
export interface ProviderContactCandidate {
  providerRecordId: string;
  firstName?: string | null; lastName?: string | null; fullName?: string | null;
  title?: string | null; email?: string | null; phone?: string | null; linkedinUrl?: string | null;
  providerVerificationStatus?: string | null; // provider's own status string
  providerMetadata?: Record<string, unknown> | null;
  // Optional provider-supplied contact-level suppression signals (never fabricated).
  unsubscribed?: boolean; hardBounced?: boolean; blocked?: boolean;
}
// Optional, provider-neutral request/credit accounting. A multi-call adapter (e.g. Apollo's
// search + enrichment) reports how its physical requests split so previews and tests can audit
// budget and credit exposure. The runner only needs `requestsUsed`; `accounting` is advisory.
export interface ProviderRequestAccounting {
  searchRequests: number;              // physical search-endpoint calls (incl. retries)
  enrichmentRequests: number;          // physical enrichment-endpoint calls (incl. retries)
  retryAttempts: number;               // physical calls that were retries (attempt > 1)
  successfulEnrichments: number;       // enrichment calls that returned a usable work email
  providerErrors: number;              // enrichment calls that failed
  estimatedCreditConsumingMatches: number; // enrichments expected to consume >=1 credit
}
export interface ProviderEnrichmentResult {
  candidates: ProviderContactCandidate[];
  requestsUsed: number;
  accounting?: ProviderRequestAccounting;
}

// The enrichment provider port. Business logic must NOT live in the adapter.
export interface EnrichmentProvider {
  readonly name: Provider;
  enrichCompany(company: CompanyContext, requestBudget: number): Promise<ProviderEnrichmentResult>;
}

// Contact-level suppression / campaign signals, resolved by a port (never fabricated).
export interface SuppressionSignals {
  unsubscribed: boolean; hardBounced: boolean; blocked: boolean;
  activeInCampaign: boolean; alreadyReceivedCampaign: boolean; emailGloballySuppressed: boolean;
}
export interface SuppressionResolver {
  resolve(company: CompanyContext, normalizedEmail: string | null): Promise<SuppressionSignals>;
}

export interface NormalizedContact {
  firstName: string | null; lastName: string | null; fullName: string | null;
  title: string | null; roleCategory: RoleCategory; roleRank: number; isGenericMailbox: boolean;
  email: string | null; normalizedEmail: string | null; emailValid: boolean;
  phone: string | null; linkedinUrl: string | null;
  provider: Provider; providerRecordId: string;
  providerVerificationStatus: string | null; verificationStatus: VerificationStatus;
  providerMetadata: Record<string, unknown> | null;
}

export interface EligibilityInput {
  company: CompanyContext; contact: NormalizedContact;
  suppression: SuppressionSignals; identityConflict: boolean; providerError: boolean;
}
export interface EligibilityDecision {
  eligibility: OutreachEligibility; suppressionStatus: SuppressionStatus;
  reason: string; isCurrentDecisionMaker: boolean; version: string;
}

// Canonical persisted contact (provider-neutral). Provider identity lives on the source record.
export interface CanonicalContact {
  id?: string; prospectId: string;
  firstName: string | null; lastName: string | null; fullName: string | null;
  title: string | null; roleCategory: RoleCategory;
  email: string | null; normalizedEmail: string | null; emailVerificationStatus: VerificationStatus;
  phone: string | null; linkedinUrl: string | null; isCurrentContact: boolean;
  outreachEligibility: OutreachEligibility; eligibilityReason: string;
  suppressionStatus: SuppressionStatus; suppressionReason: string | null;
  firstDiscoveredAt: string; lastVerifiedAt: string | null;
}
export interface ContactSourceRecord {
  id?: string; contactId: string; provider: Provider; providerRecordId: string;
  providerVerificationStatus: string | null; providerMetadata: Record<string, unknown> | null;
  firstObservedAt: string; lastObservedAt: string;
}

export type ContactMatchDisposition = "new_contact" | "existing_source_record" | "confident_contact_match";
export interface ContactIdentitySignals {
  sourceRecordId?: string; sourceContactId?: string; emailContactIds: string[];
}
export interface ContactIdentityDecision {
  disposition: ContactMatchDisposition; contactId?: string; sourceRecordId?: string; signals: ContactIdentitySignals;
}
export interface PersistContactInput {
  disposition: Exclude<ContactMatchDisposition, "existing_source_record">;
  matchedContactId?: string; canonical: Omit<CanonicalContact, "id">;
  source: Omit<ContactSourceRecord, "id" | "contactId">;
}
export interface PersistContactResult { contactId: string; sourceRecordId: string; contactCreated: boolean; sourceCreated: boolean }
export class DuplicateContactSourceError extends Error {
  constructor() { super("provider contact source already exists"); this.name = "DuplicateContactSourceError"; }
}

export interface DiagnosticEvent {
  workflow: typeof WORKFLOW_ID; runId: string; level: "info" | "warn" | "error";
  event: string; at: string; data?: Record<string, unknown>;
}
export interface DiagnosticSink { emit(event: DiagnosticEvent): Promise<void> | void }
export interface Clock { now(): Date }

export interface ContactRepository {
  acquireLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  renewLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  releaseLock(workflow: typeof WORKFLOW_ID, runId: string): Promise<void>;
  getCursor(workflow: typeof WORKFLOW_ID): Promise<number>;
  setCursor(workflow: typeof WORKFLOW_ID, runId: string, nextIndex: number): Promise<void>;
  loadTargets(prospectIds: string[]): Promise<CompanyContext[]>;
  inspectContactIdentity(prospectId: string, contact: NormalizedContact): Promise<ContactIdentitySignals>;
  touchContactSource(runId: string, sourceRecordId: string, observedAt: string): Promise<void>;
  persistContact(runId: string, input: PersistContactInput): Promise<PersistContactResult>;
}

export interface RunSummary {
  runId: string; companiesProcessed: number; providerRequests: number;
  candidates: number; contactsProcessed: number; contactsCreated: number; sourceRecordsCreated: number;
  existingSources: number; confidentMatches: number; readyForOutreach: number; heldOrSuppressed: number;
  providerErrors: number; capped: boolean;
  capReason?: "companies" | "contacts" | "new_contacts" | "source_records" | "provider_requests" | "duration";
  cursorAdvanced: boolean; diagnosticFailures: number;
}

// 100C consumes ONLY contacts a future eligibility service has assembled and approved.
export interface OutreachReadyContact {
  canonicalContactId: string; canonicalProspectId: string; validEmail: string;
  emailVerificationStatus: "verified"; outreachEligibility: "ready_for_outreach";
  suppressed: false; existingCustomer: false; previouslyContacted: false;
  provider: Provider; providerRecordId: string; idempotencyKey: string;
}
