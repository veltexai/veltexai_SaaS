import { SupabaseContactRepository } from "../src/supabase-adapters";
import type { PersistContactInput } from "../src/types";

const input: PersistContactInput = {
  disposition: "new_contact",
  canonical: {
    prospectId: "11111111-1111-4111-8111-111111111111", firstName: "Dana", lastName: "Rivera", fullName: "Dana Rivera",
    title: "Owner", roleCategory: "owner", email: "dana@evergreen.example", normalizedEmail: "dana@evergreen.example",
    emailVerificationStatus: "verified", phone: null, linkedinUrl: null, isCurrentContact: true,
    outreachEligibility: "ready_for_outreach", eligibilityReason: "ok", suppressionStatus: "none", suppressionReason: null,
    firstDiscoveredAt: "2026-08-09T12:00:00Z", lastVerifiedAt: "2026-08-09T12:00:00Z",
  },
  source: { provider: "apollo", providerRecordId: "apollo-1", providerVerificationStatus: "verified", providerMetadata: null, firstObservedAt: "2026-08-09T12:00:00Z", lastObservedAt: "2026-08-09T12:00:00Z" },
};

describe("Supabase 100B adapter mappings", () => {
  it("maps run-owned lock and cursor RPCs in order", async () => {
    const rpc = jest.fn(async (_name: string, _args?: Record<string, unknown>) => ({ data: true, error: null }));
    const repo = new SupabaseContactRepository({ rpc } as never);
    await repo.acquireLock("100B", "run", "e"); await repo.renewLock("100B", "run", "e2");
    await repo.setCursor("100B", "run", 3); await repo.releaseLock("100B", "run");
    expect(rpc.mock.calls.map(([n]) => n)).toEqual(["acquire_100b_lock", "renew_100b_lock", "set_100b_cursor", "release_100b_lock"]);
  });
  it("maps a contact + source to one atomic persist RPC", async () => {
    const rpc = jest.fn(async () => ({ data: { contact_id: "c1", source_record_id: "s1", contact_created: true, source_created: true }, error: null }));
    const result = await new SupabaseContactRepository({ rpc } as never).persistContact("run-1", input);
    expect(result).toEqual({ contactId: "c1", sourceRecordId: "s1", contactCreated: true, sourceCreated: true });
    expect(rpc).toHaveBeenCalledWith("persist_100b_contact", expect.objectContaining({
      requested_run_id: "run-1", matched_contact_id: null,
      contact_record: expect.objectContaining({ prospect_id: "11111111-1111-4111-8111-111111111111", role_category: "owner", outreach_eligibility: "ready_for_outreach", normalized_email: "dana@evergreen.example" }),
      source_record: expect.objectContaining({ provider: "apollo", provider_record_id: "apollo-1" }),
    }));
  });
  it("maps 100A company rows into provider-neutral targets", async () => {
    const chain = { select: () => ({ in: async () => ({ data: [{ id: "p1", company_name: "Evergreen", company_type: "office_cleaning", website_domain: "x.example" }], error: null }) }) };
    const client = { from: jest.fn(() => chain) };
    const targets = await new SupabaseContactRepository(client as never).loadTargets(["p1"]);
    expect(targets).toEqual([{ prospectId: "p1", companyName: "Evergreen", companyType: "office_cleaning", websiteDomain: "x.example", eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false }]);
  });
});
