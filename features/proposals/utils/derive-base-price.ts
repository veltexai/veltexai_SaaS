import { CalculatedPricing } from "../types/pricing";

export function deriveBasePrice(pricing: CalculatedPricing | null): number {
  if (!pricing) return 0;
  if (typeof pricing.total === "number") return pricing.total;
  if (typeof pricing.enhanced_total === "number") return pricing.enhanced_total;
  const { low, high } = pricing.price_range;
  return (low + high) / 2;
}
