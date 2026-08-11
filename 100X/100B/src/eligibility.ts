import { APPROVED_PROVIDERS, ELIGIBILITY_VERSION, VERIFIED_ALLOWLIST } from "./types";
import type { EligibilityDecision, EligibilityInput } from "./types";

// Deterministic, auditable outreach-readiness. Fails closed: any missing, conflicting,
// uncertain, or unsafe signal produces an explicit non-ready state with a reason.
// Precedence is fixed so the same input always yields the same decision + reason.
export function evaluateEligibility(input: EligibilityInput): EligibilityDecision {
  const { company, contact, suppression, identityConflict, providerError } = input;
  const isDecisionMaker = contact.roleRank <= 9; // owner..office_manager; not generic/other
  const base = { isCurrentDecisionMaker: isDecisionMaker, version: ELIGIBILITY_VERSION };

  if (providerError) return { eligibility: "provider_error", suppressionStatus: "none", reason: "provider returned an error for this contact", ...base };
  if (!company.eligibleCleaningCompany) return { eligibility: "ineligible", suppressionStatus: "none", reason: "parent company is not an eligible cleaning company", ...base };
  if (company.isCustomer) return { eligibility: "customer", suppressionStatus: "none", reason: "company is already a Veltex AI customer", ...base };
  if (company.isGloballySuppressed || suppression.emailGloballySuppressed)
    return { eligibility: "suppressed", suppressionStatus: "global_suppression", reason: "company or email is globally suppressed", ...base };
  if (suppression.unsubscribed) return { eligibility: "suppressed", suppressionStatus: "unsubscribed", reason: "contact previously unsubscribed", ...base };
  if (suppression.hardBounced) return { eligibility: "suppressed", suppressionStatus: "hard_bounce", reason: "contact email hard bounced", ...base };
  if (suppression.blocked) return { eligibility: "suppressed", suppressionStatus: "do_not_contact", reason: "contact is blocked / do-not-contact", ...base };
  if (suppression.activeInCampaign) return { eligibility: "already_contacted", suppressionStatus: "none", reason: "contact is active in an outreach campaign", ...base };
  if (suppression.alreadyReceivedCampaign) return { eligibility: "already_contacted", suppressionStatus: "none", reason: "contact already received this campaign", ...base };
  if (identityConflict) return { eligibility: "identity_conflict", suppressionStatus: "none", reason: "multiple contacts resolve to the same email", ...base };
  if (!contact.email || !contact.normalizedEmail) return { eligibility: "needs_enrichment", suppressionStatus: "none", reason: "no email address discovered", ...base };
  if (!contact.emailValid) return { eligibility: "unverified", suppressionStatus: "none", reason: "email is syntactically invalid", ...base };
  if (!APPROVED_PROVIDERS.includes(contact.provider)) return { eligibility: "unverified", suppressionStatus: "none", reason: "email not confirmed by an approved provider", ...base };
  if (!VERIFIED_ALLOWLIST.includes(contact.verificationStatus))
    return { eligibility: "unverified", suppressionStatus: "none", reason: `verification status '${contact.verificationStatus}' not on the outreach allowlist`, ...base };

  return { eligibility: "ready_for_outreach", suppressionStatus: "none", reason: "verified decision-maker email passed all safety checks", ...base };
}
