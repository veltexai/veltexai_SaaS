import { readFileSync } from "fs";
import { join } from "path";
import fixtures from "./fixtures/places.json";
import { normalizePlace } from "../src/normalize";
import { InMemoryProspectRepository } from "../src/in-memory-repository";
import type { ProviderSourceRecord } from "../src/types";

const base: ProviderSourceRecord = {
  prospectId: "p1", provider: "referral", providerRecordId: "ref-1",
  sourceGeography: null, sourceQuery: null, providerUrl: null,
  observedCompanyName: "Referral Cleaning", observedWebsite: null, observedPhone: null,
  observedAddress: null, city: null, state: null,
  qualification: { accepted: true, companyType: "commercial_cleaning", score: 1, reason: "approved referral", method: "rules", version: "future" },
  firstObservedAt: "2026-08-07T00:00:00Z", lastObservedAt: "2026-08-07T00:00:00Z", providerMetadata: null,
};
describe("provider-source portability", () => {
  it("represents and persists providers without geography or query", async () => {
    expect(base.sourceGeography).toBeNull(); expect(base.sourceQuery).toBeNull();
    const repository = new InMemoryProspectRepository(() => new Date("2026-08-07T00:00:00Z"));
    await repository.acquireLock("100A", "run", "2026-08-07T00:10:00Z");
    const { prospectId: _prospectId, ...source } = base;
    await repository.persistObservation("run", {
      disposition: "new_canonical_prospect",
      canonical: { companyName: "Referral Cleaning", website: null, websiteDomain: null, primaryPhone: null, normalizedPhone: null, companyType: "commercial_cleaning", status: "discovered", firstDiscoveredAt: base.firstObservedAt, lastUpdatedAt: base.lastObservedAt },
      source,
    });
    expect(repository.sourceRecords[0]).toMatchObject({ sourceGeography: null, sourceQuery: null });
  });
  it("keeps Google geography and query mandatory in normalization", () => {
    expect(normalizePlace(fixtures[0], "sea", "commercial janitorial")).toMatchObject({ sourceGeography: "sea", sourceQuery: "commercial janitorial" });
    expect(normalizePlace(fixtures[0], "", "commercial janitorial")).toBeNull();
    expect(normalizePlace(fixtures[0], "sea", "")).toBeNull();
  });
  it("makes provider-neutral SQL provenance nullable", () => {
    const sql = readFileSync(join(process.cwd(), "100X/100A/database/001_prospect_intelligence_foundation.sql"), "utf8");
    expect(sql).toMatch(/source_geography text,/); expect(sql).toMatch(/source_query text,/);
    expect(sql).not.toMatch(/source_(?:geography|query) text not null/);
  });
});
