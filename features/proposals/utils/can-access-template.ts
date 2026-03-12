import { SubscriptionTier } from "@/types/subscription";

const TIER_MAP: Partial<Record<SubscriptionTier, SubscriptionTier>> = {
  free_trial: "professional",
};

export function canAccessTemplate(
  templateTiers: SubscriptionTier[],
  userTier: SubscriptionTier,
): boolean {
  if (templateTiers.length === 0) return true;
  const effectiveTier = TIER_MAP[userTier] ?? userTier;
  return templateTiers.includes(effectiveTier);
}
