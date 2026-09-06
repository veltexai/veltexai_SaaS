import { isValidPricingData } from "../is-valid-pricing-data";

const completePricing = {
  price_range: { low: 900, high: 1100 },
  hours_estimate: { min: 12, max: 18 },
  assumptions: {
    labor_rate: 35,
    overhead_percentage: 15,
    margin_percentage: 25,
    production_rate: { min: 50, max: 100 },
  },
};

describe("isValidPricingData", () => {
  it("accepts complete pricing data consumed by the pricing editor", () => {
    expect(isValidPricingData(completePricing)).toBe(true);
  });

  it.each([null, undefined, {}, { total: 1000 }])(
    "rejects missing Quick Proposal pricing data: %p",
    (pricing) => {
      expect(isValidPricingData(pricing)).toBe(false);
    },
  );

  it("rejects partial legacy pricing that would crash the breakdown", () => {
    expect(
      isValidPricingData({
        price_range: completePricing.price_range,
        hours_estimate: completePricing.hours_estimate,
      }),
    ).toBe(false);
  });

  it("rejects non-finite numeric values", () => {
    expect(
      isValidPricingData({
        ...completePricing,
        price_range: { low: Number.NaN, high: 1100 },
      }),
    ).toBe(false);
  });
});
