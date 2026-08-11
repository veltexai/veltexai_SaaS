import { selectAuthoritativeSource } from "../src/source-attribution";
import type { ContactSourceRow } from "../src/types";

const s = (provider: string, providerRecordId: string, lastObservedAt: string): ContactSourceRow => ({ provider, providerRecordId, lastObservedAt });

describe("100C provider attribution (never hardcoded)", () => {
  it("returns the Apollo source when it is the only source", () => {
    expect(selectAuthoritativeSource([s("apollo", "a-1", "2026-08-08T00:00:00Z")])).toMatchObject({ provider: "apollo", providerRecordId: "a-1" });
  });
  it("returns a future provider source (e.g. data_axle) without assuming Apollo", () => {
    expect(selectAuthoritativeSource([s("data_axle", "dx-9", "2026-08-08T00:00:00Z")])?.provider).toBe("data_axle");
  });
  it("selects the most recently observed source among multiple", () => {
    const chosen = selectAuthoritativeSource([s("apollo", "a-1", "2026-08-01T00:00:00Z"), s("data_axle", "dx-9", "2026-08-09T00:00:00Z")]);
    expect(chosen).toMatchObject({ provider: "data_axle", providerRecordId: "dx-9" });
  });
  it("fails closed (null) when there is no source record", () => {
    expect(selectAuthoritativeSource([])).toBeNull();
    expect(selectAuthoritativeSource([{ provider: "", providerRecordId: "", lastObservedAt: "x" } as ContactSourceRow])).toBeNull();
  });
  it("breaks ties deterministically by provider priority on conflicting sources", () => {
    const chosen = selectAuthoritativeSource([s("referral", "r-1", "2026-08-09T00:00:00Z"), s("apollo", "a-1", "2026-08-09T00:00:00Z")]);
    expect(chosen?.provider).toBe("apollo"); // same timestamp -> priority order
  });
});
