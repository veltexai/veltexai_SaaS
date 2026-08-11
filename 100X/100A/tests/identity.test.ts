import { decideIdentity } from "../src/identity";

const none = { domainProspectIds: [], phoneProspectIds: [], nameLocationProspectIds: [] };
describe("conservative company/location identity", () => {
  it("treats provider identity as definitive", () => expect(decideIdentity({ ...none, sourceRecordId: "s1", sourceProspectId: "p1" })).toMatchObject({ disposition: "existing_source_record", prospectId: "p1" }));
  it("requires corroborating signals for a confident canonical match", () => expect(decideIdentity({ ...none, domainProspectIds: ["p1"], nameLocationProspectIds: ["p1"] })).toMatchObject({ disposition: "confident_canonical_match", prospectId: "p1" }));
  it("holds a shared domain for review", () => expect(decideIdentity({ ...none, domainProspectIds: ["p1"] }).disposition).toBe("possible_match_review"));
  it("holds a shared call-center phone for review", () => expect(decideIdentity({ ...none, phoneProspectIds: ["p1"] }).disposition).toBe("possible_match_review"));
  it("uses company name plus city/state as a review signal", () => expect(decideIdentity({ ...none, nameLocationProspectIds: ["p1"] }).disposition).toBe("possible_match_review"));
  it("creates a new canonical prospect without signals", () => expect(decideIdentity(none).disposition).toBe("new_canonical_prospect"));
});
