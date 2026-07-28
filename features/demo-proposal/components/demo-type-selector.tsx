"use client";

import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Building2, Home } from "lucide-react";
import type { DemoCardConfig, DemoType } from "../types/demo-proposal";
import {
  COMMERCIAL_DEMO_CARD,
  RESIDENTIAL_DEMO_CARD,
  getDemoData,
} from "../constants";
import { getDemoStitchAccent } from "../lib/demo-accent";

const DEMO_CARDS: DemoCardConfig[] = [
  COMMERCIAL_DEMO_CARD,
  RESIDENTIAL_DEMO_CARD,
];

const CARD_IMAGES: Record<DemoType, { src: string; alt: string }> = {
  commercial: {
    src: "/images/commercial-demo.jpg",
    alt: "Bright multi-storey commercial office atrium",
  },
  residential: {
    src: "/images/residential-demo.jpg",
    alt: "Cleaning team working in a modern home interior",
  },
};

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
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      {DEMO_CARDS.map((card) => {
        const isSelected = selected === card.type;
        const accent = getDemoStitchAccent(card.type);
        const Icon = card.type === "commercial" ? Building2 : Home;
        const image = CARD_IMAGES[card.type];

        return (
          <button
            key={card.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(card.type)}
            aria-pressed={isSelected}
            className={cn(
              "group flex cursor-pointer flex-col items-center rounded-3xl border bg-demo-surface p-8 text-center transition-all duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              accent.focusRing,
              isSelected
                ? accent.ring
                : cn("border-demo-outline-variant", accent.hoverBorder),
              !disabled && "hover:shadow-xl",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <div
              className={cn(
                "mb-6 flex size-20 items-center justify-center rounded-2xl transition-transform group-hover:scale-110",
                accent.iconTile,
              )}
            >
              <Icon className="size-10" />
            </div>

            <h3 className="mb-2 text-demo-headline-md text-demo-on-surface">
              {card.title}
            </h3>
            <p className="mb-2 text-demo-body-md text-demo-on-surface-variant">
              {card.subtitle}
            </p>
            <p className="mb-6 text-demo-label-sm text-demo-outline">
              {getCardSummary(card.type)}
            </p>

            <div className="relative h-40 w-full overflow-hidden rounded-xl bg-demo-surface-container-low">
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-center opacity-80"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
