// Single source of truth for PROPOSAL DESIGN entitlement.
//
// Scope warning: `resolveDesignTier` maps a free trial onto the `professional`
// tier *for design access only*, because the trial design set (Basic +
// Executive Premium) happens to equal the professional rows in
// `template_tier_access`. A trial is NOT a professional subscription: quota,
// watermarking (`features/billing/utils/watermark.ts`) and every other
// entitlement must keep reading the raw plan. Nothing outside the design
// entitlement path may import from this module.
//
// Dependency-free apart from the tier type, so both the client pickers and the
// server route guard can share one rule.

import { SubscriptionTier } from "@/types/subscription";

/** Design-access tier for a free trial. Deliberately not exported. */
const FREE_TRIAL_DESIGN_TIER: SubscriptionTier = "professional";

/**
 * The tier a user's *design* access is evaluated against.
 *
 * A trial user has no `subscriptions` row (those are created by the Stripe
 * webhook) and `profiles.subscription_plan` defaults to `'starter'`, so the
 * plan column alone would silently downgrade them to Basic-only. The trial is
 * therefore identified by `subscription_status`, not by the plan.
 */
export function resolveDesignTier(
  subscriptionPlan?: string | null,
  subscriptionStatus?: string | null,
): SubscriptionTier {
  if (subscriptionStatus === "free_trial") return FREE_TRIAL_DESIGN_TIER;
  return (subscriptionPlan as SubscriptionTier) || "starter";
}

/**
 * Whether a design is available on a tier.
 *
 * Fails closed: a template with no `template_tier_access` rows is treated as
 * unassigned and stays locked until an admin grants it a tier.
 */
export function canAccessTemplate(
  templateTiers: SubscriptionTier[],
  userTier: SubscriptionTier,
): boolean {
  if (templateTiers.length === 0) return false;
  const effectiveTier =
    userTier === "free_trial" ? FREE_TRIAL_DESIGN_TIER : userTier;
  return templateTiers.includes(effectiveTier);
}
