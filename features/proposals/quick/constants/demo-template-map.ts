import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
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

export function getScopeTemplateIdForDemo(
  demoType: DemoType | string | null | undefined,
): ScopeTemplateId {
  if (demoType === "commercial" || demoType === "residential") {
    return DEMO_TYPE_TO_SCOPE_TEMPLATE_ID[demoType];
  }

  return DEFAULT_SCOPE_TEMPLATE_ID;
}

export function getScopeTemplateForDemo(
  demoType: DemoType | string | null | undefined,
): ScopeTemplate {
  return SCOPE_TEMPLATES[getScopeTemplateIdForDemo(demoType)];
}
