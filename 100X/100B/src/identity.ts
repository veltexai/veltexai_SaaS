import type { ContactIdentityDecision, ContactIdentitySignals } from "./types";

// Provider + provider_record_id definitively identifies a provider observation.
// A single normalized-email match attaches to that existing contact; multiple distinct
// matches are an identity conflict (surfaced to the eligibility evaluator).
export function decideContactIdentity(signals: ContactIdentitySignals): ContactIdentityDecision {
  if (signals.sourceRecordId) {
    return { disposition: "existing_source_record", contactId: signals.sourceContactId, sourceRecordId: signals.sourceRecordId, signals };
  }
  const distinct = [...new Set(signals.emailContactIds)];
  if (distinct.length === 1) return { disposition: "confident_contact_match", contactId: distinct[0], signals };
  return { disposition: "new_contact", signals };
}
export function hasIdentityConflict(signals: ContactIdentitySignals): boolean {
  return new Set(signals.emailContactIds).size > 1;
}
