import { SupabaseSyncRepository } from "../src/supabase-adapters";

describe("Supabase 100C adapter candidate selection", () => {
  it("uses the qualified prospect domain for the final email-domain recheck", async () => {
    const query: Record<string, jest.Mock> = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.order = jest.fn(() => query);
    query.limit = jest.fn(async () => ({ data: [{
      id: "contact-1", prospect_id: "prospect-1", email: "owner@clean.example.com", normalized_email: "owner@clean.example.com",
      outreach_eligibility: "ready_for_outreach", email_verification_status: "verified", suppression_status: "none",
      is_current_contact: true, last_verified_at: "2026-09-15T00:00:00Z",
      internal_prospects: { company_name: "Clean Co", website: "https://clean.example.com", website_domain: "clean.example.com", company_type: "commercial_cleaning" },
      prospect_contact_sources: [{ provider: "apollo", provider_record_id: "apollo-1", last_observed_at: "2026-09-15T00:00:00Z" }],
    }], error: null }));
    const client = { from: jest.fn(() => query) };

    const candidates = await new SupabaseSyncRepository(client as never).loadCandidates("pilot", 1);
    expect(candidates[0]?.websiteDomain).toBe("clean.example.com");
  });
  it("prioritizes fresh verification snapshots before applying the bounded candidate limit", async () => {
    const calls: Array<[string, unknown]> = [];
    const query: Record<string, jest.Mock> = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.order = jest.fn((column: string, options: unknown) => { calls.push([column, options]); return query; });
    query.limit = jest.fn(async () => ({ data: [], error: null }));
    const client = { from: jest.fn(() => query) };

    await new SupabaseSyncRepository(client as never).loadCandidates("pilot", 9);

    expect(calls).toEqual([
      ["last_verified_at", { ascending: false, nullsFirst: false }],
      ["id", { ascending: true }],
    ]);
    expect(query.limit).toHaveBeenCalledWith(9);
  });
});
