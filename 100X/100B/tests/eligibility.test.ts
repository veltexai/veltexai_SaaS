import { evaluateEligibility } from "../src/eligibility";
import type { CompanyContext, EligibilityInput, NormalizedContact, SuppressionSignals } from "../src/types";

const company: CompanyContext = { prospectId: "p1", companyName: "Evergreen", companyType: "commercial_janitorial", websiteDomain: "evergreen.example", eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false };
const verifiedContact: NormalizedContact = {
  firstName: "Dana", lastName: "Rivera", fullName: "Dana Rivera", title: "Owner", roleCategory: "owner", roleRank: 1, isGenericMailbox: false,
  email: "dana@evergreen.example", normalizedEmail: "dana@evergreen.example", emailValid: true, phone: null, linkedinUrl: null,
  provider: "apollo", providerRecordId: "r1", providerVerificationStatus: "verified", verificationStatus: "verified", providerMetadata: null,
};
const noSuppression: SuppressionSignals = { unsubscribed: false, hardBounced: false, blocked: false, activeInCampaign: false, alreadyReceivedCampaign: false, emailGloballySuppressed: false };
const input = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({ company, contact: verifiedContact, suppression: noSuppression, identityConflict: false, providerError: false, ...over });

describe("100B deterministic outreach eligibility", () => {
  it("approves a verified decision-maker that passes every check", () => {
    const d = evaluateEligibility(input());
    expect(d).toMatchObject({ eligibility: "ready_for_outreach", isCurrentDecisionMaker: true });
    expect(d.reason).toBeTruthy();
  });
  it("holds a contact with no email as needs_enrichment", () => {
    expect(evaluateEligibility(input({ contact: { ...verifiedContact, email: null, normalizedEmail: null, emailValid: false } })).eligibility).toBe("needs_enrichment");
  });
  it("rejects an invalid email and an unverified status as unverified", () => {
    expect(evaluateEligibility(input({ contact: { ...verifiedContact, emailValid: false } })).eligibility).toBe("unverified");
    expect(evaluateEligibility(input({ contact: { ...verifiedContact, verificationStatus: "unknown" } })).eligibility).toBe("unverified");
    expect(evaluateEligibility(input({ contact: { ...verifiedContact, verificationStatus: "accept_all" } })).eligibility).toBe("unverified");
  });
  it.each([
    ["unsubscribed", { unsubscribed: true }, "unsubscribed"],
    ["hard bounce", { hardBounced: true }, "hard_bounce"],
    ["do-not-contact", { blocked: true }, "do_not_contact"],
    ["global suppression", { emailGloballySuppressed: true }, "global_suppression"],
  ])("suppresses on %s", (_n, sig, status) => {
    const d = evaluateEligibility(input({ suppression: { ...noSuppression, ...sig } }));
    expect(d.eligibility).toBe("suppressed"); expect(d.suppressionStatus).toBe(status);
  });
  it("marks campaign membership as already_contacted", () => {
    expect(evaluateEligibility(input({ suppression: { ...noSuppression, activeInCampaign: true } })).eligibility).toBe("already_contacted");
    expect(evaluateEligibility(input({ suppression: { ...noSuppression, alreadyReceivedCampaign: true } })).eligibility).toBe("already_contacted");
  });
  it("rejects customers and ineligible companies", () => {
    expect(evaluateEligibility(input({ company: { ...company, isCustomer: true } })).eligibility).toBe("customer");
    expect(evaluateEligibility(input({ company: { ...company, eligibleCleaningCompany: false } })).eligibility).toBe("ineligible");
  });
  it("holds identity conflicts and provider errors", () => {
    expect(evaluateEligibility(input({ identityConflict: true })).eligibility).toBe("identity_conflict");
    expect(evaluateEligibility(input({ providerError: true })).eligibility).toBe("provider_error");
  });
  it("classifies a verified generic mailbox as ready but not a decision-maker", () => {
    const generic: NormalizedContact = { ...verifiedContact, roleCategory: "generic_mailbox", roleRank: 98, isGenericMailbox: true, email: "info@evergreen.example", normalizedEmail: "info@evergreen.example" };
    const d = evaluateEligibility(input({ contact: generic }));
    expect(d.eligibility).toBe("ready_for_outreach"); expect(d.isCurrentDecisionMaker).toBe(false);
  });
});
