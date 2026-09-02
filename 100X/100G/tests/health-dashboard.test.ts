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
      alerts: [],
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
    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ORCHESTRATION_EVIDENCE_STALE", severity: "critical" }),
      expect.objectContaining({ code: "RAMP_METRICS_STALE", severity: "critical" }),
      expect.objectContaining({ code: "MUTATION_DECISION_STALE", severity: "critical" }),
      expect.objectContaining({ code: "ELIGIBLE_SUPPLY_EMPTY", severity: "critical" }),
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
    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "ENRICHMENT_ZERO_YIELD", severity: "warning" }),
      expect.objectContaining({ code: "ELIGIBLE_SUPPLY_LOW", severity: "warning" }),
    ]));
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

  it("emits critical machine-readable alerts for campaign and mailbox safety failures", () => {
    const result = assessDashboardHealth({
      now,
      latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [] },
      latestMetric: {
        ...metric,
        campaign_status: -1,
        bounced: 1,
        spam_complaints: 1,
        webhook_failures: 1,
        healthy_sending_accounts: 0,
        minimum_account_health: 80,
      },
      latestDecision: decision,
      auditEvidence,
      supplyStatus: "healthy",
    });
    expect(result.status).toBe("blocked");
    expect(result.alerts.map(({ code }) => code)).toEqual(expect.arrayContaining([
      "CAMPAIGN_UNHEALTHY",
      "SPAM_COMPLAINT_DETECTED",
      "WEBHOOK_FAILURE_DETECTED",
      "BOUNCE_RATE_EXCEEDED",
      "NO_HEALTHY_SENDING_ACCOUNT",
      "MAILBOX_HEALTH_BELOW_THRESHOLD",
    ]));
  });

  it("surfaces historical reconciliation backlog and gates sustained unsubscribe risk", () => {
    const result = assessDashboardHealth({
      now,
      latestRun: { status: "completed", createdAt: "2026-08-18T14:00:00.000Z", alerts: [] },
      latestMetric: { ...metric, sent: 20, unsubscribes: 2 },
      latestDecision: decision,
      auditEvidence: { ...auditEvidence, openUnmatchedCount: 9 },
      supplyStatus: "healthy",
    });
    expect(result.status).toBe("blocked");
    expect(result.alerts).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "UNMATCHED_EVENT_BACKLOG", severity: "warning" }),
      expect.objectContaining({ code: "UNSUBSCRIBE_RATE_EXCEEDED", severity: "critical" }),
    ]));
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
      minimumQueuedLeads: 3_500,
      targetQueuedLeads: 7_000,
      eligibleLeadGap: 3_424,
      reserveLeadGap: 6_924,
      readyForTargetVolume: false,
      blockers: [
        "20 additional healthy mailbox equivalents are required",
        "3424 additional eligible leads are required for the 7-day activation minimum",
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
      reserveLeadGap: 3_500,
    });
  });
});
