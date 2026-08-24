import type { OrchestrationDependencies, OrchestrationRun, StageId, StageResult } from "./types";
import type { OrchestrationConfig } from "./config";
import { forecastSupply, supplyAlerts } from "./supply-forecast";

const ORDER: readonly StageId[] = ["100A", "100B", "100C"];

export async function run100G(config: OrchestrationConfig, deps: OrchestrationDependencies): Promise<OrchestrationRun> {
  const runDate = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const mode = config.executeStages ? "execute" : "dry_run";
  const existing = await deps.repository.findRun(runDate, mode);
  // A completed run is terminal for its date and mode. A failed run is deliberately retriable:
  // provider/stage locks can outlive an interrupted serverless request, and retrying after the
  // lock expires is safe because each downstream workflow retains its own idempotency guards.
  if (existing?.status === "completed") return existing;

  const supply = await deps.repository.getSupplySnapshot();
  const forecast = forecastSupply(supply, config.queueDays, config.maximumRequestedLeads, config.minimumQueueDaysForAlert);
  const requestedLeads = forecast.deficit;
  const databaseBuildRequestedLeads = Math.max(requestedLeads, config.databaseBuildTarget);
  // Acquisition demand and campaign-sync demand answer different questions. A healthy
  // database can have a zero replenishment deficit while the active campaign still needs
  // its audited daily allotment. Keep 100C bounded by the controller stage and let its own
  // eligibility, suppression, daily, total, and provider caps reduce the actual writes.
  const outboundSyncRequestedLeads = forecast.currentDailySendStage;
  const results: StageResult[] = [];
  const alerts = supplyAlerts(forecast);

  if (!config.enabled || !config.executeStages || (databaseBuildRequestedLeads === 0 && outboundSyncRequestedLeads === 0)) {
    const reason = !config.enabled ? "100G is disabled" : !config.executeStages ? "100G is in dry-run mode" : "database-build and outbound-sync targets are satisfied";
    for (const stage of ORDER) results.push({ stage, status: "skipped", produced: 0, reason });
  } else {
    for (const stage of ORDER) {
      try {
        const stageRequestedLeads = stage === "100C" ? outboundSyncRequestedLeads : databaseBuildRequestedLeads;
        if (stage !== "100C" && stageRequestedLeads === 0) {
          results.push({ stage, status: "skipped", produced: 0, reason: "eligible queue and database-build targets are satisfied" });
          continue;
        }
        const result = await deps.stages[stage].run({
          runDate,
          requestedLeads: stageRequestedLeads,
          currentDailySendStage: supply.currentDailySendStage,
        });
        results.push(result);
        if (stage === "100B" && result.status === "completed" && result.produced === 0 && stageRequestedLeads > 0) {
          alerts.push({ code: "ENRICHMENT_ZERO_YIELD", severity: "warning", message: "100B produced zero outreach-ready contacts; inspect aggregate enrichment evidence before increasing acquisition volume." });
        }
        if (result.status === "failed") break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown stage failure";
        results.push({ stage, status: "failed", produced: 0, reason });
        alerts.push({ code: "STAGE_FAILED", severity: "critical", message: `${stage} failed: ${reason}` });
        break;
      }
    }
  }

  const run: OrchestrationRun = {
    runDate,
    mode,
    requestedLeads,
    results,
    supply: forecast,
    alerts,
    status: results.some((result) => result.status === "failed") ? "failed" : "completed",
  };
  const inserted = await deps.repository.recordRun(run);
  return inserted ? run : (await deps.repository.findRun(runDate, mode)) ?? run;
}
