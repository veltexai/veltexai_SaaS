import { readFileSync } from "fs";
import { join } from "path";

describe("Hunter provider migration", () => {
  const sql = readFileSync(join(process.cwd(), "100X/100B/database/016_hunter_fallback_provider.sql"), "utf8");

  it("adds Hunter without widening table permissions or verification rules", () => {
    expect(sql).toContain("drop constraint if exists prospect_contact_sources_provider_check");
    expect(sql).toContain("'apollo','hunter','data_axle','csv_import','referral','fixture'");
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)/i);
    expect(sql).not.toContain("prospect_contacts");
  });
});
