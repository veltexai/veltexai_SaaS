import { recheckSyncEligibility } from "../src/eligibility-recheck";
import type { AssignmentRecord, SuppressionEvent, SuppressionRegistryEntry, SyncCandidate } from "../src/types";

const reg = (kind: SuppressionRegistryEntry["kind"], matchedBy: SuppressionRegistryEntry["matchedBy"] = "email"): SuppressionRegistryEntry => ({ kind, matchedBy, source: "pilot_seed", reason: null, externalReference: null, occurredAt: "2026-08-09T00:00:00Z" });

const NOW = new Date("2026-08-09T00:00:00Z");
const AGE = 14 * 24 * 60 * 60 * 1000;
const base: SyncCandidate = {
  canonicalContactId: "c1", canonicalProspectId: "p1", workEmail: "dir@biz.example.com", normalizedEmail: "dir@biz.example.com",
  firstName: "Dana", lastName: "Director", fullName: "Dana Director", title: "Director of Operations", companyName: "Biz", website: "https://biz.example.com",
  outreachEligibility: "ready_for_outreach", emailVerificationStatus: "verified", suppressionStatus: "none", isCurrentContact: true,
  provider: "apollo", providerRecordId: "r1", lastVerifiedAt: "2026-08-08T00:00:00Z", eligibleCleaningCompany: true, isCustomer: false,
};
const recheck = (c: Partial<SyncCandidate>, events: SuppressionEvent[] = [], existing: AssignmentRecord | null = null, registry: SuppressionRegistryEntry[] = [], registryUnavailable = false) =>
  recheckSyncEligibility({ candidate: { ...base, ...c }, suppressionEvents: events, registry, existingAssignment: existing, now: NOW, maxEligibilityAgeMs: AGE, registryUnavailable });

describe("100C fresh eligibility + suppression recheck (fail closed)", () => {
  it("accepts a currently verified, non-suppressed, current decision-maker", () => {
    expect(recheck({}).outcome).toBe("eligible");
  });
  it("rejects a non ready_for_outreach contact", () => {
    expect(recheck({ outreachEligibility: "needs_enrichment" }).outcome).toBe("ineligible");
  });
  it("rechecks verification and fails closed on non-verified", () => {
    expect(recheck({ emailVerificationStatus: "accept_all" }).outcome).toBe("ineligible");
    expect(recheck({ emailVerificationStatus: "unknown" }).outcome).toBe("ineligible");
  });
  it("fails closed on a missing normalized email", () => {
    expect(recheck({ normalizedEmail: null, workEmail: null }).outcome).toBe("ineligible");
  });
  it("rechecks stored suppression and fails closed", () => {
    expect(recheck({ suppressionStatus: "unsubscribed" }).outcome).toBe("suppressed");
    expect(recheck({ suppressionStatus: "hard_bounce" }).outcome).toBe("suppressed");
  });
  it("fails closed on a newer suppression event even when stored status is none", () => {
    const events: SuppressionEvent[] = [{ type: "hard_bounce", occurredAt: "2026-08-09T00:00:00Z" }];
    expect(recheck({}, events).outcome).toBe("suppressed");
  });
  it("rechecks customer status and eligibility gate", () => {
    expect(recheck({ isCustomer: true }).outcome).toBe("ineligible");
    expect(recheck({ eligibleCleaningCompany: false }).outcome).toBe("ineligible");
  });
  it("rechecks contact currency", () => {
    expect(recheck({ isCurrentContact: false }).outcome).toBe("ineligible");
  });
  it("fails closed on stale or missing verification timestamp", () => {
    expect(recheck({ lastVerifiedAt: "2000-01-01T00:00:00Z" }).outcome).toBe("stale");
    expect(recheck({ lastVerifiedAt: null }).outcome).toBe("stale");
  });
  it("treats an existing active assignment as a duplicate", () => {
    const existing: AssignmentRecord = { id: "a1", contactId: "c1", campaignConfigId: "cfg", state: "submitted", providerLeadId: "L1", reason: null, updatedAt: "x" };
    expect(recheck({}, [], existing).outcome).toBe("duplicate");
  });
  it("does not treat a cancelled-then-eligible... a cancelled assignment still blocks (no resubmit)", () => {
    const cancelled: AssignmentRecord = { id: "a1", contactId: "c1", campaignConfigId: "cfg", state: "cancelled", providerLeadId: null, reason: null, updatedAt: "x" };
    expect(recheck({}, [], cancelled).outcome).toBe("duplicate");
  });
});

describe("100C durable customer/suppression registry recheck", () => {
  it("blocks an existing customer (registry, email match)", () => {
    expect(recheck({}, [], null, [reg("existing_customer", "email")]).outcome).toBe("ineligible");
  });
  it("blocks an active trial", () => {
    expect(recheck({}, [], null, [reg("active_trial", "email")]).outcome).toBe("ineligible");
  });
  it("blocks a suppressed contact by domain match", () => {
    expect(recheck({}, [], null, [reg("do_not_contact", "domain")]).outcome).toBe("suppressed");
  });
  it.each<SuppressionRegistryEntry["kind"]>(["unsubscribed", "hard_bounce", "spam_complaint", "manual_block", "legal_compliance"])(
    "blocks registry suppression kind: %s", (kind) => {
      expect(recheck({}, [], null, [reg(kind)]).outcome).toBe("suppressed");
    });
  it("keeps an unsuppressed, non-customer verified contact eligible", () => {
    expect(recheck({}, [], null, []).outcome).toBe("eligible");
  });
  it("fails closed when the registry could not be evaluated", () => {
    expect(recheck({}, [], null, [], true).outcome).toBe("ineligible");
  });
  it("prefers a customer/suppression block over a stale/unverified signal (registry wins)", () => {
    // Even a customer with an otherwise-eligible profile is excluded.
    expect(recheck({ lastVerifiedAt: "2000-01-01T00:00:00Z" }, [], null, [reg("existing_customer")]).outcome).toBe("ineligible");
  });
});
