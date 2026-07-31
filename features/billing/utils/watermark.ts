/**
 * Plans whose proposals render without the Veltex footer logo.
 * Starter keeps the watermark (see PRICE_ITEMS in features/home/constants/price.ts).
 */
const HIDDEN_FOR_PLANS = new Set(["free_trial", "professional", "enterprise"]);

/**
 * Decides whether the Veltex footer logo is shown on a proposal.
 *
 * `plan` is the `subscription_plan` returned by the `get_user_usage_info` RPC,
 * which already resolves free-trial vs. the active `subscriptions.plan` row.
 * Unknown, missing and "none" plans keep the logo (fail-safe).
 */
export function shouldShowPoweredBy(plan?: string | null): boolean {
  if (!plan) return true;
  return !HIDDEN_FOR_PLANS.has(plan);
}
