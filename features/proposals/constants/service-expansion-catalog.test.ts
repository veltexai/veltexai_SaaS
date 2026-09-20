import {
  cleaningBusinessSegments,
  cleaningServiceModules,
} from "./service-expansion-catalog";

describe("service expansion catalog", () => {
  it("uses unique stable ids", () => {
    const segmentIds = cleaningBusinessSegments.map((segment) => segment.id);
    const moduleIds = cleaningServiceModules.map((module) => module.id);

    expect(new Set(segmentIds).size).toBe(segmentIds.length);
    expect(new Set(moduleIds).size).toBe(moduleIds.length);
  });

  it("keeps regulated work in the final reviewed rollout wave", () => {
    const regulatedModules = cleaningBusinessSegments.flatMap((segment) =>
      segment.modules
        .filter((module) => module.riskTier === "regulated")
        .map((module) => ({ module, rolloutWave: segment.rolloutWave })),
    );

    expect(regulatedModules.length).toBeGreaterThan(0);
    expect(regulatedModules.every(({ rolloutWave }) => rolloutWave === 5)).toBe(
      true,
    );
  });

  it("requires inputs and units for every service module", () => {
    for (const module of cleaningServiceModules) {
      expect(module.requiredInputs.length).toBeGreaterThan(0);
      expect(module.unitTypes.length).toBeGreaterThan(0);
    }
  });
});

