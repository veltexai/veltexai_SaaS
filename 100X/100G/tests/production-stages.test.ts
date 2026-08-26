import { discoveryMarketLimit } from "../src/production-stages";

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
});
