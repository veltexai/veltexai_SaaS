import { gaClientIdFromCookie } from "../../../lib/analytics/ga4-server";
describe("GA4 server event identifiers", () => {
  it("extracts the web client id without accepting arbitrary cookie values", () => { expect(gaClientIdFromCookie("GA1.1.123456.987654")).toBe("123456.987654"); expect(gaClientIdFromCookie("invalid")).toBeNull(); expect(gaClientIdFromCookie(undefined)).toBeNull(); });
});
