/**
 * Commercial Quick Proposal factors relative to the existing 1x/week monthly
 * baseline. These are monetary adjustments, NEVER cleaning visit counts.
 * PricingEngine and other proposal flows do not use this policy.
 */
export const QUICK_COMMERCIAL_FREQUENCY_FACTORS = {
  weekly: 1.00,
  "2x-week": 1.35,
  "3x-week": 1.60,
  "4x-week": 1.85,
  "5x-week": 2.10,
  "6x-week": 2.30,
  daily: 2.50,
} as const;

/** Undefined for monthly, biweekly, one-time, and unsupported frequencies. */
export function getQuickCommercialFrequencyFactor(frequency: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(QUICK_COMMERCIAL_FREQUENCY_FACTORS, frequency)
    ? QUICK_COMMERCIAL_FREQUENCY_FACTORS[frequency as keyof typeof QUICK_COMMERCIAL_FREQUENCY_FACTORS]
    : undefined;
}
