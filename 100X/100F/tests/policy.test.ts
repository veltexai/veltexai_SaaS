import { evaluateRamp } from "../src/policy";
import type { DailyRampMetrics, RampPolicy, RampState } from "../src/types";

const policy: RampPolicy = {
  stages: [1, 3, 5, 10, 25, 50, 120, 250, 500],
  minimumDaysAtStage: 3,
  minimumDeliveredAtStage: 10,
  maximumBounceRate: 0.02,
  maximumSpamComplaints: 0,
  minimumAccountHealth: 95,
  perAccountDailyLimit: 25,
  requireZeroWebhookFailures: true,
};

const state: RampState = {
  campaignId: "pilot",
  currentStage: 10,
  stageStartedAt: "2026-08-01T00:00:00.000Z",
  lastDecisionDate: null,
  pausedByController: false,
};

const metric = (overrides: Partial<DailyRampMetrics> = {}): DailyRampMetrics => ({
  date: "2026-08-11",
  campaignId: "pilot",
  campaignStatus: 1,
  configuredDailyLimit: 10,
  sent: 20,
  bounced: 0,
  replies: 1,
  unsubscribes: 0,
  spamComplaints: 0,
  webhookFailures: 0,
  healthySendingAccounts: 4,
  minimumAccountHealth: 100,
  ...overrides,
});
const supply = { queuedEligibleLeads: 100, minimumQueueDays: 3 };
describe("100F ramp policy", () => {
  it("advances exactly one stage when all gates pass", () => {
    expect(evaluateRamp(state, [metric()], policy, "2026-08-11", supply)).toMatchObject({ action: "advance", targetStage: 25, gates: { metricsAvailable: true, dwellPassed: true, deliveredPassed: true, bouncePassed: true, capacityPassed: true, supplyPassed: true } });
  });

  it.each([
    ["bounce", { bounced: 1 }],
    ["complaint", { spamComplaints: 1 }],
    ["health", { minimumAccountHealth: 89 }],
    ["webhook", { webhookFailures: 1 }],
    ["provider", { campaignStatus: -2 }],
  ])("pauses on %s safety failure", (_name, overrides) => {
    expect(evaluateRamp(state, [metric(overrides)], policy, "2026-08-11").action).toBe("pause");
  });

  it("holds when healthy account capacity cannot support the next stage", () => {
    const constrained = { ...state, currentStage: 120 as const };
    expect(evaluateRamp(constrained, [metric({ healthySendingAccounts: 4, sent: 120 })], policy, "2026-08-11")).toMatchObject({ action: "hold", targetStage: 120 });
  });

  it("holds until stage dwell time and evidence volume are sufficient", () => {
    expect(evaluateRamp({ ...state, stageStartedAt: "2026-08-10T00:00:00Z" }, [metric()], policy, "2026-08-11").reason).toContain("dwell");
    expect(evaluateRamp({ ...state, stageStartedAt: "2026-08-11T18:00:00Z" }, [metric()], policy, "2026-08-11").reason).toContain("0/3 days");
    expect(evaluateRamp(state, [metric({ sent: 3 })], policy, "2026-08-11").reason).toContain("observed delivered volume");
  });

  it("fails closed when the requested observation date is missing", () => {
    const stale = metric({ date: "2026-08-10" });
    expect(evaluateRamp(state, [stale], policy, "2026-08-11", supply)).toMatchObject({
      action: "hold",
      reason: "fresh metrics for 2026-08-11 are unavailable",
      gates: { metricsAvailable: false, metricDate: "2026-08-10", metricFresh: false },
    });
  });

  it("counts only post-stage deliveries and subtracts bounces", () => {
    const bootstrap = { ...state, currentStage: 1 as const, stageStartedAt: "2026-08-10T00:00:00Z" };
    const beforeStage = metric({ date: "2026-08-09", sent: 50 });
    const current = metric({ sent: 3, bounced: 1 });
    const decision = evaluateRamp(bootstrap, [current, beforeStage], { ...policy, maximumBounceRate: 0.5 }, "2026-08-11", supply);
    expect(decision).toMatchObject({ action: "hold", gates: { delivered: 2, requiredDelivered: 3 } });
  });

  it("never emits a negative dwell time for a future or invalid stage start", () => {
    expect(evaluateRamp({ ...state, stageStartedAt: "2026-08-12T00:00:00Z" }, [metric()], policy, "2026-08-11", supply)).toMatchObject({
      action: "hold",
      gates: { stageAgeDays: 0 },
    });
    expect(evaluateRamp({ ...state, stageStartedAt: "not-a-date" }, [metric()], policy, "2026-08-11", supply)).toMatchObject({
      action: "hold",
      reason: "stage start timestamp is invalid",
      gates: { stageAgeDays: 0, stageStartValid: false },
    });
  });

  it("allows the one-per-day bootstrap stage to graduate after three clean deliveries", () => {
    const bootstrap = { ...state, currentStage: 1 as const };
    expect(evaluateRamp(bootstrap, [metric({ sent: 2 })], policy, "2026-08-11").reason).toContain("2/3");
    expect(evaluateRamp(bootstrap, [metric({ sent: 3 })], policy, "2026-08-11", supply)).toMatchObject({ action: "advance", targetStage: 3 });
  });

  it("holds fail-closed when eligible supply is missing or below the next-stage runway", () => {
    const bootstrap = { ...state, currentStage: 1 as const };
    expect(evaluateRamp(bootstrap, [metric({ sent: 3 })], policy, "2026-08-11").reason).toContain("supply evidence");
    expect(evaluateRamp(bootstrap, [metric({ sent: 3 })], policy, "2026-08-11", { queuedEligibleLeads: 8, minimumQueueDays: 3 })).toMatchObject({
      action: "hold",
      gates: { requiredQueuedLeads: 9, queuedEligibleLeads: 8, supplyPassed: false },
    });
  });

  it("produces deterministic daily idempotency keys", () => {
    const first = evaluateRamp(state, [metric()], policy, "2026-08-11");
    const second = evaluateRamp(state, [metric()], policy, "2026-08-11");
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
  });
});
