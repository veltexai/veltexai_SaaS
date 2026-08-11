export const WORKFLOW_ID = "100A" as const;
export const QUALIFICATION_VERSION = "cleaning-rules-v1" as const;

export type CompanyType =
  | "commercial_janitorial" | "commercial_cleaning" | "office_cleaning"
  | "building_cleaning" | "maid_service" | "residential_cleaning";
export type Provider = "google_places" | "apollo" | "data_axle" | "csv_import" | "referral" | "website";
export type MatchDisposition = "new_canonical_prospect" | "existing_source_record" | "confident_canonical_match" | "possible_match_review";
export type ProspectStatus = "discovered" | "identity_review";

export interface Geography { id: string; label: string }
export interface PlacesCandidate {
  id?: string; displayName?: { text?: string }; websiteUri?: string; googleMapsUri?: string;
  nationalPhoneNumber?: string; formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
  primaryType?: string; types?: string[];
}
export interface PlacesPage { candidates: PlacesCandidate[]; nextPageToken: string | null; requestsUsed: number }
export interface PlacesClient { searchText(query: string, pageToken?: string, requestBudget?: number): Promise<PlacesPage> }

export interface NormalizedCandidate {
  companyName: string; website: string | null; websiteDomain: string | null;
  provider: "google_places"; providerRecordId: string; providerUrl: string | null;
  phone: string | null; normalizedPhone: string | null; address: string | null;
  city: string | null; state: string | null; sourceGeography: string; sourceQuery: string;
}
export interface Qualification {
  accepted: boolean; companyType: CompanyType | null; score: number; reason: string;
  method: "rules" | "ai"; version: string;
}
export interface CanonicalProspect {
  id?: string; companyName: string; website: string | null; websiteDomain: string | null;
  primaryPhone: string | null; normalizedPhone: string | null; companyType: CompanyType;
  status: ProspectStatus; firstDiscoveredAt: string; lastUpdatedAt: string;
}
export interface ProviderSourceRecord {
  id?: string; prospectId: string; provider: Provider; providerRecordId: string;
  sourceGeography: string | null; sourceQuery: string | null; providerUrl: string | null;
  observedCompanyName: string; observedWebsite: string | null; observedPhone: string | null;
  observedAddress: string | null; city: string | null; state: string | null;
  qualification: Qualification; firstObservedAt: string; lastObservedAt: string;
  providerMetadata: Record<string, unknown> | null;
}
export interface IdentitySignals {
  sourceRecordId?: string; sourceProspectId?: string;
  domainProspectIds: string[]; phoneProspectIds: string[]; nameLocationProspectIds: string[];
}
export interface IdentityDecision { disposition: MatchDisposition; prospectId?: string; sourceRecordId?: string; signals: IdentitySignals }
export interface PersistObservationInput {
  disposition: Exclude<MatchDisposition, "existing_source_record">;
  matchedProspectId?: string; canonical: Omit<CanonicalProspect, "id">;
  source: Omit<ProviderSourceRecord, "id" | "prospectId">;
}
export interface PersistObservationResult { prospectId: string; sourceRecordId: string; canonicalCreated: boolean; sourceCreated: boolean }

export interface DiagnosticEvent {
  workflow: typeof WORKFLOW_ID; runId: string; level: "info" | "warn" | "error";
  event: string; at: string; data?: Record<string, unknown>;
}
export interface CandidateQualifier { qualify(candidate: NormalizedCandidate, raw: PlacesCandidate): Promise<Qualification> }
export interface ProspectRepository {
  acquireLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  renewLock(workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean>;
  releaseLock(workflow: typeof WORKFLOW_ID, runId: string): Promise<void>;
  getCursor(workflow: typeof WORKFLOW_ID): Promise<number>;
  setCursor(workflow: typeof WORKFLOW_ID, runId: string, nextIndex: number): Promise<void>;
  inspectIdentity(candidate: NormalizedCandidate): Promise<IdentitySignals>;
  touchSourceRecord(runId: string, sourceRecordId: string, observedAt: string): Promise<void>;
  persistObservation(runId: string, input: PersistObservationInput): Promise<PersistObservationResult>;
}
export class DuplicateSourceRecordError extends Error {
  constructor() { super("provider source record already exists"); this.name = "DuplicateSourceRecordError"; }
}
export interface DiagnosticSink { emit(event: DiagnosticEvent): Promise<void> | void }
export interface Clock { now(): Date }
export interface RunSummary {
  runId: string; geography: Geography; placesRequests: number; candidates: number;
  candidatesProcessed: number; canonicalProspectsCreated: number; sourceRecordsCreated: number;
  existingSources: number; confidentMatches: number; possibleMatches: number; rejected: number;
  capped: boolean; capReason?: "candidates" | "new_prospects" | "source_records" | "places_requests" | "duration";
  cursorAdvanced: boolean; diagnosticFailures: number;
}

// 100C consumes only records that a future eligibility service has assembled and approved.
export interface OutreachEligibilityCandidate {
  canonicalProspectId: string; approvedContactId: string; validEmail: string;
  emailVerificationStatus: "verified"; outreachApprovalStatus: "approved";
  suppressed: false; existingCustomer: false; previouslySubmitted: false;
  campaignAssignmentId: string; idempotencyKey: string;
}
