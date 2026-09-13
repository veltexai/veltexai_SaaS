import { getQuickCommercialFrequencyFactor } from "@/lib/utils/commercial-frequency-pricing";

describe("Commercial Quick monthly frequency policy", () => {
  it.each([
    ["weekly", 1.00], ["2x-week", 1.35], ["3x-week", 1.60],
    ["4x-week", 1.85], ["5x-week", 2.10], ["6x-week", 2.30], ["daily", 2.50],
  ])("uses Anthony's approved factor for %s", (frequency, expected) => {
    expect(getQuickCommercialFrequencyFactor(String(frequency))).toBe(expected);
  });

  it.each(["one-time", "1x-month", "bi-weekly", "unknown", "toString"])(
    "leaves %s outside the weekly factor policy", frequency => {
      expect(getQuickCommercialFrequencyFactor(frequency)).toBeUndefined();
    },
  );
});
