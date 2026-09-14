import {
  canAccessTemplate,
  resolveDesignTier,
} from "../utils/can-access-template";
import type { SubscriptionTier } from "@/types/subscription";

// The tier -> design matrix seeded in
// supabase/migrations/029_proposal_templates_system.sql:288-318.
const BASIC: SubscriptionTier[] = ["starter", "professional", "enterprise"];
const EXECUTIVE_PREMIUM: SubscriptionTier[] = ["professional", "enterprise"];
const MODERN_CORPORATE: SubscriptionTier[] = ["enterprise"];
const LUXURY_ELITE: SubscriptionTier[] = ["enterprise"];

describe("resolveDesignTier", () => {
  it("preserves an active, unexpired free trial as a narrow tier", () => {
    expect(resolveDesignTier("starter", "free_trial", "2999-01-01T00:00:00Z")).toBe("free_trial");
    expect(resolveDesignTier(null, "free_trial", "2999-01-01T00:00:00Z")).toBe("free_trial");
  });

  it("returns to the paid plan or starter after trial expiration", () => {
    expect(resolveDesignTier("starter", "free_trial", "2000-01-01T00:00:00Z")).toBe("starter");
    expect(resolveDesignTier("professional", "free_trial", "2000-01-01T00:00:00Z")).toBe("professional");
  });

  it("uses the plan verbatim for every non-trial status", () => {
    expect(resolveDesignTier("starter", "active")).toBe("starter");
    expect(resolveDesignTier("professional", "active")).toBe("professional");
    expect(resolveDesignTier("enterprise", "active")).toBe("enterprise");
  });

  it("falls back to starter when the plan is unknown", () => {
    expect(resolveDesignTier(null, "active")).toBe("starter");
    expect(resolveDesignTier(undefined, undefined)).toBe("starter");
    expect(resolveDesignTier("", "cancelled")).toBe("starter");
  });
});

describe("canAccessTemplate", () => {
  it("gives a free trial exactly Basic + Executive Premium", () => {
    const trial = resolveDesignTier("starter", "free_trial", "2999-01-01T00:00:00Z");

    expect(canAccessTemplate(BASIC, trial, "Basic")).toBe(true);
    expect(canAccessTemplate(EXECUTIVE_PREMIUM, trial, "Executive Premium")).toBe(true);
    // The trial must NOT inherit the rest of the professional-and-above set.
    expect(canAccessTemplate(MODERN_CORPORATE, trial, "Modern Corporate")).toBe(false);
    expect(canAccessTemplate(LUXURY_ELITE, trial, "Luxury Elite")).toBe(false);
  });

  it("gives starter only Basic", () => {
    expect(canAccessTemplate(BASIC, "starter")).toBe(true);
    expect(canAccessTemplate(EXECUTIVE_PREMIUM, "starter")).toBe(false);
    expect(canAccessTemplate(MODERN_CORPORATE, "starter")).toBe(false);
    expect(canAccessTemplate(LUXURY_ELITE, "starter")).toBe(false);
  });

  it("gives professional Basic + Executive Premium", () => {
    expect(canAccessTemplate(BASIC, "professional")).toBe(true);
    expect(canAccessTemplate(EXECUTIVE_PREMIUM, "professional")).toBe(true);
    expect(canAccessTemplate(MODERN_CORPORATE, "professional")).toBe(false);
    expect(canAccessTemplate(LUXURY_ELITE, "professional")).toBe(false);
  });

  it("gives enterprise every design", () => {
    for (const tiers of [
      BASIC,
      EXECUTIVE_PREMIUM,
      MODERN_CORPORATE,
      LUXURY_ELITE,
    ]) {
      expect(canAccessTemplate(tiers, "enterprise")).toBe(true);
    }
  });

  it("accepts the free_trial tier value directly", () => {
    expect(canAccessTemplate(EXECUTIVE_PREMIUM, "free_trial", "Executive Premium")).toBe(true);
    expect(canAccessTemplate(EXECUTIVE_PREMIUM, "free_trial", "Another Professional Template")).toBe(false);
    expect(canAccessTemplate(LUXURY_ELITE, "free_trial", "Luxury Elite")).toBe(false);
  });

  it("fails closed for a template with no tiers assigned", () => {
    for (const tier of [
      "starter",
      "professional",
      "enterprise",
      "free_trial",
    ] as SubscriptionTier[]) {
      expect(canAccessTemplate([], tier)).toBe(false);
    }
  });
});
