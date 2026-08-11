import type { OrchestrationDependencies, OrchestrationRun, StageId, StageResult } from "./types";
import type { OrchestrationConfig } from "./config";

const ORDER: readonly StageId[] = ["100A", "100B", "100C"];

export async function run100G(config: OrchestrationConfig, deps: OrchestrationDependencies): Promise<OrchestrationRun> {
  const runDate = (deps.now?.() ?? new Date()).toISOString().slice(0, 10);
  const mode = config.executeStages ? "execute" : "dry_run";
  const existing = await deps.repository.findRun(runDate, mode);
  if (existing) return existing;

  const supply = await deps.repository.getSupplySnapshot();
  const desiredQueue = Math.min(config.maximumRequestedLeads, supply.currentDailySendStage * config.queueDays);
  const requestedLeads = Math.max(0, desiredQueue - supply.queuedEligibleLeads);
  const databaseBuildRequestedLeads = Math.max(requestedLeads, config.databaseBuildTarget);
  const results: StageResult[] = [];

  if (!config.enabled || !config.executeStages || databaseBuildRequestedLeads === 0) {
    const reason = !config.enabled ? "100G is disabled" : !config.executeStages ? "100G is in dry-run mode" : "eligible queue and database-build targets are satisfied";
    for (const stage of ORDER) results.push({ stage, status: "skipped", produced: 0, reason });
  } else {
    for (const stage of ORDER) {
      try {
        const stageRequestedLeads = stage === "100C" ? requestedLeads : databaseBuildRequestedLeads;
        const result = await deps.stages[stage].run({ runDate, requestedLeads: stageRequestedLeads });
        results.push(result);
        if (result.status === "failed") break;
      } catch (error) {
        results.push({ stage, status: "failed", produced: 0, reason: error instanceof Error ? error.message : "unknown stage failure" });
        break;
      }
    }
  }

  const run: OrchestrationRun = {
    runDate,
    mode,
    requestedLeads,
    results,
    status: results.some((result) => result.status === "failed") ? "failed" : "completed",
  };
  const inserted = await deps.repository.recordRun(run);
  return inserted ? run : (await deps.repository.findRun(runDate, mode)) ?? run;
}
