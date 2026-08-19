import { observationDatesThrough, rampReconciliationLookback, reconcileRampMetrics } from "../src/reconciliation";
import type { DailyRampMetrics, RampMetricsProvider } from "../src/types";

const providerMetrics = (campaignId: string, date: string): Omit<DailyRampMetrics, "spamComplaints" | "webhookFailures"> => ({
  campaignId, date, campaignStatus: 1, configuredDailyLimit: 3, sent: 1, bounced: 0,
  replies: 0, unsubscribes: 0, healthySendingAccounts: 2, minimumAccountHealth: 100,
});

describe("100F metrics reconciliation", () => {
  it("builds an inclusive, oldest-first UTC date window across month boundaries", () => {
    expect(observationDatesThrough("2026-09-02", 4)).toEqual(["2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"]);
  });

  it("uses a bounded seven-day default lookback", () => {
    expect(rampReconciliationLookback(undefined)).toBe(7);
    expect(rampReconciliationLookback("14")).toBe(14);
    expect(() => rampReconciliationLookback("15")).toThrow("1 through 14");
    expect(() => rampReconciliationLookback("0")).toThrow("1 through 14");
  });

  it("backfills every date and merges internal safety signals before evaluation", async () => {
    const collected: string[] = [];
    const stored: DailyRampMetrics[] = [];
    const provider: RampMetricsProvider = {
      collect: async (campaignId, date) => {
        collected.push(date);
        return providerMetrics(campaignId, date);
      },
    };
    const repository = {
      getInternalSignals: async (_campaignId: string, date: string) => ({ spamComplaints: date.endsWith("01") ? 1 : 0, webhookFailures: 0 }),
      upsertMetrics: async (metrics: DailyRampMetrics) => { stored.push(metrics); },
    };

    const result = await reconcileRampMetrics("pilot", "2026-09-02", 3, provider, repository);

    expect(collected).toEqual(["2026-08-31", "2026-09-01", "2026-09-02"]);
    expect(stored).toEqual(result);
    expect(stored[1]).toEqual(expect.objectContaining({ date: "2026-09-01", spamComplaints: 1, webhookFailures: 0 }));
  });
});
