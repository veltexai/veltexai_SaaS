import type { DemoType } from "../types/demo-proposal";

export function getDemoAccent(type: DemoType) {
  const isCommercial = type === "commercial";

  return {
    highlightBorder: isCommercial
      ? "border-blue-600 text-blue-700"
      : "border-emerald-600 text-emerald-700",
    stepBadge: isCommercial ? "bg-blue-600" : "bg-emerald-600",
    bulletDot: isCommercial ? "bg-blue-500" : "bg-emerald-500",
    selectedCard: isCommercial
      ? "ring-2 ring-blue-600 border-blue-200 bg-blue-50/30"
      : "ring-2 ring-emerald-600 border-emerald-200 bg-emerald-50/30",
    iconBox: isCommercial
      ? "bg-blue-100 text-blue-700"
      : "bg-emerald-100 text-emerald-700",
    checkCircle: isCommercial ? "bg-blue-600" : "bg-emerald-600",
    typeBadge: isCommercial
      ? "bg-blue-100 text-blue-800"
      : "bg-emerald-100 text-emerald-800",
    coverHeader: isCommercial
      ? "bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-10 sm:px-10 sm:py-12"
      : "bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-6 py-10 sm:px-10 sm:py-12",
  };
}

/**
 * Stitch ("Veltex AI Interactive Demo") accent tokens for the redesigned demo
 * shell. The Stitch system tints commercial with `primary` and residential with
 * `secondary`; both share the same neutral surface palette.
 */
export function getDemoStitchAccent(type: DemoType) {
  const isCommercial = type === "commercial";

  return {
    iconTile: isCommercial
      ? "bg-demo-primary/10 text-demo-primary"
      : "bg-demo-secondary/10 text-demo-secondary",
    ring: isCommercial
      ? "border-demo-primary ring-1 ring-demo-primary/20"
      : "border-demo-secondary ring-1 ring-demo-secondary/20",
    focusRing: isCommercial
      ? "focus-visible:ring-demo-primary"
      : "focus-visible:ring-demo-secondary",
    hoverBorder: isCommercial
      ? "hover:border-demo-primary"
      : "hover:border-demo-secondary",
    text: isCommercial ? "text-demo-primary" : "text-demo-secondary",
  };
}
