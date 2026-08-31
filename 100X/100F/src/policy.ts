import { createHash } from "node:crypto";
import type { DailyRampMetrics, RampDecision, RampGateEvidence, RampPolicy, RampStage, RampState, RampSupplyEvidence } from "./types";

const DAY_MS = 86_400_000;

function decisionKey(campaignId: string, date: string, action: string, target: number): string {
  return createHash("sha256").update(`${campaignId}|${date}|${action}|${target}`).digest("hex");
}
function makeDecision(state: RampState, date: string, action: RampDecision["action"], targetStage: RampStage, reason: string, gates?: RampGateEvidence): RampDecision {
  return {
    action,
    currentStage: state.currentStage,
    targetStage,
    reason,
    observedAt: `${date}T12:00:00.000Z`,
    idempotencyKey: decisionKey(state.campaignId, date, action, targetStage),
    gates,
  };
}

export function evaluateRamp(state: RampState, metrics: DailyRampMetrics[], policy: RampPolicy, today: string, supply?: RampSupplyEvidence): RampDecision {
  const latestMetricDate = metrics[0]?.date ?? null;
  const current = metrics.find((m) => m.date === today);
  if (!current) {
    return makeDecision(state, today, "hold", state.currentStage, `fresh metrics for ${today} are unavailable`, {
      metricsAvailable: false,
      metricDate: latestMetricDate,
      metricFresh: false,
    });
  }

  const capacity = current.healthySendingAccounts * policy.perAccountDailyLimit;
  const stageStartMs = Date.parse(state.stageStartedAt);
  const stageStartValid = Number.isFinite(stageStartMs);
  const stageStartDate = stageStartValid ? new Date(stageStartMs).toISOString().slice(0, 10) : today;
  const stageMetrics = metrics.filter((metric) => metric.date >= stageStartDate && metric.date <= today);
  const sent = stageMetrics.reduce((sum, metric) => sum + metric.sent, 0);
  const bounced = stageMetrics.reduce((sum, metric) => sum + metric.bounced, 0);
  const delivered = Math.max(0, sent - bounced);
  const bounceRate = sent > 0 ? bounced / sent : 0;
  // The controller evaluates completed campaign-local calendar dates. Compare those dates,
  // rather than the time-of-day embedded in stage_started_at, so a noon audit timestamp does
  // not erase an otherwise completed dwell day. This remains conservative: the start date is
  // day zero and the gate still requires minimumDaysAtStage distinct date boundaries.
  const stageAgeDays = stageStartValid
    ? Math.max(0, Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${stageStartDate}T00:00:00Z`)) / DAY_MS))
    : 0;
  const requiredDelivered = Math.min(policy.minimumDeliveredAtStage, state.currentStage * policy.minimumDaysAtStage);
  const index = policy.stages.indexOf(state.currentStage);
  const next = policy.stages[index + 1];
  const requiredQueuedLeads = next === undefined ? 0 : next * Math.max(1, supply?.minimumQueueDays ?? 0);
  const gates: RampGateEvidence = {
    metricsAvailable: true,
    metricDate: current.date,
    metricFresh: true,
    campaignHealthy: current.campaignStatus >= 0,
    bounceRate,
    bouncePassed: bounceRate <= policy.maximumBounceRate,
    complaintsPassed: current.spamComplaints <= policy.maximumSpamComplaints,
    accountHealthPassed: current.minimumAccountHealth >= policy.minimumAccountHealth,
    healthyAccountPassed: current.healthySendingAccounts >= 1,
    webhookPassed: !policy.requireZeroWebhookFailures || current.webhookFailures === 0,
    stageAgeDays,
    stageStartValid,
    requiredStageDays: policy.minimumDaysAtStage,
    dwellPassed: stageAgeDays >= policy.minimumDaysAtStage,
    delivered,
    requiredDelivered,
    deliveredPassed: delivered >= requiredDelivered,
    healthyCapacity: capacity,
    nextStage: next ?? null,
    capacityPassed: next === undefined || next <= capacity,
    queuedEligibleLeads: supply?.queuedEligibleLeads,
    requiredQueuedLeads,
    queueDaysRequired: supply?.minimumQueueDays,
    supplyEvidenceAvailable: supply !== undefined,
    supplyPassed: next === undefined || (supply !== undefined && supply.queuedEligibleLeads >= requiredQueuedLeads),
  };

  const hardStop =
    current.campaignStatus < 0 ||
    current.spamComplaints > policy.maximumSpamComplaints ||
    bounceRate > policy.maximumBounceRate ||
    current.minimumAccountHealth < policy.minimumAccountHealth ||
    current.healthySendingAccounts < 1 ||
    (policy.requireZeroWebhookFailures && current.webhookFailures > 0);

  if (hardStop) {
    return makeDecision(state, today, "pause", state.currentStage,
      `safety threshold failed (bounce=${bounceRate.toFixed(4)}, complaints=${current.spamComplaints}, health=${current.minimumAccountHealth}, webhook_failures=${current.webhookFailures})`, gates);
  }

  if (!stageStartValid) {
    return makeDecision(state, today, "hold", state.currentStage, "stage start timestamp is invalid", gates);
  }
  if (stageStartDate > today) {
    return makeDecision(state, today, "hold", state.currentStage, `stage start ${stageStartDate} is after evaluation date ${today}`, gates);
  }

  if (state.lastDecisionDate === today) return makeDecision(state, today, "hold", state.currentStage, "a decision was already recorded today", gates);

  if (stageAgeDays < policy.minimumDaysAtStage) {
    return makeDecision(state, today, "hold", state.currentStage, `stage dwell time is ${stageAgeDays}/${policy.minimumDaysAtStage} days`, gates);
  }
  if (delivered < requiredDelivered) {
    return makeDecision(state, today, "hold", state.currentStage, `observed delivered volume is ${delivered}/${requiredDelivered}`, gates);
  }

  if (!next) return makeDecision(state, today, "hold", state.currentStage, "maximum approved stage reached", gates);
  if (next > capacity) return makeDecision(state, today, "hold", state.currentStage, `next stage ${next} exceeds healthy capacity ${capacity}`, gates);
  if (!supply) return makeDecision(state, today, "hold", state.currentStage, "eligible lead supply evidence is unavailable", gates);
  if (supply.queuedEligibleLeads < requiredQueuedLeads) {
    return makeDecision(state, today, "hold", state.currentStage, `eligible queue is ${supply.queuedEligibleLeads}/${requiredQueuedLeads} leads required for ${supply.minimumQueueDays} days at stage ${next}`, gates);
  }

  return makeDecision(state, today, "advance", next, `all safety gates passed; capacity=${capacity}; queued=${supply.queuedEligibleLeads}`, gates);
}
