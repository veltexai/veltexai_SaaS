import { AUTH_ROUTES } from "@/features/auth/constants";
import type { ScopeTemplateId } from "@/features/proposals/quick";
import type { DemoType } from "../types/demo-proposal";

/** One redirect for every demo CTA and authentication method. */
export function buildDemoHandoff(demoType: DemoType, scopeTemplateId: ScopeTemplateId) {
  const params = new URLSearchParams({
    source: "demo",
    demoType,
    scopeTemplateId,
    designTemplateType: demoType === "residential" ? "luxury_elite" : "modern_corporate",
  });
  return `${AUTH_ROUTES.QUICK_PROPOSAL}?${params.toString()}`;
}
