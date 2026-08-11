import { discoveryGeographies, NATIONAL_CLEANING_MARKETS } from "../src/national-geographies";

describe("100G national discovery coverage", () => {
  it("uses a rotating, unique nationwide market roster only when expressly selected", () => {
    expect(discoveryGeographies(undefined)).toEqual([{ id: "seattle-wa", label: "Seattle, WA" }]);
    expect(discoveryGeographies("nationwide")).toEqual(NATIONAL_CLEANING_MARKETS);
    expect(new Set(NATIONAL_CLEANING_MARKETS.map(({ id }) => id)).size).toBe(NATIONAL_CLEANING_MARKETS.length);
    expect(NATIONAL_CLEANING_MARKETS.length).toBeGreaterThanOrEqual(50);
  });
});
