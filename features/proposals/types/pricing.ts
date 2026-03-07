export interface PriceRange {
  low: number;
  high: number;
}

export interface HoursEstimate {
  min: number;
  max: number;
}

export interface PricingAssumptions {
  labor_rate: number;
  overhead_percentage: number;
  margin_percentage: number;
  production_rate: { min: number; max: number };
}

export interface CalculatedPricing {
  price_range: PriceRange;
  hours_estimate: HoursEstimate;
  assumptions: PricingAssumptions;
  /** Legacy fields — kept for backward compat with existing DB rows */
  total?: number;
  enhanced_total?: number;
}

export interface AddonItem {
  id: string;
  label: string;
  rate: number;
  qty: number;
  subtotal: number;
  frequency: "monthly" | "quarterly" | "annual" | "one_time" | string;
  monthly_amount: number | null;
}
