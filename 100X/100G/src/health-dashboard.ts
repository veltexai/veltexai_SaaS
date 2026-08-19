import type { SupabaseClient } from "@supabase/supabase-js";
import { decodeStoredResults } from "./supabase-repository";

const fail = (label: string, error: { message?: string } | null) => {
  if (error) throw new Error(`${label}: ${error.message ?? "database error"}`);
};

export async function read100XHealthDashboard(
  orchestrationDb: SupabaseClient,
  rampDb: SupabaseClient,
  campaignId: string,
  mutationExecutionEnabled: boolean,
  now = new Date(),
) {
  const [supplyResult, runResult, stateResult, metricsResult, decisionsResult] = await Promise.all([
    orchestrationDb.rpc("read_100g_supply_snapshot"),
    orchestrationDb.from("acquisition_orchestration_runs").select("run_date,mode,requested_leads,status,results,created_at").eq("mode", "execute").order("run_date", { ascending: false }).limit(7),
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
    requestedLeads: row.requested_leads,
    status: row.status,
    createdAt: row.created_at,
    ...decodeStoredResults(row.results),
  }));
  const latestMetric = metricsResult.data?.[0] ?? null;
  const stage = Number(stateResult.data?.current_stage ?? 1);
  const queued = Number(supplyResult.data?.queued_eligible_leads ?? 0);
  return {
    generatedAt: now.toISOString(),
    mutationExecutionEnabled,
    supply: {
      currentDailySendStage: stage,
      queuedEligibleLeads: queued,
      runwayDays: Number((queued / Math.max(1, stage)).toFixed(2)),
    },
    orchestration: { latest: runs[0] ?? null, recent: runs },
    ramp: {
      state: stateResult.data ?? null,
      latestMetric,
      recentMetrics: metricsResult.data ?? [],
      decisions: decisionsResult.data ?? [],
    },
  };
}
