"use client";

import { cn } from "@/lib/utils/cn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import type { ResidentialPackageType } from "../types/demo-proposal";
import { RESIDENTIAL_PACKAGES } from "../constants/residential-packages";

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {RESIDENTIAL_PACKAGES.map((pkg) => {
        const isSelected = selected === pkg.type;

        return (
          <button
            key={pkg.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(pkg.type)}
            className={cn(
              "text-left transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <Card
              className={cn(
                "h-full transition-all hover:shadow-md",
                isSelected
                  ? "ring-2 ring-emerald-600 border-emerald-200 bg-emerald-50/30"
                  : "hover:border-gray-300",
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{pkg.label}</CardTitle>
                  {isSelected && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white bg-emerald-600">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{pkg.subtitle}</p>
              </CardHeader>
              <CardContent className="pt-0 flex items-center justify-between gap-2">
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-800 w-fit text-xs"
                >
                  {pkg.badge}
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">
                  {pkg.priceSummary}
                </span>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
