import { SupabaseOrchestrationRepository } from "../src/supabase-repository";

describe("100G Supabase repository", () => {
  it("normalizes the durable supply snapshot", async () => {
    const client = { rpc: jest.fn().mockResolvedValue({ data: { current_daily_send_stage: 25, queued_eligible_leads: 40 }, error: null }) };
    await expect(new SupabaseOrchestrationRepository(client as any).getSupplySnapshot()).resolves.toEqual({ currentDailySendStage: 25, queuedEligibleLeads: 40 });
  });

  it("treats a unique-date collision as idempotent", async () => {
    const client = { from: () => {
      const query: any = { eq: jest.fn(() => query), select: jest.fn().mockResolvedValue({ data: [], error: null }), insert: jest.fn().mockResolvedValue({ error: { code: "23505" } }) };
      query.update = jest.fn(() => query);
      return query;
    } };
    const repo = new SupabaseOrchestrationRepository(client as any);
    await expect(repo.recordRun({ runDate: "2026-08-12", mode: "execute", requestedLeads: 3, status: "completed", results: [] })).resolves.toBe(false);
  });
});
