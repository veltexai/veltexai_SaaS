import { CalculatedPricing } from "../types/pricing";

export function isValidPricingData(
  pricing: unknown,
): pricing is CalculatedPricing {
  if (!pricing || typeof pricing !== "object") return false;
  const p = pricing as Partial<CalculatedPricing>;
  return (
    p.price_range?.low !== undefined &&
    p.price_range?.high !== undefined &&
    p.hours_estimate?.min !== undefined &&
    p.hours_estimate?.max !== undefined
  );
}
