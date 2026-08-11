import { createHash } from "node:crypto";
import type { DailyRampMetrics, RampDecision, RampPolicy, RampStage, RampState } from "./types";

const DAY_MS = 86_400_000;

function decisionKey(campaignId: string, date: string, action: string, target: number): string {
  return createHash("sha256").update(`${campaignId}|${date}|${action}|${target}`).digest("hex");
}
function makeDecision(state: RampState, date: string, action: RampDecision["action"], targetStage: RampStage, reason: string): RampDecision {
  return {
    action,
    currentStage: state.currentStage,
    targetStage,
    reason,
    observedAt: `${date}T12:00:00.000Z`,
    idempotencyKey: decisionKey(state.campaignId, date, action, targetStage),
  };
}

export function evaluateRamp(state: RampState, metrics: DailyRampMetrics[], policy: RampPolicy, today: string): RampDecision {
  const current = metrics.find((m) => m.date === today) ?? metrics[0];
  if (!current) return makeDecision(state, today, "hold", state.currentStage, "no metrics available");

  const capacity = current.healthySendingAccounts * policy.perAccountDailyLimit;
  const sent = metrics.reduce((sum, metric) => sum + metric.sent, 0);
  const bounced = metrics.reduce((sum, metric) => sum + metric.bounced, 0);
  const bounceRate = sent > 0 ? bounced / sent : 0;

  const hardStop =
    current.campaignStatus < 0 ||
    current.spamComplaints > policy.maximumSpamComplaints ||
    bounceRate > policy.maximumBounceRate ||
    current.minimumAccountHealth < policy.minimumAccountHealth ||
    current.healthySendingAccounts < 1 ||
    (policy.requireZeroWebhookFailures && current.webhookFailures > 0);

  if (hardStop) {
    return makeDecision(state, today, "pause", state.currentStage,
      `safety threshold failed (bounce=${bounceRate.toFixed(4)}, complaints=${current.spamComplaints}, health=${current.minimumAccountHealth}, webhook_failures=${current.webhookFailures})`);
  }

  if (state.lastDecisionDate === today) return makeDecision(state, today, "hold", state.currentStage, "a decision was already recorded today");

  const stageAgeDays = Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(state.stageStartedAt)) / DAY_MS);
  if (stageAgeDays < policy.minimumDaysAtStage) {
    return makeDecision(state, today, "hold", state.currentStage, `stage dwell time is ${stageAgeDays}/${policy.minimumDaysAtStage} days`);
  }
  if (sent < policy.minimumDeliveredAtStage) {
    return makeDecision(state, today, "hold", state.currentStage, `observed volume is ${sent}/${policy.minimumDeliveredAtStage}`);
  }

  const index = policy.stages.indexOf(state.currentStage);
  const next = policy.stages[index + 1];
  if (!next) return makeDecision(state, today, "hold", state.currentStage, "maximum approved stage reached");
  if (next > capacity) return makeDecision(state, today, "hold", state.currentStage, `next stage ${next} exceeds healthy capacity ${capacity}`);

  return makeDecision(state, today, "advance", next, `all safety gates passed; capacity=${capacity}`);
}
