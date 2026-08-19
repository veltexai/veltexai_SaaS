import type { DailyRampMetrics, RampMetricsProvider, RampRepository } from "./types";

const DEFAULT_LOOKBACK_DAYS = 7;
const MAX_LOOKBACK_DAYS = 14;

export function rampReconciliationLookback(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_LOOKBACK_DAYS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_LOOKBACK_DAYS) {
    throw new Error(`100F reconciliation lookback must be an integer from 1 through ${MAX_LOOKBACK_DAYS}`);
  }
  return value;
}

export function observationDatesThrough(endDate: string, days: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("100F observation date must use YYYY-MM-DD");
  if (!Number.isInteger(days) || days < 1 || days > MAX_LOOKBACK_DAYS) {
    throw new Error(`100F observation window must contain 1 through ${MAX_LOOKBACK_DAYS} days`);
  }
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(end.getTime()) || end.toISOString().slice(0, 10) !== endDate) throw new Error("100F observation date is invalid");
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(date.getUTCDate() - (days - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

export async function reconcileRampMetrics(
  campaignId: string,
  endDate: string,
  days: number,
  provider: RampMetricsProvider,
  repository: Pick<Required<RampRepository>, "upsertMetrics" | "getInternalSignals">,
): Promise<DailyRampMetrics[]> {
  const reconciled: DailyRampMetrics[] = [];
  // Keep reads sequential to avoid a burst against the provider and database APIs.
  // The provider reuses its campaign/account snapshot within this run.
  for (const date of observationDatesThrough(endDate, days)) {
    const [providerMetrics, internal] = await Promise.all([
      provider.collect(campaignId, date),
      repository.getInternalSignals(campaignId, date),
    ]);
    const metrics = { ...providerMetrics, ...internal };
    await repository.upsertMetrics(metrics);
    reconciled.push(metrics);
  }
  return reconciled;
}
