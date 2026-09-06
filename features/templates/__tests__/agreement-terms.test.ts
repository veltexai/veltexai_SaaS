import { resolveAgreementTerms } from "../utils/agreement-terms";

describe("resolveAgreementTerms", () => {
  it("keeps one-time residential work one-time", () => {
    const terms = resolveAgreementTerms({
      service_type: "residential",
      service_frequency: "one-time",
    });
    expect(terms.title).toBe("One-Time Service");
    expect(terms.description).not.toMatch(/twelve|12 months/i);
    expect(terms.description).toContain("does not create a recurring service commitment");
    expect(terms.description).toContain("one residential service visit");
  });

  it.each([
    { service_type: "residential", service_frequency: "bi-weekly" },
    { service_type: "commercial", service_frequency: "one-time" },
    { service_type: "commercial", service_frequency: "5x-week" },
  ])("retains existing recurring terms for $service_type/$service_frequency", (source) => {
    expect(resolveAgreementTerms(source).description).toContain("twelve (12) months");
  });
});
