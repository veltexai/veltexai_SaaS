import { HunterEnrichmentProvider, HunterError } from "../src/hunter-provider";

const company = { prospectId: "p1", companyName: "Example", companyType: "commercial_cleaning" as const, websiteDomain: "example.com", eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false };
const response = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

describe("Hunter enrichment provider", () => {
  it("searches a domain, ranks decision makers, and verifies before returning candidates", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(response({ data: { emails: [
        { value: "help@example.com", first_name: null, last_name: null, position: "Support", confidence: 99 },
        { value: "owner@example.com", first_name: "Ada", last_name: "Owner", position: "Owner", confidence: 90 },
      ] } }))
      .mockResolvedValueOnce(response({ data: { status: "valid" } }));
    const result = await new HunterEnrichmentProvider("key", fetchImpl as typeof fetch).enrichCompany(company, 4);
    expect(result).toMatchObject({ requestsUsed: 2, accounting: { searchRequests: 1, enrichmentRequests: 1, successfulEnrichments: 1 } });
    expect(result.candidates).toEqual([expect.objectContaining({ email: "owner@example.com", providerVerificationStatus: "valid" })]);
    expect(fetchImpl.mock.calls[0][1].headers).toMatchObject({ "X-API-KEY": "key" });
    expect(String(fetchImpl.mock.calls[0][0])).not.toContain("key");
  });

  it("returns no candidates when a domain has no decision maker", async () => {
    const fetchImpl = jest.fn().mockResolvedValue(response({ data: { emails: [{ value: "help@example.com", position: "Support" }] } }));
    await expect(new HunterEnrichmentProvider("key", fetchImpl as typeof fetch).enrichCompany(company, 4)).resolves.toMatchObject({ candidates: [], requestsUsed: 1 });
  });

  it("fails closed on missing domains, keys, and authentication errors", async () => {
    expect(() => new HunterEnrichmentProvider("")).toThrow("HUNTER_API_KEY");
    await expect(new HunterEnrichmentProvider("key").enrichCompany({ ...company, websiteDomain: null }, 2)).rejects.toThrow("requires a company domain");
    const fetchImpl = jest.fn().mockResolvedValue(response({}, 401));
    await expect(new HunterEnrichmentProvider("key", fetchImpl as typeof fetch).enrichCompany(company, 2)).rejects.toBeInstanceOf(HunterError);
  });
});
