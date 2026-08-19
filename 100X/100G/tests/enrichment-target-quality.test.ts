import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "100X/100G/database/013_enrichment_target_quality.sql"), "utf8");

describe("100G enrichment target quality migration", () => {
  it("excludes missing domains and prioritizes never-attempted prospects", () => {
    expect(sql).toContain("p.website_domain is not null");
    expect(sql).toContain("btrim(p.website_domain) <> ''");
    expect(sql).toContain("last_attempt_at asc nulls first");
    expect(sql).toContain("has_any_contact asc");
  });

  it("preserves ready-contact exclusion and least-privilege grants", () => {
    expect(sql).toContain("c.outreach_eligibility = 'ready_for_outreach'");
    expect(sql).toContain("revoke all on function public.load_100g_enrichment_target_ids(integer)");
    expect(sql).toContain("grant execute on function public.load_100g_enrichment_target_ids(integer) to veltex_100g_orchestrator_v2");
  });
});
