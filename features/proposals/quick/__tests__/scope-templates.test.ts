import {
  SCOPE_TEMPLATE_IDS,
  SCOPE_TEMPLATES,
  type ScopeTemplateId,
} from "../constants/scope-templates";

const REQUIRED_TEMPLATE_IDS: ScopeTemplateId[] = [
  "commercial_office",
  "medical_office",
  "retail",
  "bank",
  "gym_fitness",
  "school_daycare",
  "apartment_common_areas",
  "residential_recurring",
  "residential_deep_clean",
  "move_out_turnover",
  "residential_premium_detail",
  "post_construction",
  "floor_care_add_on",
  "window_cleaning_add_on",
  "restroom_breakroom_detail",
];

describe("scope templates", () => {
  it("has unique scope template IDs", () => {
    expect(new Set(SCOPE_TEMPLATE_IDS).size).toBe(SCOPE_TEMPLATE_IDS.length);
  });

  it("includes every required activation checkpoint template", () => {
    expect(SCOPE_TEMPLATE_IDS).toEqual(REQUIRED_TEMPLATE_IDS);
  });

  it("keeps template records aligned to their IDs", () => {
    for (const templateId of SCOPE_TEMPLATE_IDS) {
      expect(SCOPE_TEMPLATES[templateId].id).toBe(templateId);
      expect(SCOPE_TEMPLATES[templateId].scopeSections.length).toBeGreaterThan(
        0,
      );
    }
  });

  it.each([
    "residential_recurring",
    "residential_deep_clean",
    "move_out_turnover",
    "residential_premium_detail",
  ] as const)("marks %s as residential", (templateId) => {
    expect(SCOPE_TEMPLATES[templateId].serviceType).toBe("residential");
  });
});
