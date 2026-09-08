import { resolvePricingLabels } from "../utils/pricing-labels";

const RECURRING_WORDING = /month|monthly|12 months/i;

describe("resolvePricingLabels", () => {
  it.each(["one-time", "one_time", "One Time", "ONE-TIME", "onetime"])(
    "drops every recurring label for %s",
    (frequency) => {
      const labels = resolvePricingLabels(frequency);

      expect(labels.agreementTerm).toBe("One-Time Service");
      expect(labels.totalLabel).toBe("Total One-Time Investment:");
      expect(labels.priceColumn).toBe("Price");

      // The whole point: nothing a one-time client reads may imply a
      // recurring commitment.
      expect(labels.priceColumn).not.toMatch(RECURRING_WORDING);
      expect(labels.totalLabel).not.toMatch(RECURRING_WORDING);
      expect(labels.agreementTerm).not.toMatch(RECURRING_WORDING);
    },
  );

  it.each([
    "bi-weekly",
    "weekly",
    "1x-month",
    "2x-week",
    "3x-week",
    "5x-week",
    "daily",
  ])("keeps the existing recurring labels for %s", (frequency) => {
    expect(resolvePricingLabels(frequency)).toEqual({
      priceColumn: "Price/month",
      totalLabel: "Total Monthly Investment:",
      agreementTerm: "12 Months",
    });
  });

  it.each([undefined, null, ""])(
    "falls back to recurring labels for %p so an unwired call site is unchanged",
    (frequency) => {
      expect(resolvePricingLabels(frequency)).toEqual({
        priceColumn: "Price/month",
        totalLabel: "Total Monthly Investment:",
        agreementTerm: "12 Months",
      });
    },
  );
});
