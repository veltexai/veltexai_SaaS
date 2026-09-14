// Single source of truth for client-side PROPOSAL DESIGN presentation.
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

export const EXECUTIVE_PREMIUM_DISPLAY_NAME = "Executive Premium";

export function isExecutivePremiumTrialTemplate(
  templateDisplayName?: string | null,
): boolean {
  return templateDisplayName === EXECUTIVE_PREMIUM_DISPLAY_NAME;
}

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
  trialEndAt?: string | null,
): SubscriptionTier {
  if (
    subscriptionStatus === "free_trial" &&
    trialEndAt &&
    new Date(trialEndAt).getTime() > Date.now()
  ) {
    return "free_trial";
  }
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
  templateDisplayName?: string | null,
): boolean {
  if (templateTiers.length === 0) return false;
  if (userTier === "free_trial") {
    return (
      templateTiers.includes("starter") ||
      isExecutivePremiumTrialTemplate(templateDisplayName)
    );
  }
  return templateTiers.includes(userTier);
}
