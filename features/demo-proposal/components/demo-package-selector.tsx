"use client";

import type { LucideIcon } from "lucide-react";
import { Award, Repeat, SprayCan, Truck } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ResidentialPackageType } from "../types/demo-proposal";
import { RESIDENTIAL_PACKAGES } from "../constants/residential-packages";

const PACKAGE_ICONS: Record<ResidentialPackageType, LucideIcon> = {
  recurring: Repeat,
  "deep-clean": SprayCan,
  "move-in-out": Truck,
  "premium-detail": Award,
};

interface DemoPackageSelectorProps {
  selected: ResidentialPackageType;
  onSelect: (pkg: ResidentialPackageType) => void;
  disabled?: boolean;
}

export function DemoPackageSelector({
  selected,
  onSelect,
  disabled = false,
}: DemoPackageSelectorProps) {
  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {RESIDENTIAL_PACKAGES.map((pkg) => {
        const isSelected = selected === pkg.type;
        const Icon = PACKAGE_ICONS[pkg.type];

        return (
          <button
            key={pkg.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(pkg.type)}
            aria-pressed={isSelected}
            className={cn(
              "relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-demo-surface p-6 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-demo-secondary focus-visible:ring-offset-2",
              isSelected
                ? "border-demo-secondary shadow-lg ring-1 ring-demo-secondary/20"
                : "border-demo-outline-variant hover:border-demo-secondary",
              !disabled && "hover:shadow-lg",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="absolute right-0 top-0 rounded-bl-lg bg-demo-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-demo-on-secondary">
              {pkg.badge}
            </span>

            <Icon className="mb-4 size-6 text-demo-secondary" />

            <h4 className="mb-2 text-demo-label-md font-bold text-demo-on-surface">
              {pkg.label}
            </h4>
            <p className="mb-4 flex-grow text-demo-body-sm text-demo-on-surface-variant">
              {pkg.subtitle}
            </p>
            <div className="text-demo-body-md font-bold text-demo-on-surface">
              {pkg.priceSummary}
            </div>
          </button>
        );
      })}
    </div>
  );
}
