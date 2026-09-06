import { CalculatedPricing } from "../types/pricing";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidPricingData(
  pricing: unknown,
): pricing is CalculatedPricing {
  if (!pricing || typeof pricing !== "object") return false;
  const p = pricing as Partial<CalculatedPricing>;

  return (
    isFiniteNumber(p.price_range?.low) &&
    isFiniteNumber(p.price_range?.high) &&
    isFiniteNumber(p.hours_estimate?.min) &&
    isFiniteNumber(p.hours_estimate?.max) &&
    isFiniteNumber(p.assumptions?.labor_rate) &&
    isFiniteNumber(p.assumptions?.overhead_percentage) &&
    isFiniteNumber(p.assumptions?.margin_percentage) &&
    isFiniteNumber(p.assumptions?.production_rate?.min) &&
    isFiniteNumber(p.assumptions?.production_rate?.max)
  );
}
