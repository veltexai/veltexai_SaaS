import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import type { ResidentialPackageType } from "@/features/demo-proposal/types/demo-proposal";
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  SCOPE_TEMPLATES,
  type ScopeTemplate,
  type ScopeTemplateId,
} from "./scope-templates";

export const DEMO_TYPE_TO_SCOPE_TEMPLATE_ID = {
  commercial: "commercial_office",
  residential: "move_out_turnover",
} as const satisfies Record<DemoType, ScopeTemplateId>;

export const RESIDENTIAL_PACKAGE_TO_SCOPE_TEMPLATE_ID = {
  recurring: "residential_recurring",
  "deep-clean": "residential_deep_clean",
  "move-in-out": "move_out_turnover",
  "premium-detail": "residential_premium_detail",
} as const satisfies Record<ResidentialPackageType, ScopeTemplateId>;

export function getScopeTemplateIdForDemo(
  demoType: DemoType | string | null | undefined,
  residentialPackage?: ResidentialPackageType,
): ScopeTemplateId {
  if (demoType === "residential" && residentialPackage) {
    return RESIDENTIAL_PACKAGE_TO_SCOPE_TEMPLATE_ID[residentialPackage];
  }
  if (demoType === "commercial" || demoType === "residential") {
    return DEMO_TYPE_TO_SCOPE_TEMPLATE_ID[demoType];
  }

  return DEFAULT_SCOPE_TEMPLATE_ID;
}

export function getScopeTemplateForDemo(
  demoType: DemoType | string | null | undefined,
  residentialPackage?: ResidentialPackageType,
): ScopeTemplate {
  return SCOPE_TEMPLATES[getScopeTemplateIdForDemo(demoType, residentialPackage)];
}
