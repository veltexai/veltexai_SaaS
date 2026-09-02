import { readFileSync } from "node:fs";
import { join } from "node:path";
import { discoveryMarketLimit, hunterFallbackConfigured } from "../src/production-stages";

describe("100G production-stage limits", () => {
  it("bounds nationwide discovery to one market per scheduled invocation by default", () => {
    expect(discoveryMarketLimit(500, 5)).toBe(1);
  });

  it("honors a smaller demand and an explicit conservative market cohort", () => {
    expect(discoveryMarketLimit(4, 5, "3")).toBe(1);
    expect(discoveryMarketLimit(25, 5, "3")).toBe(3);
  });

  it("rejects invalid configured limits", () => {
    expect(() => discoveryMarketLimit(25, 5, "0")).toThrow(/positive integers/);
  });

  it("enables the secondary provider only with both the explicit gate and credential", () => {
    expect(hunterFallbackConfigured({ VELTEX_100B_HUNTER_FALLBACK_ENABLED: "true", VELTEX_100B_HUNTER_API_KEY: "key" })).toBe(true);
    expect(hunterFallbackConfigured({ VELTEX_100B_HUNTER_FALLBACK_ENABLED: "true" })).toBe(false);
    expect(hunterFallbackConfigured({ VELTEX_100B_HUNTER_API_KEY: "key" })).toBe(false);
  });

  it("keeps the Hunter validation branch explicitly gated in production-stage source", () => {
    const source = readFileSync(
      join(process.cwd(), "100X/100G/src/production-stages.ts"),
      "utf8",
    );
    expect(source).toContain('enrichmentMode === "hunter_validation"');
    expect(source).toContain("hunterConfig.limits.maxCompaniesPerRun = 1");
    expect(source).toContain("Math.min(hunterConfig.limits.maxProviderRequestsPerRun, 4)");
  });
});
