import { run100G } from "../src/orchestrator";
import type { OrchestrationRepository, OrchestrationRun, StageId, StageRunner } from "../src/types";

function setup(overrides: Partial<{ stage: number; queued: number; fail: StageId }> = {}) {
  const saved = new Map<string, OrchestrationRun>();
  const calls: StageId[] = [];
  const repository: OrchestrationRepository = {
    getSupplySnapshot: async () => ({ currentDailySendStage: overrides.stage ?? 10, queuedEligibleLeads: overrides.queued ?? 5 }),
    findRun: async (date, mode, lane) => saved.get(`${date}:${mode}:${lane}`) ?? null,
    recordRun: async (run) => {
      const key = `${run.runDate}:${run.mode}:${run.lane}`;
      const previous = saved.get(key);
      if (previous?.status === "completed") return false;
      saved.set(key, run);
      return true;
    },
  };
  const runner = (stage: StageId): StageRunner => ({ run: async () => {
    calls.push(stage);
    if (overrides.fail === stage) throw new Error(`${stage} failed safely`);
    return { stage, status: "completed", produced: 1, reason: "ok" };
  } });
  return { repository, calls, stages: { "100A": runner("100A"), "100B": runner("100B"), "100C": runner("100C") } };
}

const live = { enabled: true, executeStages: true, queueDays: 7, maximumRequestedLeads: 500, databaseBuildTarget: 1, minimumQueueDaysForAlert: 3 };

