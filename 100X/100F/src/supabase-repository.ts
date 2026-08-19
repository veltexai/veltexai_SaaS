import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyRampMetrics, RampDecision, RampRepository, RampStage, RampState } from "./types";

export class SupabaseRampRepository implements RampRepository {
  constructor(private readonly client: SupabaseClient) {}
  async getState(campaignId: string): Promise<RampState> {
    const result = await this.client.from("ramp_controller_state").select("*").eq("campaign_id", campaignId).maybeSingle();
    if (result.error) throw new Error(`100F state read failed: ${result.error.message}`);
    let row = result.data;
    if (!row) {
      const created = await this.client.from("ramp_controller_state").insert({ campaign_id: campaignId }).select("*").single();
      if (created.error) throw new Error(`100F state initialization failed: ${created.error.message}`);
      row = created.data;
    }
    return { campaignId: row.campaign_id, currentStage: row.current_stage as RampStage, stageStartedAt: row.stage_started_at, lastDecisionDate: row.last_decision_date, pausedByController: row.paused_by_controller };
  }
  async getMetrics(campaignId: string, days: number): Promise<DailyRampMetrics[]> {
    const result = await this.client.from("ramp_daily_metrics").select("*").eq("campaign_id", campaignId).order("metric_date", { ascending: false }).limit(days);
    if (result.error) throw new Error(`100F metrics read failed: ${result.error.message}`);
    return (result.data ?? []).map((r) => ({ date: r.metric_date, campaignId: r.campaign_id, campaignStatus: r.campaign_status, configuredDailyLimit: r.configured_daily_limit, sent: r.sent, bounced: r.bounced, replies: r.replies, unsubscribes: r.unsubscribes, spamComplaints: r.spam_complaints, webhookFailures: r.webhook_failures, healthySendingAccounts: r.healthy_sending_accounts, minimumAccountHealth: Number(r.minimum_account_health) }));
  }
  async recordDecision(campaignId: string, decision: RampDecision, metrics: DailyRampMetrics[]): Promise<boolean> {
    const result = await this.client.from("ramp_decisions").insert({ idempotency_key: decision.idempotencyKey, campaign_id: campaignId, action: decision.action, current_stage: decision.currentStage, target_stage: decision.targetStage, reason: decision.reason, observed_at: decision.observedAt, metrics: { observations: metrics, gates: decision.gates ?? null } });
    if (!result.error) return true;
    if (result.error.code === "23505") return false;
    throw new Error(`100F decision write failed: ${result.error.message}`);
  }
  async updateState(campaignId: string, decision: RampDecision): Promise<void> {
    const changes: Record<string, unknown> = { last_decision_date: decision.observedAt.slice(0, 10), updated_at: decision.observedAt };
    if (decision.action === "advance") Object.assign(changes, { current_stage: decision.targetStage, stage_started_at: decision.observedAt });
    if (decision.action === "pause") changes.paused_by_controller = true;
    const result = await this.client.from("ramp_controller_state").update(changes).eq("campaign_id", campaignId);
    if (result.error) throw new Error(`100F state update failed: ${result.error.message}`);
  }
  async upsertMetrics(metrics: DailyRampMetrics): Promise<void> {
    const result = await this.client.from("ramp_daily_metrics").upsert({ campaign_id: metrics.campaignId, metric_date: metrics.date, campaign_status: metrics.campaignStatus, configured_daily_limit: metrics.configuredDailyLimit, sent: metrics.sent, bounced: metrics.bounced, replies: metrics.replies, unsubscribes: metrics.unsubscribes, spam_complaints: metrics.spamComplaints, webhook_failures: metrics.webhookFailures, healthy_sending_accounts: metrics.healthySendingAccounts, minimum_account_health: metrics.minimumAccountHealth }, { onConflict: "campaign_id,metric_date" });
    if (result.error) throw new Error(`100F metrics write failed: ${result.error.message}`);
  }
  async getInternalSignals(campaignId: string, date: string): Promise<{ spamComplaints: number; webhookFailures: number }> {
    const result = await this.client.rpc("read_100f_internal_signals", { requested_campaign_id: campaignId, requested_date: date });
    if (result.error) throw new Error(`100F internal signal read failed: ${result.error.message}`);
    return { spamComplaints: Number(result.data?.spam_complaints ?? 0), webhookFailures: Number(result.data?.webhook_failures ?? 0) };
  }
}
