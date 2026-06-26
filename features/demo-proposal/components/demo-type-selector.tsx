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
import {
  COMMERCIAL_DEMO_CARD,
  RESIDENTIAL_DEMO_CARD,
  getDemoData,
} from "../constants";
import { getDemoAccent } from "../lib/demo-accent";

const DEMO_CARDS: DemoCardConfig[] = [
  COMMERCIAL_DEMO_CARD,
  RESIDENTIAL_DEMO_CARD,
];

function getCardSummary(type: DemoType): string {
  const data = getDemoData(type);
  const serviceLabel =
    type === "commercial" ? "Office janitorial" : "Home deep clean";
  return `${serviceLabel} · ${data.estimatedSize} · ${data.city}`;
}

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
        const accent = getDemoAccent(card.type);
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
                "h-full transition-all hover:shadow-md",
                isSelected ? accent.selectedCard : "hover:border-gray-300",
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      accent.iconBox,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  {isSelected && (
                    <span
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded-full text-white",
                        accent.checkCircle,
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{card.title}</CardTitle>
                <CardDescription>{card.subtitle}</CardDescription>
                <Badge variant="secondary" className={cn("w-fit", accent.typeBadge)}>
                  {card.badge}
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  {getCardSummary(card.type)}
                </p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