describe("100G acquisition orchestrator", () => {
  it("calculates replenishment from the active send stage and runs in order", async () => {
    const deps = setup();
    const run = await run100G(live, { ...deps, now: () => new Date("2026-08-12T12:00:00Z") });
    expect(run.requestedLeads).toBe(65);
    expect(deps.calls).toEqual(["100C", "100B", "100A"]);
    expect(run.supply).toMatchObject({ status: "low", runwayDays: 0.5, deficit: 65 });
    expect(run.alerts?.[0]?.code).toBe("ELIGIBLE_SUPPLY_LOW");
  });

  it("persists an explicit alert when enrichment produces zero yield", async () => {
    const deps = setup({ stage: 3, queued: 0 });
    const stages = { ...deps.stages, "100B": { run: async () => ({ stage: "100B" as const, status: "completed" as const, produced: 0, reason: "none" }) } };
    const run = await run100G(live, { ...deps, stages, now: () => new Date("2026-08-12T12:00:00Z") });
    expect(run.alerts?.some(({ code }) => code === "ENRICHMENT_ZERO_YIELD")).toBe(true);
  });

  it("stops downstream stages after a failure", async () => {
    const deps = setup({ fail: "100B" });
    const run = await run100G(live, { ...deps, now: () => new Date("2026-08-12T12:00:00Z") });
    expect(run.status).toBe("failed");
    expect(deps.calls).toEqual(["100C", "100B"]);
  });

  it("is idempotent per day", async () => {
    const deps = setup();
    const first = await run100G(live, { ...deps, now: () => new Date("2026-08-12T12:00:00Z") });
    const second = await run100G(live, { ...deps, now: () => new Date("2026-08-12T18:00:00Z") });
    expect(second).toEqual(first);
    expect(deps.calls).toHaveLength(3);
  });

  it("retries a failed run after a lock or transient stage failure", async () => {
    const deps = setup({ fail: "100A" });
    const now = () => new Date("2026-08-12T12:00:00Z");
    const failed = await run100G(live, { ...deps, now });
    expect(failed.status).toBe("failed");
    const recovered = await run100G(live, { ...deps, stages: setup().stages, now });
    expect(recovered.status).toBe("completed");
  });

  it("does not call stages in dry-run mode and still feeds 100C when inventory is sufficient", async () => {
    const dry = setup();
    await run100G({ ...live, executeStages: false }, { ...dry, now: () => new Date("2026-08-12T12:00:00Z") });
    expect(dry.calls).toEqual([]);
    const full = setup({ queued: 70 });
    await run100G({ ...live, databaseBuildTarget: 0 }, { ...full, now: () => new Date("2026-08-12T12:00:00Z") });
    expect(full.calls).toEqual(["100C"]);
  });

  it("allows an execute run after a successful dry run on the same day", async () => {
    const deps = setup();
    const now = () => new Date("2026-08-12T12:00:00Z");
    await run100G({ ...live, executeStages: false }, { ...deps, now });
    const executed = await run100G(live, { ...deps, now });
    expect(executed.mode).toBe("execute");
    expect(deps.calls).toEqual(["100C", "100B", "100A"]);
  });

  it("protects the audited campaign allotment before bounded database acquisition", async () => {
    const calls: Array<[StageId, number]> = [];
    const deps = setup({ stage: 1, queued: 0 });
    const runner = (stage: StageId): StageRunner => ({ run: async ({ requestedLeads }) => {
      calls.push([stage, requestedLeads]); return { stage, status: "completed", produced: 0, reason: "ok" };
    } });
    const stages = { "100A": runner("100A"), "100B": runner("100B"), "100C": runner("100C") };
    await run100G({ ...live, databaseBuildTarget: 25 }, { ...deps, stages, now: () => new Date("2026-08-13T12:00:00Z") });
    expect(calls).toEqual([["100C", 1], ["100B", 25], ["100A", 25]]);
  });

  it("requests the audited 100C stage even when a healthy queue has no acquisition deficit", async () => {
    const calls: Array<[StageId, number]> = [];
    const deps = setup({ stage: 1, queued: 56 });
    const runner = (stage: StageId): StageRunner => ({ run: async ({ requestedLeads }) => {
      calls.push([stage, requestedLeads]);
      return { stage, status: "completed", produced: 0, reason: "ok" };
    } });
    const stages = { "100A": runner("100A"), "100B": runner("100B"), "100C": runner("100C") };
    const run = await run100G({ ...live, databaseBuildTarget: 25 }, { ...deps, stages, now: () => new Date("2026-08-24T12:00:00Z") });
    expect(run.requestedLeads).toBe(0);
    expect(calls).toEqual([["100C", 1], ["100B", 25], ["100A", 25]]);
  });

  it("passes the audited daily send stage to every production stage", async () => {
    const seen: Array<[StageId, number]> = [];
    const deps = setup({ stage: 3, queued: 0 });
    const runner = (stage: StageId): StageRunner => ({ run: async ({ currentDailySendStage }) => {
      seen.push([stage, currentDailySendStage]);
      return { stage, status: "completed", produced: 0, reason: "ok" };
    } });
    const stages = { "100A": runner("100A"), "100B": runner("100B"), "100C": runner("100C") };
    await run100G(live, { ...deps, stages, now: () => new Date("2026-08-13T12:00:00Z") });
    expect(seen).toEqual([["100C", 3], ["100B", 3], ["100A", 3]]);
  });

  it("isolates outbound, discovery, and enrichment into independent daily runs", async () => {
    const deps = setup({ stage: 3, queued: 0 });
    const now = () => new Date("2026-08-13T12:00:00Z");
    await run100G(live, { ...deps, now }, "outbound");
    await run100G(live, { ...deps, now }, "discovery");
    await run100G(live, { ...deps, now }, "enrichment");
    expect(deps.calls).toEqual(["100C", "100A", "100B"]);
  });

  it("remains idempotent within each lane", async () => {
    const deps = setup({ stage: 3, queued: 0 });
    const now = () => new Date("2026-08-13T12:00:00Z");
    const first = await run100G(live, { ...deps, now }, "discovery");
    const second = await run100G(live, { ...deps, now }, "discovery");
    expect(second).toEqual(first);
    expect(deps.calls).toEqual(["100A"]);
  });
});
