import { CUSTOMER_SUPPRESSION_KINDS, SYNC_RULES_VERSION } from "./types";
import type { AssignmentRecord, RecheckDecision, SuppressionEvent, SuppressionRegistryEntry, SyncCandidate } from "./types";

// Fresh, deterministic, fail-closed recheck run immediately before reserving/creating a lead.
// 100B eligibility is a point-in-time INPUT; this re-derives readiness from the CURRENT contact +
// parent-prospect values, the durable customer/suppression registry, and any newer suppression
// events. Precedence is fixed so the same input always yields the same decision + reason.

export interface RecheckInput {
  candidate: SyncCandidate;
  suppressionEvents: SuppressionEvent[];
  registry: SuppressionRegistryEntry[];
  existingAssignment: AssignmentRecord | null;
  now: Date;
  maxEligibilityAgeMs: number;
  // When true, the customer/suppression registry could not be evaluated safely -> fail closed.
  registryUnavailable?: boolean;
}

const BLOCKING_ASSIGNMENT_STATES = new Set(["reserved", "submitting", "submitted", "reconciliation_required", "skipped_duplicate", "failed_terminal", "suppressed", "cancelled"]);
const SUPPRESSING_EVENTS = new Set(["hard_bounce", "unsubscribe", "do_not_contact", "spam_complaint", "global_suppression"]);

export function recheckSyncEligibility(input: RecheckInput): RecheckDecision {
  const { candidate: c, suppressionEvents = [], registry = [], existingAssignment, now, maxEligibilityAgeMs, registryUnavailable } = input;
  const decide = (outcome: RecheckDecision["outcome"], reason: string): RecheckDecision => ({ outcome, reason, version: SYNC_RULES_VERSION });

  // Fail closed if customer/suppression state could not be evaluated.
  if (registryUnavailable) return decide("ineligible", "customer/suppression registry could not be evaluated; failing closed");

  // Already assigned/submitted to this campaign -> never duplicate.
  if (existingAssignment && BLOCKING_ASSIGNMENT_STATES.has(existingAssignment.state)) {
    return decide("duplicate", `contact already has assignment state '${existingAssignment.state}' for this campaign`);
  }
  // Parent-prospect gates (freshly read).
  if (!c.eligibleCleaningCompany) return decide("ineligible", "parent company is no longer an eligible cleaning company");
  if (!c.isCurrentContact) return decide("ineligible", "contact is no longer current");

  // Durable registry: existing customer / active trial exclude cold outreach; hard suppressions block.
  const customerBlock = registry.find((e) => CUSTOMER_SUPPRESSION_KINDS.includes(e.kind));
  if (customerBlock || c.isCustomer) return decide("ineligible", customerBlock ? `parent is an existing customer/active trial (${customerBlock.kind}, ${customerBlock.matchedBy})` : "parent company is marked a customer");
  const registrySuppression = registry.find((e) => !CUSTOMER_SUPPRESSION_KINDS.includes(e.kind));
  if (registrySuppression) return decide("suppressed", `suppression registry: '${registrySuppression.kind}' matched by ${registrySuppression.matchedBy}`);

  // 100B readiness must still hold now.
  if (c.outreachEligibility !== "ready_for_outreach") return decide("ineligible", `outreach_eligibility is '${c.outreachEligibility}', not ready_for_outreach`);
  if (!c.normalizedEmail || !c.workEmail) return decide("ineligible", "no normalized work email");
  if (c.emailVerificationStatus !== "verified") return decide("ineligible", `email_verification_status is '${c.emailVerificationStatus}', not verified`);

  // Stored status or a newer per-send suppression event.
  if (c.suppressionStatus !== "none") return decide("suppressed", `suppression_status is '${c.suppressionStatus}'`);
  const suppressingEvent = suppressionEvents.find((e) => SUPPRESSING_EVENTS.has(e.type));
  if (suppressingEvent) return decide("suppressed", `a newer '${suppressingEvent.type}' suppression event exists`);

  // Staleness: the verification snapshot must be recent enough to trust.
  const verifiedAt = c.lastVerifiedAt ? Date.parse(c.lastVerifiedAt) : NaN;
  if (!Number.isFinite(verifiedAt)) return decide("stale", "no verification timestamp; re-verify before sync");
  if (now.getTime() - verifiedAt > maxEligibilityAgeMs) return decide("stale", "verification snapshot is stale; re-verify before sync");

  return decide("eligible", "verified, non-suppressed, non-customer, current decision-maker for an eligible company");
}
