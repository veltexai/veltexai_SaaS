import { SupabaseProspectRepository } from "../src/supabase-adapters";
import type { PersistObservationInput } from "../src/types";

const input: PersistObservationInput = {
  disposition: "new_canonical_prospect",
  canonical: { companyName: "Acme", website: "https://acme.example", websiteDomain: "acme.example", primaryPhone: "206-555-0101", normalizedPhone: "2065550101", companyType: "commercial_cleaning", status: "discovered", firstDiscoveredAt: "2026-08-06T12:00:00Z", lastUpdatedAt: "2026-08-06T12:00:00Z" },
  source: { provider: "google_places", providerRecordId: "place-1", sourceGeography: "sea", sourceQuery: "commercial cleaning", providerUrl: "https://maps.example", observedCompanyName: "Acme", observedWebsite: "https://acme.example", observedPhone: "206-555-0101", observedAddress: "1 Main", city: "Seattle", state: "WA", qualification: { accepted: true, companyType: "commercial_cleaning", score: .95, reason: "match", method: "rules", version: "cleaning-rules-v1" }, firstObservedAt: "2026-08-06T12:00:00Z", lastObservedAt: "2026-08-06T12:00:00Z", providerMetadata: null },
};
describe("Supabase adapter mappings", () => {
  it("maps run-owned lock and cursor RPCs", async () => {
    const rpc = jest.fn(async (..._args: unknown[]) => ({ data: true, error: null }));
    const repository = new SupabaseProspectRepository({ rpc } as never);
    await expect(repository.acquireLock("100A", "run", "expiry")).resolves.toBe(true);
    await expect(repository.renewLock("100A", "run", "expiry2")).resolves.toBe(true);
    await repository.setCursor("100A", "run", 2);
    await repository.releaseLock("100A", "run");
    expect(rpc.mock.calls.map(([name]) => name)).toEqual(["acquire_100a_lock", "renew_100a_lock", "set_100a_cursor", "release_100a_lock"]);
  });
  it("maps canonical and provider observation fields to one atomic RPC", async () => {
    const rpc = jest.fn(async (..._args: unknown[]) => ({ data: { prospect_id: "p1", source_record_id: "s1", canonical_created: true, source_created: true }, error: null }));
    const result = await new SupabaseProspectRepository({ rpc } as never).persistObservation("run-1", input);
    expect(result).toEqual({ prospectId: "p1", sourceRecordId: "s1", canonicalCreated: true, sourceCreated: true });
    expect(rpc).toHaveBeenCalledWith("persist_100a_observation", expect.objectContaining({
      canonical_record: expect.objectContaining({ company_name: "Acme", website_domain: "acme.example" }),
      source_record: expect.objectContaining({ provider: "google_places", provider_record_id: "place-1", qualification: expect.objectContaining({ method: "rules" }) }),
      requested_run_id: "run-1",
      matched_prospect_id: null,
    }));
  });
  it("maps nullable provider-neutral geography and query", async () => {
    const rpc = jest.fn(async (..._args: unknown[]) => ({ data: { prospect_id: "p1", source_record_id: "s1", canonical_created: true, source_created: true }, error: null }));
    await new SupabaseProspectRepository({ rpc } as never).persistObservation("run-1", { ...input, source: { ...input.source, provider: "referral", sourceGeography: null, sourceQuery: null } });
    expect(rpc).toHaveBeenCalledWith("persist_100a_observation", expect.objectContaining({ source_record: expect.objectContaining({ source_geography: null, source_query: null }) }));
  });
});
