import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "100X/100G/database/015_enrichment_retry_rotation.sql"), "utf8");

describe("100G enrichment retry rotation migration", () => {
  it("prioritizes fresh targets and ages zero-candidate attempts without permanent exclusion", () => {
    expect(sql).toContain("when attempts.last_attempt_at is null then 0");
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain("else 3");
    expect(sql).toContain("order by retry_bucket, zero_candidate_attempts");
  });

  it("uses aggregate diagnostics without storing provider data in the target function", () => {
    expect(sql).toContain("d.event = 'company.enriched'");
    expect(sql).toContain("d.data ->> 'candidates'");
    expect(sql).toContain("d.data ->> 'prospectId' = p.id::text");
  });

  it("preserves ready-contact exclusion and least-privilege execution", () => {
    expect(sql).toContain("c.outreach_eligibility = 'ready_for_outreach'");
    expect(sql).toContain("revoke all on function public.load_100g_enrichment_target_ids(integer)");
    expect(sql).toContain("grant execute on function public.load_100g_enrichment_target_ids(integer) to veltex_100g_orchestrator_v2");
  });
});
