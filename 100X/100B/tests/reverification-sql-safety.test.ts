import { readFileSync } from "fs";
import { join } from "path";

const sql = readFileSync(join(process.cwd(), "100X/100B/database/018_safe_existing_source_reverification.sql"), "utf8");

describe("100B exact-source reverification contract", () => {
  it("requires the run-owned lock and exact canonical email", () => {
    expect(sql).toContain("lock_run_id = requested_run_id");
    expect(sql).toContain("lock_expires_at > pg_catalog.now()");
    expect(sql).toContain("c.normalized_email = lower(btrim(requested_normalized_email))");
  });
  it("preserves eligibility and suppression gates", () => {
    expect(sql).toContain("c.outreach_eligibility = 'ready_for_outreach'");
    expect(sql).toContain("c.suppression_status = 'none'");
    expect(sql).not.toMatch(/set[\s\S]{0,200}outreach_eligibility\s*=/i);
    expect(sql).not.toMatch(/set[\s\S]{0,200}suppression_status\s*=/i);
  });
  it("is unavailable to browser roles", () => {
    expect(sql).toContain("revoke all on function public.refresh_100b_verified_source(uuid,uuid,text,timestamptz) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.refresh_100b_verified_source(uuid,uuid,text,timestamptz) to veltex_100b_worker");
  });
});
