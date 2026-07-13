import type { DemoType } from "@/features/demo-proposal/types/demo-proposal";
import {
  DEMO_TYPE_TO_SCOPE_TEMPLATE_ID,
  getScopeTemplateIdForDemo,
} from "../constants/demo-template-map";
import {
  SCOPE_TEMPLATES,
  isScopeTemplateId,
} from "../constants/scope-templates";

const DEMO_TYPES: DemoType[] = ["commercial", "residential"];

describe("demo template map", () => {
  it("covers every demo type", () => {
    expect(Object.keys(DEMO_TYPE_TO_SCOPE_TEMPLATE_ID).sort()).toEqual(
      [...DEMO_TYPES].sort(),
    );
  });

  it("maps commercial demo to commercial office", () => {
    expect(getScopeTemplateIdForDemo("commercial")).toBe("commercial_office");
  });

  it("points every demo mapping to an existing scope template", () => {
    for (const templateId of Object.values(DEMO_TYPE_TO_SCOPE_TEMPLATE_ID)) {
      expect(isScopeTemplateId(templateId)).toBe(true);
      expect(SCOPE_TEMPLATES[templateId]).toBeDefined();
    }
  });
});
