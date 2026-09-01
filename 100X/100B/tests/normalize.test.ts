import { classifyRole, isGenericMailbox, mapVerificationStatus, normalizeContact, normalizeEmail } from "../src/normalize";

describe("100B contact normalization", () => {
  it("lowercases and validates emails; flags invalid and missing", () => {
    expect(normalizeEmail("  Dana@Evergreen.Example ")).toEqual({ normalizedEmail: "dana@evergreen.example", emailValid: true });
    expect(normalizeEmail("not-an-email")).toMatchObject({ emailValid: false });
    expect(normalizeEmail(null)).toEqual({ normalizedEmail: null, emailValid: false });
  });
  it("deduplicates emails case-insensitively via normalization", () => {
    expect(normalizeEmail("SAM@x.example").normalizedEmail).toBe(normalizeEmail("sam@x.example").normalizedEmail);
  });
  it("classifies generic mailboxes", () => {
    expect(isGenericMailbox("info@x.example")).toBe(true);
    expect(isGenericMailbox("office@x.example")).toBe(true);
    expect(isGenericMailbox("dana@x.example")).toBe(false);
  });
  it.each([
    ["Owner", "owner"], ["Co-Founder", "founder"], ["President", "president"], ["CEO", "chief_executive"],
    ["General Manager", "general_manager"], ["Director of Operations", "operations"], ["VP of Sales", "sales_bd"],
    ["Managing Member", "owner"], ["Managing Partner", "owner"], ["Principal", "owner"],
    ["Managing Director", "general_manager"], ["Regional Manager", "general_manager"], ["Vice President of Operations", "operations"],
    ["Estimator", "estimator"], ["Office Manager", "office_manager"],
  ])("maps title %s to role %s", (title, role) => {
    expect(classifyRole(title, false, true)).toBe(role);
  });
  it("treats a generic mailbox with no person as generic_mailbox, else other", () => {
    expect(classifyRole(null, true, false)).toBe("generic_mailbox");
    expect(classifyRole("Marketing Coordinator", false, true)).toBe("other");
  });
  it("maps provider verification strings onto the canonical set", () => {
    expect(mapVerificationStatus("valid")).toBe("verified");
    expect(mapVerificationStatus("catch_all")).toBe("accept_all");
    expect(mapVerificationStatus("risky")).toBe("unknown");
    expect(mapVerificationStatus("bounced")).toBe("invalid");
    expect(mapVerificationStatus("weird")).toBe("unverified");
  });
  it("normalizes a full provider candidate and never fabricates an email", () => {
    const c = normalizeContact({ providerRecordId: "r1", firstName: "Dana", lastName: "Rivera", title: "Owner", email: "Dana@Evergreen.Example", providerVerificationStatus: "verified" }, "apollo");
    expect(c).toMatchObject({ roleCategory: "owner", normalizedEmail: "dana@evergreen.example", emailValid: true, verificationStatus: "verified", provider: "apollo" });
    const missing = normalizeContact({ providerRecordId: "r2", firstName: "No", lastName: "Email", title: "Owner" }, "apollo");
    expect(missing.email).toBeNull(); expect(missing.normalizedEmail).toBeNull();
  });
});
