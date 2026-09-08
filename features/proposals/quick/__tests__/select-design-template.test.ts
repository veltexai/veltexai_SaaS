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
    hasAccess: true,
  };
  const modern = {
    id: "id-modern",
    name: "modern_corporate",
    display_name: "Modern Corporate",
    hasAccess: false,
  };

  it("prefers executive premium when the user is entitled to it", () => {
    expect(pickQuickDesignTemplate([basic, modern, executivePremium])?.id).toBe(
      "id-executive",
    );
  });

  it("matches on name when display_name is missing", () => {
    const unnamed = { ...executivePremium, display_name: null };
    expect(pickQuickDesignTemplate([basic, unnamed])?.id).toBe("id-executive");
  });

  // The requirement: the default must always be a design the user can use.
  it("never defaults to a locked executive premium", () => {
    const locked = { ...executivePremium, hasAccess: false };
    expect(pickQuickDesignTemplate([basic, locked])?.id).toBe("id-basic");
  });

  it("falls back to another accessible design when premium is locked", () => {
    const locked = { ...executivePremium, hasAccess: false };
    const accessibleModern = { ...modern, hasAccess: true };

    expect(pickQuickDesignTemplate([locked, accessibleModern])?.id).toBe(
      "id-modern",
    );
  });

  it("falls back to the first accessible template when no premium exists", () => {
    expect(pickQuickDesignTemplate([modern, basic])?.id).toBe("id-basic");
  });

  it("returns undefined when no template is accessible", () => {
    const locked = { ...executivePremium, hasAccess: false };
    expect(pickQuickDesignTemplate([modern, locked])).toBeUndefined();
  });

  it("returns undefined when hasAccess is absent, rather than guessing", () => {
    expect(pickQuickDesignTemplate([{ id: "id-x", name: "basic" }])).toBeUndefined();
  });

  it("returns undefined for an empty list", () => {
    expect(pickQuickDesignTemplate([])).toBeUndefined();
  });

  it("preserves the demo design only when accessible", () => {
    expect(pickQuickDesignTemplate([basic, executivePremium, { ...modern, hasAccess: true }], "modern_corporate")?.id).toBe(modern.id);
    expect(pickQuickDesignTemplate([basic, executivePremium, modern], "modern_corporate")?.id).toBe(executivePremium.id);
    expect(pickQuickDesignTemplate([basic, { ...executivePremium, hasAccess: false }, modern], "modern_corporate")?.id).toBe(basic.id);
  });
});
