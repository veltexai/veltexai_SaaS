import { SubscriptionTier } from "@/types/subscription";

export function canAccessTemplate(
    templateTiers: SubscriptionTier[],
    userTier: SubscriptionTier
  ): boolean {
    if (templateTiers.length === 0) return true; // No restrictions
    return templateTiers.includes(userTier);
  }