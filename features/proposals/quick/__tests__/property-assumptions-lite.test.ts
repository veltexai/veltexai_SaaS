import { buildPropertyAssumptionsLite } from "../lib/property-assumptions-lite";
import type { QuickProposalFormData } from "../schemas/quick-proposal";

const baseQuickValues: QuickProposalFormData = {
  clientName: "Evergreen Professional Offices",
  clientEmail: "client@example.com",
  clientPhone: "",
  companyName: "Evergreen Professional Offices",
  serviceLocation: "Seattle, WA",
  city: "Seattle",
  state: "WA",
  propertyType: "Commercial Office",
  squareFootage: 12000,
  serviceFrequency: "5x-week",
  scopeTemplateId: "commercial_office",
  addOns: [],
  notes: "",
  trafficLevel: undefined,
  restroomCount: undefined,
  breakroomCount: undefined,
  cleaningGoals: "",
};

describe("Property Assumptions Lite", () => {
  it("recommends a medical template when property type indicates medical", () => {
    const assumptions = buildPropertyAssumptionsLite({
      ...baseQuickValues,
      propertyType: "Medical Office",
    });

    expect(assumptions.recommendedScopeTemplateId).toBe("medical_office");
    expect(assumptions.recommendedFrequency).toBe("5x-week");
  });

  it("estimates restrooms, breakrooms, and traffic guidance", () => {
    const assumptions = buildPropertyAssumptionsLite(baseQuickValues);

    expect(assumptions.restroomCount).toBe(3);
    expect(assumptions.breakroomCount).toBe(1);
    expect(assumptions.trafficLevel).toBe("medium");
    expect(assumptions.trafficGuidance).toContain("balanced");
  });

  it("warns when heavy traffic is paired with monthly service", () => {
    const assumptions = buildPropertyAssumptionsLite({
      ...baseQuickValues,
      propertyType: "Retail Store",
      serviceFrequency: "1x-month",
    });

    expect(assumptions.trafficLevel).toBe("heavy");
    expect(assumptions.warnings.join(" ")).toContain("Monthly service");
  });
});
