import type { ServiceFrequency } from "@/features/proposals/schemas/proposal";
import {
  getScopeTemplate,
  type ScopeTemplateId,
} from "../constants/scope-templates";
import type { QuickProposalFormData } from "../schemas/quick-proposal";

export interface PropertyAssumptionsLite {
  recommendedScopeTemplateId: ScopeTemplateId;
  recommendedFrequency: ServiceFrequency;
  commonAddOns: string[];
  restroomCount: number;
  breakroomCount: number;
  trafficLevel: "light" | "medium" | "heavy";
  trafficGuidance: string;
  assumptions: string[];
  warnings: string[];
}

function inferTemplateId(propertyType: string, fallback: ScopeTemplateId) {
  const normalized = propertyType.toLowerCase();

  if (normalized.includes("medical") || normalized.includes("clinic")) {
    return "medical_office";
  }

  if (normalized.includes("retail") || normalized.includes("store")) {
    return "retail";
  }

  if (normalized.includes("bank")) {
    return "bank";
  }

  if (normalized.includes("gym") || normalized.includes("fitness")) {
    return "gym_fitness";
  }

  if (normalized.includes("school") || normalized.includes("daycare")) {
    return "school_daycare";
  }

  if (normalized.includes("apartment") || normalized.includes("common")) {
    return "apartment_common_areas";
  }

  if (normalized.includes("turnover") || normalized.includes("move")) {
    return "move_out_turnover";
  }

  if (normalized.includes("construction")) {
    return "post_construction";
  }

  return fallback;
}

function inferTrafficLevel(
  propertyType: string,
  squareFootage: number,
  selected?: "light" | "medium" | "heavy",
) {
  if (selected) {
    return selected;
  }

  const normalized = propertyType.toLowerCase();

  if (
    squareFootage >= 20000 ||
    normalized.includes("gym") ||
    normalized.includes("retail") ||
    normalized.includes("school") ||
    normalized.includes("daycare")
  ) {
    return "heavy";
  }

  if (squareFootage <= 3000) {
    return "light";
  }

  return "medium";
}

function getTrafficGuidance(trafficLevel: "light" | "medium" | "heavy") {
  if (trafficLevel === "heavy") {
    return "Plan for more frequent touchpoint cleaning, entry-area detail, and restroom checks.";
  }

  if (trafficLevel === "light") {
    return "A lighter recurring schedule may work if restrooms and entry areas stay controlled.";
  }

  return "Use a balanced recurring schedule with extra attention to shared areas and touchpoints.";
}

function estimateRestrooms(squareFootage: number, provided?: number) {
  if (typeof provided === "number" && provided >= 0) {
    return provided;
  }

  return Math.max(1, Math.ceil(squareFootage / 4000));
}

function estimateBreakrooms(
  propertyType: string,
  squareFootage: number,
  provided?: number,
) {
  if (typeof provided === "number" && provided >= 0) {
    return provided;
  }

  if (propertyType.toLowerCase().includes("retail")) {
    return squareFootage >= 12000 ? 1 : 0;
  }

  return Math.max(1, Math.ceil(squareFootage / 12000));
}

export function buildPropertyAssumptionsLite(
  values: Pick<
    QuickProposalFormData,
    | "propertyType"
    | "squareFootage"
    | "scopeTemplateId"
    | "serviceFrequency"
    | "trafficLevel"
    | "restroomCount"
    | "breakroomCount"
    | "addOns"
  >,
): PropertyAssumptionsLite {
  const recommendedScopeTemplateId = inferTemplateId(
    values.propertyType,
    values.scopeTemplateId,
  );
  const template =
    getScopeTemplate(recommendedScopeTemplateId) ??
    getScopeTemplate(values.scopeTemplateId)!;
  const squareFootage = Number(values.squareFootage) || 0;
  const trafficLevel = inferTrafficLevel(
    values.propertyType,
    squareFootage,
    values.trafficLevel,
  );
  const restroomCount = estimateRestrooms(squareFootage, values.restroomCount);
  const breakroomCount = estimateBreakrooms(
    values.propertyType,
    squareFootage,
    values.breakroomCount,
  );
  const commonAddOns = Array.from(
    new Set([...values.addOns, ...template.commonAddOns.slice(0, 3)]),
  );
  const warnings = [...template.redFlagsOrWarnings];

  if (squareFootage >= 25000 && values.serviceFrequency === "weekly") {
    warnings.push(
      "Large sites on weekly service may need reduced scope or a higher visit frequency.",
    );
  }

  if (trafficLevel === "heavy" && values.serviceFrequency === "1x-month") {
    warnings.push(
      "Monthly service is usually too light for heavy-traffic cleaning programs.",
    );
  }

  return {
    recommendedScopeTemplateId,
    recommendedFrequency: template.recommendedFrequency,
    commonAddOns,
    restroomCount,
    breakroomCount,
    trafficLevel,
    trafficGuidance: getTrafficGuidance(trafficLevel),
    assumptions: [
      `${restroomCount} restroom group${restroomCount === 1 ? "" : "s"} assumed for routine sanitation.`,
      `${breakroomCount} breakroom or kitchenette area${breakroomCount === 1 ? "" : "s"} assumed.`,
      `Traffic level is treated as ${trafficLevel} for scope planning.`,
      "Final labor, price, and production assumptions are confirmed during proposal generation.",
    ],
    warnings,
  };
}
