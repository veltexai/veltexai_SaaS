import { pickQuickDesignTemplate } from "../lib/select-design-template";

describe("pickQuickDesignTemplate", () => {
  const basic = {
    id: "id-basic",
    name: "basic_professional",
    display_name: "Basic Professional",
    hasAccess: true,
  };
  const executivePremium = {
    id: "id-executive",
    name: "executive_premium",
    display_name: "Executive Premium",
    hasAccess: false,
  };
  const modern = {
    id: "id-modern",
    name: "modern_corporate",
    display_name: "Modern Corporate",
    hasAccess: false,
  };

  it("prefers the executive premium template even over earlier accessible ones", () => {
    expect(pickQuickDesignTemplate([basic, modern, executivePremium])?.id).toBe(
      "id-executive",
    );
  });

  it("matches on name when display_name is missing", () => {
    const unnamed = { ...executivePremium, display_name: null };
    expect(pickQuickDesignTemplate([basic, unnamed])?.id).toBe("id-executive");
  });

  it("falls back to the first accessible template when no premium exists", () => {
    expect(pickQuickDesignTemplate([modern, basic])?.id).toBe("id-basic");
  });

  it("falls back to the first template when none are accessible", () => {
    expect(pickQuickDesignTemplate([modern])?.id).toBe("id-modern");
  });

  it("returns undefined for an empty list", () => {
    expect(pickQuickDesignTemplate([])).toBeUndefined();
  });
});
