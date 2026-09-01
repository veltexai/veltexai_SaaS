import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeStoredResults } from "./supabase-repository";

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message ?? "database error"}`);
};

const ageHours = (timestamp: string | null | undefined, now: Date): number | null => {
  if (!timestamp) return null;
  const elapsed = now.getTime() - Date.parse(timestamp);
  return Number.isFinite(elapsed) ? Number((Math.max(0, elapsed) / 3_600_000).toFixed(2)) : null;
};

export interface SenderExpansionTarget {
  weeklyTarget: number;
  sendDaysPerWeek: number;
  currentPerMailboxDailyLimit: number;
  newPerMailboxDailyLimit: number;
  resilienceBufferMailboxes: number;
  minimumQueueDays: number;
  targetQueueDays: number;
}

export const DEFAULT_SENDER_EXPANSION_TARGET: SenderExpansionTarget = {
  weeklyTarget: 2_500,
  sendDaysPerWeek: 5,
  currentPerMailboxDailyLimit: 25,
  newPerMailboxDailyLimit: 20,
  resilienceBufferMailboxes: 5,
  minimumQueueDays: 7,
  targetQueueDays: 14,
};

export interface DashboardOperationalAlert {
  code: string;
  severity: "warning" | "critical";
  message: string;
}

export function assessSenderExpansionReadiness(input: {
  healthySendingAccounts: number;
  queuedEligibleLeads: number;
  target?: SenderExpansionTarget;
}) {
  const target = input.target ?? DEFAULT_SENDER_EXPANSION_TARGET;
  const healthySendingAccounts = Math.max(0, Math.floor(input.healthySendingAccounts));
  const queuedEligibleLeads = Math.max(0, Math.floor(input.queuedEligibleLeads));
  const targetDailyVolume = Math.ceil(target.weeklyTarget / target.sendDaysPerWeek);
  const currentDailyCapacity = healthySendingAccounts * target.currentPerMailboxDailyLimit;
  const remainingDailyCapacity = Math.max(0, targetDailyVolume - currentDailyCapacity);
  const minimumAdditionalMailboxes = Math.ceil(remainingDailyCapacity / target.newPerMailboxDailyLimit);
  const recommendedAdditionalMailboxes = minimumAdditionalMailboxes === 0
    ? 0
    : minimumAdditionalMailboxes + target.resilienceBufferMailboxes;
  const minimumQueuedLeads = targetDailyVolume * target.minimumQueueDays;
  const targetQueuedLeads = targetDailyVolume * target.targetQueueDays;
  const eligibleLeadGap = Math.max(0, minimumQueuedLeads - queuedEligibleLeads);
  const reserveLeadGap = Math.max(0, targetQueuedLeads - queuedEligibleLeads);
  const blockers: string[] = [];
  if (minimumAdditionalMailboxes > 0) blockers.push(`${minimumAdditionalMailboxes} additional healthy mailbox equivalents are required`);
  if (eligibleLeadGap > 0) blockers.push(`${eligibleLeadGap} additional eligible leads are required for the ${target.minimumQueueDays}-day activation minimum`);
  return {
    weeklyTarget: target.weeklyTarget,
    targetDailyVolume,
    healthySendingAccounts,
    currentDailyCapacity,
    minimumAdditionalMailboxes,
    recommendedAdditionalMailboxes,
    queuedEligibleLeads,
    minimumQueuedLeads,
    targetQueuedLeads,
    eligibleLeadGap,
    reserveLeadGap,
    readyForTargetVolume: blockers.length === 0,
    blockers,
  };
}

export function assessDashboardHealth(input: {
  now: Date;
  latestRun: { status: string; createdAt: string; alerts?: Array<{ severity: string; code: string; message: string }> } | null;
  latestMetric: {
    recorded_at?: string;
    metric_date?: string;
    campaign_status?: number;
    sent?: number;
    bounced?: number;
    spam_complaints?: number;
    webhook_failures?: number;
    healthy_sending_accounts?: number;
    minimum_account_health?: number;
  } | null;
  latestDecision?: { observed_at?: string; created_at?: string } | null;
  auditEvidence: {
    available: boolean;
    migrationsComplete: boolean;
    receiptCount?: number;
    suppressingEventCount?: number;
    matchedSuppressionCount?: number;
    ingestionErrorCount?: number;
    heldUnmatchedCount?: number;
  };
  supplyStatus: "healthy" | "low" | "empty";
  minimumAccountHealth?: number;
  maximumBounceRate?: number;
}) {
  const orchestrationAgeHours = ageHours(input.latestRun?.createdAt, input.now);
  const metricTimestamp = input.latestMetric?.recorded_at ?? (input.latestMetric?.metric_date ? `${input.latestMetric.metric_date}T23:59:59.000Z` : null);
  const metricAgeHours = ageHours(metricTimestamp, input.now);
  const decisionAgeHours = ageHours(input.latestDecision?.observed_at ?? input.latestDecision?.created_at, input.now);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const alerts: DashboardOperationalAlert[] = [];
  const critical = (code: string, message: string) => { alerts.push({ code, severity: "critical", message }); blockers.push(message); };
  const warning = (code: string, message: string) => { alerts.push({ code, severity: "warning", message }); warnings.push(message); };
  const minimumAccountHealth = input.minimumAccountHealth ?? 95;
  const maximumBounceRate = input.maximumBounceRate ?? 0.02;
  const sent = input.latestMetric?.sent ?? 0;
  const bounced = input.latestMetric?.bounced ?? 0;
  const bounceRate = sent > 0 ? bounced / sent : 0;

  if (orchestrationAgeHours === null || orchestrationAgeHours > 36) critical("ORCHESTRATION_EVIDENCE_STALE", "orchestration evidence is missing or stale");
  if (metricAgeHours === null || metricAgeHours > 48) critical("RAMP_METRICS_STALE", "ramp metrics are missing or stale");
  if (decisionAgeHours === null || decisionAgeHours > 48) critical("MUTATION_DECISION_STALE", "mutation decision evidence is missing or stale");
  if (!input.auditEvidence.available) critical("AUDIT_EVIDENCE_UNAVAILABLE", "receipt and suppression audit evidence is unavailable");
  if (input.auditEvidence.available && !input.auditEvidence.migrationsComplete) critical("AUDIT_MIGRATIONS_INCOMPLETE", "required receipt and suppression migrations are incomplete");
  if (input.auditEvidence.available && (input.auditEvidence.ingestionErrorCount ?? 0) > 0) critical("WEBHOOK_INGESTION_ERROR", "outbound webhook ingestion errors are present");
  if (input.auditEvidence.available && sent > 0 && (input.auditEvidence.receiptCount ?? 0) === 0) critical("OUTBOUND_RECEIPT_MISSING", "sent activity has no matching outbound event receipts");
  if (input.auditEvidence.available && (input.auditEvidence.suppressingEventCount ?? 0) > (input.auditEvidence.matchedSuppressionCount ?? 0)) critical("SUPPRESSION_PARITY_FAILURE", "a suppressing event is missing its durable suppression record");
  if (input.auditEvidence.available && (input.auditEvidence.heldUnmatchedCount ?? 0) > 0) warning("UNMATCHED_EVENTS_HELD", "unmatched outbound events require reconciliation");
  if (input.latestRun?.status === "failed") critical("ORCHESTRATION_RUN_FAILED", "latest orchestration run failed");
  if ((input.latestMetric?.campaign_status ?? 0) < 0) critical("CAMPAIGN_UNHEALTHY", "campaign status is unhealthy");
  if ((input.latestMetric?.spam_complaints ?? 0) > 0) critical("SPAM_COMPLAINT_DETECTED", "spam complaints are present");
  if ((input.latestMetric?.webhook_failures ?? 0) > 0) critical("WEBHOOK_FAILURE_DETECTED", "ramp metrics report webhook failures");
  if (sent > 0 && bounceRate > maximumBounceRate) critical("BOUNCE_RATE_EXCEEDED", `bounce rate ${(bounceRate * 100).toFixed(2)}% exceeds ${(maximumBounceRate * 100).toFixed(2)}%`);
  if (input.latestMetric?.healthy_sending_accounts !== undefined && input.latestMetric.healthy_sending_accounts < 1) critical("NO_HEALTHY_SENDING_ACCOUNT", "no healthy sending account is available");
  if (input.latestMetric?.minimum_account_health !== undefined && input.latestMetric.minimum_account_health < minimumAccountHealth) critical("MAILBOX_HEALTH_BELOW_THRESHOLD", `minimum mailbox health is below ${minimumAccountHealth}`);
  if (input.supplyStatus === "empty") critical("ELIGIBLE_SUPPLY_EMPTY", "eligible lead supply is empty");
  if (input.supplyStatus === "low") warning("ELIGIBLE_SUPPLY_LOW", "eligible lead supply is low");
  for (const alert of input.latestRun?.alerts ?? []) {
    const message = `${alert.code}: ${alert.message}`;
    (alert.severity === "critical" ? critical : warning)(alert.code, message);
  }
  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "healthy",
    readyForAutomatedProgression: blockers.length === 0,
    orchestrationAgeHours,
    metricAgeHours,
    decisionAgeHours,
    blockers,
    warnings,
    alerts,
  };
}

export async function read100XHealthDashboard(
  orchestrationDb: SupabaseClient,
  rampDb: SupabaseClient,
  campaignId: string,
  mutationExecutionEnabled: boolean,
  now = new Date(),
  senderExpansionTarget = DEFAULT_SENDER_EXPANSION_TARGET,
) {
  const auditSince = new Date(now.getTime() - 48 * 3_600_000).toISOString();
  const [supplyResult, runResult, stateResult, metricsResult, decisionsResult, auditResult] = await Promise.all([
    orchestrationDb.rpc("read_100g_supply_snapshot"),
    orchestrationDb.from("acquisition_orchestration_runs").select("run_date,mode,lane,requested_leads,status,results,created_at").eq("mode", "execute").order("created_at", { ascending: false }).limit(21),
    rampDb.from("ramp_controller_state").select("campaign_id,current_stage,stage_started_at,last_decision_date,paused_by_controller,updated_at").eq("campaign_id", campaignId).maybeSingle(),
    rampDb.from("ramp_daily_metrics").select("metric_date,campaign_status,configured_daily_limit,sent,bounced,replies,unsubscribes,spam_complaints,webhook_failures,healthy_sending_accounts,minimum_account_health,recorded_at").eq("campaign_id", campaignId).order("metric_date", { ascending: false }).limit(7),
    rampDb.from("ramp_decisions").select("action,current_stage,target_stage,reason,observed_at,metrics,created_at").eq("campaign_id", campaignId).order("observed_at", { ascending: false }).limit(7),
    rampDb.rpc("read_100f_audit_health", { requested_campaign_id: campaignId, requested_since: auditSince }),
  ]);
  fail("read supply dashboard", supplyResult.error);
  fail("read orchestration dashboard", runResult.error);
  fail("read ramp state dashboard", stateResult.error);
  fail("read ramp metrics dashboard", metricsResult.error);
  fail("read mutation audit dashboard", decisionsResult.error);

  const runs = (runResult.data ?? []).map((row) => ({
    runDate: row.run_date,
    mode: row.mode,
    lane: row.lane,
    requestedLeads: row.requested_leads,
    status: row.status,
    createdAt: row.created_at,
    ...decodeStoredResults(row.results),
  }));
  const latestMetric = metricsResult.data?.[0] ?? null;
  const latestDecision = decisionsResult.data?.[0] ?? null;
  const stage = Number(stateResult.data?.current_stage ?? 1);
  const queued = Number(supplyResult.data?.queued_eligible_leads ?? 0);
  const minimumAlertDays = 3;
  const runwayDays = Number((queued / Math.max(1, stage)).toFixed(2));
  const supplyStatus = queued === 0 ? "empty" : runwayDays < minimumAlertDays ? "low" : "healthy";
  // Sending readiness is anchored to the outbound lane. Slower discovery/enrichment
  // results remain visible without making a healthy outbound run appear stale or failed.
  const latestRun = runs.find((run) => run.lane === "outbound" || run.lane === "full") ?? null;
  const latestByLane = Object.fromEntries(["outbound", "discovery", "enrichment"].map((lane) => [lane, runs.find((run) => run.lane === lane) ?? null]));
  const activeAlerts = Object.values(latestByLane).flatMap((run) => run?.alerts ?? []);
  const auditRow = auditResult.error || !auditResult.data ? null : auditResult.data as Record<string, unknown>;
  const auditEvidence = {
    available: auditRow !== null,
    migrationsComplete: auditRow?.migrations_complete === true,
    receiptCount: Number(auditRow?.receipt_count ?? 0),
    suppressingEventCount: Number(auditRow?.suppressing_event_count ?? 0),
    matchedSuppressionCount: Number(auditRow?.matched_suppression_count ?? 0),
    ingestionErrorCount: Number(auditRow?.ingestion_error_count ?? 0),
    heldUnmatchedCount: Number(auditRow?.held_unmatched_count ?? 0),
  };
  const healthRun = latestRun ? { ...latestRun, alerts: activeAlerts } : null;
  const health = assessDashboardHealth({ now, latestRun: healthRun, latestMetric, latestDecision, auditEvidence, supplyStatus });
  const senderExpansion = assessSenderExpansionReadiness({
    healthySendingAccounts: Number(latestMetric?.healthy_sending_accounts ?? 0),
    queuedEligibleLeads: queued,
    target: senderExpansionTarget,
  });
  return {
    generatedAt: now.toISOString(),
    mutationExecutionEnabled,
    health,
    activeAlerts,
    evidence: auditRow ?? {
      migrations_complete: false,
      diagnostic: auditResult.error?.message ?? "audit evidence unavailable",
    },
    supply: {
      currentDailySendStage: stage,
      queuedEligibleLeads: queued,
      runwayDays,
      status: supplyStatus,
    },
    senderExpansion,
    orchestration: { latest: latestRun, latestByLane, recent: runs },
    ramp: {
      state: stateResult.data ?? null,
      latestMetric,
      recentMetrics: metricsResult.data ?? [],
      decisions: decisionsResult.data ?? [],
    },
  };
}
