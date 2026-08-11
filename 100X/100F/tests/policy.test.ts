import { evaluateRamp } from "../src/policy";
import type { DailyRampMetrics, RampPolicy, RampState } from "../src/types";

const policy: RampPolicy = {
  stages: [1, 10, 25, 50, 120, 250, 500],
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
describe("100F ramp policy", () => {
  it("advances exactly one stage when all gates pass", () => {
    expect(evaluateRamp(state, [metric()], policy, "2026-08-11")).toMatchObject({ action: "advance", targetStage: 25 });
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
    expect(evaluateRamp(state, [metric({ sent: 3 })], policy, "2026-08-11").reason).toContain("observed volume");
  });

  it("produces deterministic daily idempotency keys", () => {
    const first = evaluateRamp(state, [metric()], policy, "2026-08-11");
    const second = evaluateRamp(state, [metric()], policy, "2026-08-11");
    expect(first.idempotencyKey).toBe(second.idempotencyKey);
  });
});
