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
