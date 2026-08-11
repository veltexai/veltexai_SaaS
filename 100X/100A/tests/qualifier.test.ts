import fixtures from "./fixtures/places.json";
import { normalizePlace } from "../src/normalize";
import { RulesCleaningQualifier } from "../src/qualifier";
import { QUALIFICATION_VERSION } from "../src/types";

describe("versioned deterministic cleaning qualification", () => {
  const qualifier = new RulesCleaningQualifier();
  it.each([
    [0,"commercial_janitorial"],[1,"commercial_cleaning"],[2,"office_cleaning"],
    [3,"building_cleaning"],[4,"maid_service"],[5,"residential_cleaning"],
  ])("accepts supported fixture %s", async (index, companyType) => {
    const normalized = normalizePlace(fixtures[index], "sea", "cleaning")!;
    await expect(qualifier.qualify(normalized, fixtures[index])).resolves.toMatchObject({ accepted: true, companyType, method: "rules", version: QUALIFICATION_VERSION });
  });
  it.each([6,7,8,9,10,11,12])("rejects excluded or ambiguous fixture %s", async (index) => {
    const normalized = normalizePlace(fixtures[index], "sea", "cleaning")!;
    await expect(qualifier.qualify(normalized, fixtures[index])).resolves.toMatchObject({ accepted: false, method: "rules", version: QUALIFICATION_VERSION });
  });
});
