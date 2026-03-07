import { CalculatedPricing } from "../types/pricing";

export const PRICING_DEFAULTS = {
  laborRate: 35.0,
  overheadPercentage: 15.0,
  marginPercentage: 25.0,
  priceRangeLowFactor: 0.9,
  priceRangeHighFactor: 1.1,
  sqFtPerLaborHour: 1000,
  windowsPerLaborHour: 10,
  serviceTypeRates: {
    residential: 0.15,
    commercial: 0.12,
    carpet: 0.25,
    window: 8.0,
    floor: 0.2,
  } as Record<string, number>,
  frequencyMultipliers: {
    one_time: 1.0,
    weekly: 0.9,
    bi_weekly: 0.95,
    monthly: 1.0,
    quarterly: 1.1,
  } as Record<string, number>,
} as const;

export const AREA_FREQUENCY_COST_FACTORS: Record<string, number> = {
  daily: 0.7,
  "6x_weekly": 0.73,
  "5x_weekly": 0.76,
  "4x_weekly": 0.8,
  "3x_weekly": 0.83,
  "2x_weekly": 0.87,
  "1x_weekly": 0.9,
  biweekly: 0.95,
  monthly: 1.0,
  quarterly: 1.1,
  on_demand: 1.0,
  custom: 1.0,
};
