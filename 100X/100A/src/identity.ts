import type { IdentityDecision, IdentitySignals } from "./types";

export function decideIdentity(signals: IdentitySignals): IdentityDecision {
  if (signals.sourceRecordId) {
    return { disposition: "existing_source_record", prospectId: signals.sourceProspectId, sourceRecordId: signals.sourceRecordId, signals };
  }
  const domain = new Set(signals.domainProspectIds);
  const phone = new Set(signals.phoneProspectIds);
  const location = new Set(signals.nameLocationProspectIds);
  const candidates = new Set([...domain, ...phone, ...location]);
  const confident = [...candidates].filter((id) =>
    [domain.has(id), phone.has(id), location.has(id)].filter(Boolean).length >= 2,
  );
  if (confident.length === 1) return { disposition: "confident_canonical_match", prospectId: confident[0], signals };
  if (candidates.size > 0) return { disposition: "possible_match_review", signals };
  return { disposition: "new_canonical_prospect", signals };
}
