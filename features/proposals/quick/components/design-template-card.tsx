"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Layout, Lock, Star } from "lucide-react";
import type { TemplateItem } from "@/features/proposals/types/proposal";
import type { SubscriptionTier } from "@/types/subscription";
import { cn } from "@/lib/utils/cn";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise",
  free_trial: "Trial",
};

/** Tier named on a locked card — the cheapest plan that unlocks the template. */
const TIER_ORDER: SubscriptionTier[] = [
  "starter",
  "professional",
  "enterprise",
];

function unlockingTierLabel(tiers: SubscriptionTier[]) {
  const cheapest = TIER_ORDER.find((tier) => tiers.includes(tier));
  return cheapest ? TIER_LABELS[cheapest] : "Paid plan";
}

interface DesignTemplateCardProps {
  template: TemplateItem;
  /** Local fallback art, used when the row has no preview_image_url. */
  fallbackImage?: string;
  isSelected: boolean;
  canAccess: boolean;
  isRecommended: boolean;
  onSelect: (templateId: string) => void;
  onLockedClick: () => void;
}

export function DesignTemplateCard({
  template,
  fallbackImage,
  isSelected,
  canAccess,
  isRecommended,
  onSelect,
  onLockedClick,
}: DesignTemplateCardProps) {
  // The preview PNGs may not be on disk yet, so fall back to the icon rather
  // than letting next/image render a broken frame.
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = template.preview_image_url || fallbackImage;
  const showImage = Boolean(imageSrc) && !imageFailed;

  const activate = () => (canAccess ? onSelect(template.id) : onLockedClick());

  return (
    <div className="relative">
      {/* Signature: a stacked "paper edge" behind the chosen card. */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-1.5 -right-1.5 top-1.5 left-1.5 rounded-xl bg-blue-600/15 transition-transform duration-200 ease-out motion-reduce:transition-none",
          isSelected ? "scale-100" : "scale-95 opacity-0",
        )}
      />

      <button
        type="button"
        onClick={activate}
        aria-pressed={canAccess ? isSelected : undefined}
        aria-haspopup={canAccess ? undefined : "dialog"}
        className={cn(
          "relative flex w-full flex-col overflow-hidden rounded-xl border bg-white text-left",
          "transition-[transform,box-shadow,border-color] duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
          "motion-reduce:transition-none motion-reduce:transform-none",
          isSelected
            ? "border-blue-600 shadow-lg shadow-blue-600/10"
            : "border-gray-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md",
        )}
      >
        <div className="relative aspect-[1/1.4] w-full overflow-hidden bg-gray-100">
          {showImage ? (
            <Image
              src={imageSrc as string}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className={cn(
                "object-cover object-top",
                !canAccess && "blur-[2px] brightness-95",
              )}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200",
                !canAccess && "blur-[2px] brightness-95",
              )}
            >
              <Layout className="h-10 w-10 text-gray-400" />
            </div>
          )}

          {isRecommended && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 py-1 pl-1.5 pr-2.5 text-[11px] font-semibold text-white shadow-sm">
              <Star className="h-3 w-3 fill-current" />
              Recommended
            </span>
          )}

          {isSelected && (
            <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 shadow-sm">
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            </span>
          )}

          {!canAccess && (
            <>
              <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-md">
                <Lock className="h-4 w-4 text-gray-700" />
              </span>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900/85 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white">
                {unlockingTierLabel(template.tiers)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2.5">
          <span
            className={cn(
              "text-sm font-semibold tracking-tight",
              canAccess ? "text-gray-900" : "text-gray-500",
            )}
          >
            {template.display_name}
          </span>
          {canAccess && !isSelected && (
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
              Included
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
