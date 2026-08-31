import { assessDashboardHealth, assessSenderExpansionReadiness } from "../src/health-dashboard";

describe("100X health dashboard assessment", () => {
  const now = new Date("2026-08-18T18:00:00.000Z");
  const metric = { metric_date: "2026-08-18", recorded_at: "2026-08-18T17:00:00.000Z", sent: 3 };
  const decision = { observed_at: "2026-08-18T17:30:00.000Z" };
  const auditEvidence = { available: true, migrationsComplete: true, receiptCount: 3, suppressingEventCount: 0, matchedSuppressionCount: 0, ingestionErrorCount: 0, heldUnmatchedCount: 0 };

  it("marks current evidence and healthy supply ready", () => {
    expect(assessDashboardHealth({ now, latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [] }, latestMetric: metric, latestDecision: decision, auditEvidence, supplyStatus: "healthy" })).toMatchObject({
      status: "healthy",
      readyForAutomatedProgression: true,
      blockers: [],
    });
  });

  it("fails closed on stale evidence, failed runs, or empty supply", () => {
    const result = assessDashboardHealth({ now, latestRun: { status: "failed", createdAt: "2026-08-16T00:00:00.000Z", alerts: [] }, latestMetric: null, latestDecision: null, auditEvidence: { available: false, migrationsComplete: false }, supplyStatus: "empty" });
    expect(result.status).toBe("blocked");
    expect(result.readyForAutomatedProgression).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "orchestration evidence is missing or stale",
      "ramp metrics are missing or stale",
      "mutation decision evidence is missing or stale",
      "receipt and suppression audit evidence is unavailable",
      "latest orchestration run failed",
      "eligible lead supply is empty",
    ]));
  });

  it("surfaces warning alerts without pretending they are absent", () => {
    const result = assessDashboardHealth({
      now,
      latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [{ severity: "warning", code: "ENRICHMENT_ZERO_YIELD", message: "no contacts" }] },
      latestMetric: metric,
      latestDecision: decision,
      auditEvidence,
      supplyStatus: "low",
    });
    expect(result).toMatchObject({ status: "warning", readyForAutomatedProgression: true });
    expect(result.warnings).toHaveLength(2);
  });

  it("blocks mutation when receipts, suppression parity, or ingestion health are unsafe", () => {
    const result = assessDashboardHealth({
      now,
      latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [] },
      latestMetric: metric,
      latestDecision: decision,
      auditEvidence: { available: true, migrationsComplete: true, receiptCount: 0, suppressingEventCount: 1, matchedSuppressionCount: 0, ingestionErrorCount: 1, heldUnmatchedCount: 1 },
      supplyStatus: "healthy",
    });
    expect(result.status).toBe("blocked");
    expect(result.blockers).toEqual(expect.arrayContaining([
      "outbound webhook ingestion errors are present",
      "sent activity has no matching outbound event receipts",
      "a suppressing event is missing its durable suppression record",
    ]));
    expect(result.warnings).toContain("unmatched outbound events require reconciliation");
  });
});

describe("100X sender expansion readiness", () => {
  it("quantifies mailbox and lead runway needed for 2,500 weekly sends", () => {
    expect(assessSenderExpansionReadiness({ healthySendingAccounts: 4, queuedEligibleLeads: 76 })).toEqual({
      weeklyTarget: 2_500,
      targetDailyVolume: 500,
      healthySendingAccounts: 4,
      currentDailyCapacity: 100,
      minimumAdditionalMailboxes: 20,
      recommendedAdditionalMailboxes: 25,
      queuedEligibleLeads: 76,
      targetQueuedLeads: 3_500,
      eligibleLeadGap: 3_424,
      readyForTargetVolume: false,
      blockers: [
        "20 additional healthy mailbox equivalents are required",
        "3424 additional eligible leads are required for 7 days of target runway",
      ],
    });
  });

  it("reports ready only when both sender capacity and eligible runway exist", () => {
    expect(assessSenderExpansionReadiness({ healthySendingAccounts: 20, queuedEligibleLeads: 3_500 })).toMatchObject({
      minimumAdditionalMailboxes: 0,
      recommendedAdditionalMailboxes: 0,
      eligibleLeadGap: 0,
      readyForTargetVolume: true,
      blockers: [],
    });
  });
});
