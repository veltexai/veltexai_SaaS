import { SubscriptionTier } from "@/types/subscription";
import { canAccessTemplate, TemplateItem } from '@/features/proposals';

export function sortTemplatesByAccess(
    templates: TemplateItem[],
    userTier: SubscriptionTier
  ): TemplateItem[] {
    return [...templates].sort((a, b) => {
      const aHasAccess = canAccessTemplate(a.tiers, userTier);
      const bHasAccess = canAccessTemplate(b.tiers, userTier);
  
      if (aHasAccess !== bHasAccess) return aHasAccess ? -1 : 1;
  
      const aOrder = a.sort_order ?? 0;
      const bOrder = b.sort_order ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
  
      return a.display_name.localeCompare(b.display_name);
    });
  }