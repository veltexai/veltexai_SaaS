"use client";

import { cn } from "@/lib/utils/cn";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Home, Check } from "lucide-react";
import type { DemoCardConfig, DemoType } from "../types/demo-proposal";
import { COMMERCIAL_DEMO_CARD, RESIDENTIAL_DEMO_CARD } from "../constants";

const DEMO_CARDS: DemoCardConfig[] = [
  COMMERCIAL_DEMO_CARD,
  RESIDENTIAL_DEMO_CARD,
];

interface DemoTypeSelectorProps {
  selected: DemoType;
  onSelect: (type: DemoType) => void;
  disabled?: boolean;
}

export function DemoTypeSelector({
  selected,
  onSelect,
  disabled = false,
}: DemoTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {DEMO_CARDS.map((card) => {
        const isSelected = selected === card.type;
        const Icon = card.type === "commercial" ? Building2 : Home;

        return (
          <button
            key={card.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(card.type)}
            className={cn(
              "text-left transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <Card
              className={cn(
                "h-full cursor-pointer transition-all hover:shadow-md",
                isSelected
                  ? card.type === "commercial"
                    ? "ring-2 ring-blue-600 border-blue-200 bg-blue-50/30"
                    : "ring-2 ring-emerald-600 border-emerald-200 bg-emerald-50/30"
                  : "hover:border-gray-300",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      card.type === "commercial"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && (
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-white",
                        card.type === "commercial"
                          ? "bg-blue-600"
                          : "bg-emerald-600",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.subtitle}</CardDescription>
                <Badge
                  variant="secondary"
                  className={cn(
                    "w-fit",
                    card.type === "commercial"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-emerald-100 text-emerald-800",
                  )}
                >
                  {card.badge}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {card.type === "commercial"
                    ? "Office janitorial · 12,000 sq. ft. · Seattle, WA"
                    : "Home deep clean · 2,800 sq. ft. · Tacoma, WA"}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
