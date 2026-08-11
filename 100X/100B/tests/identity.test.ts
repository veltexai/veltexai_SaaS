import { decideContactIdentity, hasIdentityConflict } from "../src/identity";

const none = { emailContactIds: [] as string[] };
describe("100B contact identity", () => {
  it("treats provider+record as definitive (existing source)", () =>
    expect(decideContactIdentity({ ...none, sourceRecordId: "s1", sourceContactId: "c1" })).toMatchObject({ disposition: "existing_source_record", contactId: "c1" }));
  it("attaches a single email match as a confident contact match", () =>
    expect(decideContactIdentity({ ...none, emailContactIds: ["c1"] })).toMatchObject({ disposition: "confident_contact_match", contactId: "c1" }));
  it("creates a new contact when there is no signal", () =>
    expect(decideContactIdentity(none).disposition).toBe("new_contact"));
  it("flags multiple distinct email matches as an identity conflict", () => {
    expect(hasIdentityConflict({ ...none, emailContactIds: ["c1", "c2"] })).toBe(true);
    expect(hasIdentityConflict({ ...none, emailContactIds: ["c1", "c1"] })).toBe(false);
    expect(decideContactIdentity({ ...none, emailContactIds: ["c1", "c2"] }).disposition).toBe("new_contact");
  });
});
