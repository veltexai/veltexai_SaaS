import { readFileSync } from "fs";
import { join } from "path";

const sql = readFileSync(join(process.cwd(), "100X/100B/database/002_contact_enrichment.sql"), "utf8");
describe("100B database safety contract", () => {
  it("is provider-neutral with source idempotency and a FK to 100A companies", () => {
    expect(sql).toContain("create table if not exists public.prospect_contacts");
    expect(sql).toContain("create table if not exists public.prospect_contact_sources");
    expect(sql).toContain("references public.internal_prospects(id) on delete restrict");
    expect(sql).toContain("unique (provider, provider_record_id)");
  });
  it("creates a dedicated, minimally-privileged worker role and preserves RLS", () => {
    expect(sql).toContain("create role veltex_100b_worker nologin noinherit nobypassrls");
    expect(sql.match(/enable row level security/g)).toHaveLength(4);
    expect(sql).toContain("set search_path = pg_catalog, public");
    expect(sql).toContain("security definer set search_path = pg_catalog, public");
    expect(sql).toContain("revoke all");
    expect(sql).not.toMatch(/create policy .* to (?:public|anon|authenticated)/i);
  });
  it("gates mutations on the live run-owned lock and an approved provider", () => {
    expect(sql).toContain("persist requires the live run-owned 100B lock");
    expect(sql).toContain("100B rejects unapproved contact provider");
    expect(sql).toContain("function public.persist_100b_contact");
    expect(sql).toContain("workflow_id='100B' and lock_run_id=requested_run_id");
  });
  it("adds only an ADDITIVE read policy on the 100A companies table (does not weaken 100A)", () => {
    expect(sql).toContain("create policy internal_prospects_100b_read on public.internal_prospects for select to veltex_100b_worker");
    expect(sql).not.toContain("drop table");
    expect(sql).not.toMatch(/revoke .* from veltex_100a_worker/i);
  });
});
