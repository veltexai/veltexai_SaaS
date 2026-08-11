import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrchestrationMode, OrchestrationRepository, OrchestrationRun, SupplySnapshot } from "./types";

function assertNoError(error: { message?: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message ?? "database error"}`);
}

export class SupabaseOrchestrationRepository implements OrchestrationRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSupplySnapshot(): Promise<SupplySnapshot> {
    const { data, error } = await this.client.rpc("read_100g_supply_snapshot");
    assertNoError(error, "read 100G supply snapshot");
    const row = (data ?? {}) as Record<string, unknown>;
    return {
      currentDailySendStage: Number(row.current_daily_send_stage ?? 1),
      queuedEligibleLeads: Number(row.queued_eligible_leads ?? 0),
    };
  }

  async findRun(runDate: string, mode: OrchestrationMode): Promise<OrchestrationRun | null> {
    const { data, error } = await this.client.from("acquisition_orchestration_runs").select("run_date,mode,requested_leads,status,results").eq("run_date", runDate).eq("mode", mode).maybeSingle();
    assertNoError(error, "read 100G run");
    if (!data) return null;
    return { runDate: data.run_date, mode: data.mode, requestedLeads: data.requested_leads, status: data.status, results: data.results } as OrchestrationRun;
  }

  async recordRun(run: OrchestrationRun): Promise<boolean> {
    const { error } = await this.client.from("acquisition_orchestration_runs").insert({ run_date: run.runDate, mode: run.mode, requested_leads: run.requestedLeads, status: run.status, results: run.results });
    if (!error) return true;
    if (error.code === "23505") return false;
    assertNoError(error, "record 100G run");
    return false;
  }
}
