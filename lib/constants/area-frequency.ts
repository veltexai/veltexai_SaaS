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
  { value: "custom", label: "Custom" },
] as const;

export type AreaFrequencyValue =
  (typeof AREA_FREQUENCY_OPTIONS)[number]["value"];

export const ON_DEMAND_FREQUENCY: AreaFrequencyValue = "on_demand";

export function getAreaFrequencyLabel(value: string): string {
  return (
    AREA_FREQUENCY_OPTIONS.find((o) => o.value === value)?.label ?? value
  );
}

export function isOnDemandFrequency(value: string): boolean {
  return value === ON_DEMAND_FREQUENCY;
}
