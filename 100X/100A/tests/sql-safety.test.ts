import { readFileSync } from "fs";
import { join } from "path";

const sql = readFileSync(join(process.cwd(), "100X/100A/database/001_prospect_intelligence_foundation.sql"), "utf8");
describe("database safety contract", () => {
  it("is provider-neutral with source idempotency and non-unique identity signals", () => {
    expect(sql).toContain("create table if not exists public.internal_prospects");
    expect(sql).not.toMatch(/internal_prospects[\s\S]{0,1000}google_place_id/);
    expect(sql).toContain("unique (provider, provider_record_id)");
    expect(sql).not.toContain("unique index if not exists internal_prospects_domain");
    expect(sql).not.toContain("unique index if not exists internal_prospects_phone");
  });
  it("qualifies schema, fixes search paths, preserves RLS, and resolves worker-role authorization", () => {
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql.match(/enable row level security/g)).toHaveLength(4);
    expect(sql).toContain("revoke all");
    expect(sql).toContain("create role veltex_100a_worker nologin noinherit nobypassrls");
    expect(sql).toContain("create policy internal_prospects_100a_read");
    expect(sql).not.toMatch(/create policy .* to (?:public|anon|authenticated)/i);
    expect(sql).toContain("security definer set search_path = pg_catalog, public");
  });
  it("scopes lock renewal, release, and cursor changes to 100A and the run owner", () => {
    expect(sql).toContain("function public.renew_100a_lock");
    expect(sql).toContain("workflow_id='100A' and lock_run_id=requested_run_id");
    expect(sql).toContain("function public.set_100a_cursor");
    expect(sql).toContain("function public.touch_100a_source");
    expect(sql).toContain("persist requires the live run-owned 100A lock");
  });
});
