import fixtures from "./fixtures/places.json";
import { normalizePlace } from "../src/normalize";

describe("Google Places normalization", () => {
  it("keeps provider identity separate from canonical facts", () => {
    expect(normalizePlace(fixtures[0], "sea", "commercial janitorial")).toMatchObject({
      companyName: "Evergreen Commercial Janitorial", provider: "google_places",
      providerRecordId: "janitorial-1", websiteDomain: "evergreen.example",
      normalizedPhone: "2065550101", city: "Seattle", state: "WA",
    });
  });
  it("requires provider identity", () => {
    expect(normalizePlace({ displayName: { text: "Nameless Place" } }, "sea", "maid services")).toBeNull();
  });
});
