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

export function assessDashboardHealth(input: {
  now: Date;
  latestRun: { status: string; createdAt: string; alerts?: Array<{ severity: string; code: string; message: string }> } | null;
  latestMetric: { recorded_at?: string; metric_date?: string } | null;
  supplyStatus: "healthy" | "low" | "empty";
}) {
  const orchestrationAgeHours = ageHours(input.latestRun?.createdAt, input.now);
  const metricTimestamp = input.latestMetric?.recorded_at ?? (input.latestMetric?.metric_date ? `${input.latestMetric.metric_date}T23:59:59.000Z` : null);
  const metricAgeHours = ageHours(metricTimestamp, input.now);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (orchestrationAgeHours === null || orchestrationAgeHours > 36) blockers.push("orchestration evidence is missing or stale");
  if (metricAgeHours === null || metricAgeHours > 48) blockers.push("ramp metrics are missing or stale");
  if (input.latestRun?.status === "failed") blockers.push("latest orchestration run failed");
  if (input.supplyStatus === "empty") blockers.push("eligible lead supply is empty");
  if (input.supplyStatus === "low") warnings.push("eligible lead supply is low");
  for (const alert of input.latestRun?.alerts ?? []) {
    (alert.severity === "critical" ? blockers : warnings).push(`${alert.code}: ${alert.message}`);
  }
  return {
    status: blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "healthy",
    readyForAutomatedProgression: blockers.length === 0,
    orchestrationAgeHours,
    metricAgeHours,
    blockers,
    warnings,
  };
}

export async function read100XHealthDashboard(
  orchestrationDb: SupabaseClient,
  rampDb: SupabaseClient,
  campaignId: string,
  mutationExecutionEnabled: boolean,
  now = new Date(),
) {
  const [supplyResult, runResult, stateResult, metricsResult, decisionsResult] = await Promise.all([
    orchestrationDb.rpc("read_100g_supply_snapshot"),
    orchestrationDb.from("acquisition_orchestration_runs").select("run_date,mode,lane,requested_leads,status,results,created_at").eq("mode", "execute").order("created_at", { ascending: false }).limit(21),
    rampDb.from("ramp_controller_state").select("campaign_id,current_stage,stage_started_at,last_decision_date,paused_by_controller,updated_at").eq("campaign_id", campaignId).maybeSingle(),
    rampDb.from("ramp_daily_metrics").select("metric_date,campaign_status,configured_daily_limit,sent,bounced,replies,unsubscribes,spam_complaints,webhook_failures,healthy_sending_accounts,minimum_account_health,recorded_at").eq("campaign_id", campaignId).order("metric_date", { ascending: false }).limit(7),
    rampDb.from("ramp_decisions").select("action,current_stage,target_stage,reason,observed_at,metrics,created_at").eq("campaign_id", campaignId).order("observed_at", { ascending: false }).limit(7),
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
  const stage = Number(stateResult.data?.current_stage ?? 1);
  const queued = Number(supplyResult.data?.queued_eligible_leads ?? 0);
  const minimumAlertDays = 3;
  const runwayDays = Number((queued / Math.max(1, stage)).toFixed(2));
  const supplyStatus = queued === 0 ? "empty" : runwayDays < minimumAlertDays ? "low" : "healthy";
  // Sending readiness is anchored to the outbound lane. Slower discovery/enrichment
  // results remain visible without making a healthy outbound run appear stale or failed.
  const latestRun = runs.find((run) => run.lane === "outbound" || run.lane === "full") ?? null;
  const latestByLane = Object.fromEntries(["outbound", "discovery", "enrichment"].map((lane) => [lane, runs.find((run) => run.lane === lane) ?? null]));
  const health = assessDashboardHealth({ now, latestRun, latestMetric, supplyStatus });
  return {
    generatedAt: now.toISOString(),
    mutationExecutionEnabled,
    health,
    activeAlerts: Object.values(latestByLane).flatMap((run) => run?.alerts ?? []),
    supply: {
      currentDailySendStage: stage,
      queuedEligibleLeads: queued,
      runwayDays,
      status: supplyStatus,
    },
    orchestration: { latest: latestRun, latestByLane, recent: runs },
    ramp: {
      state: stateResult.data ?? null,
      latestMetric,
      recentMetrics: metricsResult.data ?? [],
      decisions: decisionsResult.data ?? [],
    },
  };
}
