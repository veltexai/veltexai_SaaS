import { attributionFromUrl, parseAttribution, serializeAttribution } from "../../../lib/analytics/attribution";
describe("first-touch attribution", () => {
  it("captures and round-trips approved UTM data", () => { const value = attributionFromUrl(new URL("https://www.veltexai.com/tools/cleaning-bid-calculator?utm_source=instagram&utm_medium=organic_social&utm_campaign=us-bid-smarter-01&utm_content=bid-teardown-a"), "https://instagram.com", new Date("2026-09-02T00:00:00Z")); expect(parseAttribution(serializeAttribution(value!))).toEqual(value); });
  it("ignores ordinary visits and truncates oversized input", () => { expect(attributionFromUrl(new URL("https://www.veltexai.com/"))).toBeNull(); const value = attributionFromUrl(new URL(`https://www.veltexai.com/?utm_source=${"x".repeat(200)}`)); expect(value?.source).toHaveLength(80); });
  it("rejects malformed cookie data", () => expect(parseAttribution("source=instagram")).toBeNull());
});
