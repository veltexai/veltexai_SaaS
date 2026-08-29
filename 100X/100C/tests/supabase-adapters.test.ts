import { SupabaseSyncRepository } from "../src/supabase-adapters";

describe("Supabase 100C adapter candidate selection", () => {
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
