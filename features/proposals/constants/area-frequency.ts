export const AREA_FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "6x_weekly", label: "6x Weekly" },
  { value: "5x_weekly", label: "5x Weekly" },
  { value: "4x_weekly", label: "4x Weekly" },
  { value: "3x_weekly", label: "3x Weekly" },
  { value: "2x_weekly", label: "2x Weekly" },
  { value: "1x_weekly", label: "1x Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "on_demand", label: "On-Demand" },
] as const;

export type AreaFrequencyValue =
  (typeof AREA_FREQUENCY_OPTIONS)[number]["value"];

/** Aligns with `global_inputs.service_frequency` / `serviceFrequencySchema` (+ UI-only `6x-week`). */
const GLOBAL_SERVICE_TO_AREA_FREQUENCY = {
  "one-time": "on_demand",
  "1x-month": "monthly",
  "bi-weekly": "biweekly",
  weekly: "1x_weekly",
  "2x-week": "2x_weekly",
  "3x-week": "3x_weekly",
  "5x-week": "5x_weekly",
  "6x-week": "6x_weekly",
  daily: "daily",
} as const satisfies Record<string, AreaFrequencyValue>;

const AREA_FREQUENCY_FALLBACK: AreaFrequencyValue = "1x_weekly";

export function globalServiceFrequencyToAreaFrequency(
  global: string | undefined | null,
): AreaFrequencyValue {
  if (global == null || global === "") return AREA_FREQUENCY_FALLBACK;
  const mapped =
    GLOBAL_SERVICE_TO_AREA_FREQUENCY[
      global as keyof typeof GLOBAL_SERVICE_TO_AREA_FREQUENCY
    ];
  return mapped ?? AREA_FREQUENCY_FALLBACK;
}

export const ON_DEMAND_FREQUENCY: AreaFrequencyValue = "on_demand";

export function getAreaFrequencyLabel(value: string): string {
  return AREA_FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function isOnDemandFrequency(value: string): boolean {
  return value === ON_DEMAND_FREQUENCY;
}
