import { assessDashboardHealth } from "../src/health-dashboard";

describe("100X health dashboard assessment", () => {
  const now = new Date("2026-08-18T18:00:00.000Z");
  const metric = { metric_date: "2026-08-18", recorded_at: "2026-08-18T17:00:00.000Z" };

  it("marks current evidence and healthy supply ready", () => {
    expect(assessDashboardHealth({ now, latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [] }, latestMetric: metric, supplyStatus: "healthy" })).toMatchObject({
      status: "healthy",
      readyForAutomatedProgression: true,
      blockers: [],
    });
  });

  it("fails closed on stale evidence, failed runs, or empty supply", () => {
    const result = assessDashboardHealth({ now, latestRun: { status: "failed", createdAt: "2026-08-16T00:00:00.000Z", alerts: [] }, latestMetric: null, supplyStatus: "empty" });
    expect(result.status).toBe("blocked");
    expect(result.readyForAutomatedProgression).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "orchestration evidence is missing or stale",
      "ramp metrics are missing or stale",
      "latest orchestration run failed",
      "eligible lead supply is empty",
    ]));
  });

  it("surfaces warning alerts without pretending they are absent", () => {
    const result = assessDashboardHealth({
      now,
      latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [{ severity: "warning", code: "ENRICHMENT_ZERO_YIELD", message: "no contacts" }] },
      latestMetric: metric,
      supplyStatus: "low",
    });
    expect(result).toMatchObject({ status: "warning", readyForAutomatedProgression: true });
    expect(result.warnings).toHaveLength(2);
  });
});
