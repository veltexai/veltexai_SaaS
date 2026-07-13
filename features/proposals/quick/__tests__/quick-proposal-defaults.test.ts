import { getQuickProposalDefaults } from "../schemas/quick-proposal";
import { getScopeTemplate } from "../constants/scope-templates";

describe("quick proposal defaults", () => {
  it("prefills commercial demo context", () => {
    const template = getScopeTemplate("commercial_office")!;
    const defaults = getQuickProposalDefaults({
      demoType: "commercial",
      scopeTemplateId: "commercial_office",
      template,
    });

    expect(defaults.clientName).toBe("Evergreen Professional Offices");
    expect(defaults.propertyType).toBe("Commercial Office");
    expect(defaults.squareFootage).toBe(12000);
    expect(defaults.serviceFrequency).toBe("5x-week");
    expect(defaults.scopeTemplateId).toBe("commercial_office");
    expect(defaults.city).toBe("Seattle");
    expect(defaults.state).toBe("WA");
  });

  it("prefills residential demo with move-out fallback context", () => {
    const template = getScopeTemplate("move_out_turnover")!;
    const defaults = getQuickProposalDefaults({
      demoType: "residential",
      scopeTemplateId: "move_out_turnover",
      template,
    });

    expect(defaults.clientName).toBe("Maple Ridge Residence");
    expect(defaults.scopeTemplateId).toBe("move_out_turnover");
    expect(defaults.serviceFrequency).toBe("one-time");
    expect(defaults.squareFootage).toBe(2800);
    expect(defaults.city).toBe("Tacoma");
    expect(defaults.state).toBe("WA");
  });
});
