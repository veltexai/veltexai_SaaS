import { SubscriptionTier } from "@/types/subscription";
import { canAccessTemplate, TemplateItem } from "@/features/proposals";

export function sortTemplatesByAccess(
  templates: TemplateItem[],
  userTier: SubscriptionTier,
): TemplateItem[] {
  return [...templates].sort((a, b) => {
    const aName = a.name ?? a.display_name;
    const bName = b.name ?? b.display_name;
    const aHasAccess = canAccessTemplate(a.tiers, userTier, aName);
    const bHasAccess = canAccessTemplate(b.tiers, userTier, bName);

    if (aHasAccess !== bHasAccess) return aHasAccess ? -1 : 1;

    const aOrder = a.sort_order ?? 0;
    const bOrder = b.sort_order ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;

    return (aName ?? "").localeCompare(bName ?? "");
  });
}
