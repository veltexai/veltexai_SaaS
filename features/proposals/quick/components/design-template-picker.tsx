"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { UpgradeModal } from "@/features/billing/components/upgrade-modal";
import { useProposalTemplates } from "@/features/proposals/hooks/use-proposal-templates";
import { canAccessTemplate } from "@/features/proposals/utils/can-access-template";
import { detectTemplateType } from "@/features/templates/utils/utils";
import type { TemplateType } from "@/features/templates/types/templates";
import type { SubscriptionTier } from "@/types/subscription";
import { DesignTemplateCard } from "./design-template-card";

/** Local art per template family, used until preview_image_url is populated. */
const PREVIEW_BY_TYPE: Record<TemplateType, string> = {
  basic: "/images/templates/previews/basic.png",
  executive_premium: "/images/templates/previews/executive-premium.png",
  modern_corporate: "/images/templates/previews/modern-corporate.png",
  luxury_elite: "/images/templates/previews/luxury-elite.png",
};

interface DesignTemplatePickerProps {
  userTier: SubscriptionTier;
  selectedTemplateId?: string;
  onSelectTemplate: (templateId: string, displayName: string) => void;
}

export function DesignTemplatePicker({
  userTier,
  selectedTemplateId,
  onSelectTemplate,
}: DesignTemplatePickerProps) {
  const { templates, isLoading, error } = useProposalTemplates();
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const cards = useMemo(() => {
    let recommendedTaken = false;

    return templates.map((template) => {
      const type = detectTemplateType(template);
      const isRecommended = !recommendedTaken && type === "executive_premium";
      if (isRecommended) recommendedTaken = true;

      return {
        template,
        fallbackImage: PREVIEW_BY_TYPE[type],
        canAccess: canAccessTemplate(template.tiers, userTier),
        isRecommended,
      };
    });
  }, [templates, userTier]);

  const lockedCount = cards.filter((card) => !card.canAccess).length;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-gray-900">
            Proposal design
          </h3>
          <p className="mt-0.5 text-sm text-gray-600">
            Pick the look your proposal is rendered in.
          </p>
        </div>
        {lockedCount > 0 && (
          <span className="shrink-0 text-xs font-medium text-gray-500">
            {lockedCount} locked
          </span>
        )}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading
            ? [0, 1, 2, 3].map((key) => (
                <div key={key} className="space-y-2">
                  <Skeleton className="aspect-[1/1.4] w-full rounded-xl" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ))
            : cards.map(
                ({ template, fallbackImage, canAccess, isRecommended }) => (
                  <DesignTemplateCard
                    key={template.id}
                    template={template}
                    fallbackImage={fallbackImage}
                    isSelected={selectedTemplateId === template.id}
                    canAccess={canAccess}
                    isRecommended={isRecommended}
                    onSelect={(id) =>
                      onSelectTemplate(id, template.display_name)
                    }
                    onLockedClick={() => setIsUpgradeOpen(true)}
                  />
                ),
              )}
        </div>
      )}

      <UpgradeModal open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen} />
    </section>
  );
}
