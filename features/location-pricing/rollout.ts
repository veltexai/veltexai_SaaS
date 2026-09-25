/**
 * Location pricing remains dormant unless a reviewed release explicitly enables it.
 * The public prefix is required because the estimate workbench also calculates in
 * the browser; no secret or customer data is stored in this flag.
 */
export function isLocationPricingRolloutEnabled() {
  return process.env.NEXT_PUBLIC_LOCATION_PRICING_ENABLED === 'true';
}
