import { completedObservationDate } from "../src/observation-date";

describe("completedObservationDate", () => {
  it("uses the current Pacific date after the campaign window closes in summer", () => {
    expect(completedObservationDate(new Date("2026-08-18T03:00:00Z"))).toBe("2026-08-17");
  });

  it("uses the current Pacific date after the campaign window closes in winter", () => {
    expect(completedObservationDate(new Date("2026-12-18T03:00:00Z"))).toBe("2026-12-17");
  });

  it("uses the previous Pacific date before the campaign window closes", () => {
    expect(completedObservationDate(new Date("2026-08-17T15:00:00Z"))).toBe("2026-08-16");
  });

  it("handles month and year boundaries", () => {
    expect(completedObservationDate(new Date("2027-01-01T15:00:00Z"))).toBe("2026-12-31");
  });

  it("rejects an invalid send-window hour", () => {
    expect(() => completedObservationDate(new Date(), "America/Los_Angeles", 24)).toThrow("send window end hour");
  });
});
