import type { OrchestrationAlert, SupplyForecast, SupplySnapshot } from "./types";

export function forecastSupply(
  snapshot: SupplySnapshot,
  queueDays: number,
  maximumRequestedLeads: number,
  minimumAlertDays: number,
): SupplyForecast {
  const stage = Math.max(1, snapshot.currentDailySendStage);
  const queued = Math.max(0, snapshot.queuedEligibleLeads);
  const desiredQueue = Math.min(maximumRequestedLeads, stage * queueDays);
  const runwayDays = Number((queued / stage).toFixed(2));
  const status = queued === 0 ? "empty" : runwayDays < minimumAlertDays ? "low" : "healthy";
  return {
    currentDailySendStage: stage,
    queuedEligibleLeads: queued,
    desiredQueue,
    deficit: Math.max(0, desiredQueue - queued),
    runwayDays,
    minimumAlertDays,
    status,
  };
}

export function supplyAlerts(forecast: SupplyForecast): OrchestrationAlert[] {
  if (forecast.status === "empty") return [{
    code: "ELIGIBLE_SUPPLY_EMPTY",
    severity: "critical",
    message: `No eligible leads are queued; ${forecast.deficit} are required to restore the ${forecast.desiredQueue}-lead target.`,
  }];
  if (forecast.status === "low") return [{
    code: "ELIGIBLE_SUPPLY_LOW",
    severity: "warning",
    message: `Eligible lead runway is ${forecast.runwayDays} days, below the ${forecast.minimumAlertDays}-day alert threshold.`,
  }];
  return [];
}
