import { SubscriptionTier } from "@/types/subscription";

export function getTierBadgeColor(tier: SubscriptionTier) {
  switch (tier) {
    case "starter":
      return "bg-sky-100 text-sky-800";
    case "professional":
      return "bg-blue-100 text-blue-800";
    case "enterprise":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
