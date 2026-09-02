import { readFileSync } from "fs";
import { join } from "path";

describe("Hunter provider migration", () => {
  const sql = readFileSync(join(process.cwd(), "100X/100B/database/016_hunter_fallback_provider.sql"), "utf8");
  const persistenceSql = readFileSync(join(process.cwd(), "100X/100B/database/017_allow_hunter_persistence.sql"), "utf8");

  it("adds Hunter without widening table permissions or verification rules", () => {
    expect(sql).toContain("drop constraint if exists prospect_contact_sources_provider_check");
    expect(sql).toContain("'apollo','hunter','data_axle','csv_import','referral','fixture'");
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)/i);
    expect(sql).not.toContain("prospect_contacts");
  });

  it("allows Hunter through the existing controlled persistence function", () => {
    expect(persistenceSql).toContain("create or replace function public.persist_100b_contact");
    expect(persistenceSql).toContain("'apollo','hunter','data_axle','csv_import','referral','fixture'");
    expect(persistenceSql).toContain("persist requires the live run-owned 100B lock");
    expect(persistenceSql).toContain("revoke all on function public.persist_100b_contact");
    expect(persistenceSql).toContain("grant execute on function public.persist_100b_contact");
    expect(persistenceSql).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+public\./i);
  });
});
