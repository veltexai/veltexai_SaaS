import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const socialSql = readFileSync(join(root, "100X/100S/database/100s_001_social_growth_engine.sql"), "utf8");
const attributionSql = readFileSync(join(root, "supabase/migrations/037_marketing_attribution.sql"), "utf8");
const provider = readFileSync(join(root, "100X/100S/src/provider.ts"), "utf8");

describe("100S database and provider safety", () => {
  it("binds approvals and scheduling to an immutable content hash", () => {
    expect(socialSql).toContain("social_compute_placement_hash");
    expect(socialSql).toContain("approval is stale");
    expect(socialSql).toContain("current clean compliance verdict required");
  });

  it("keeps all campaign and account publishing switches off by default", () => {
    expect(socialSql.match(/publishing_enabled boolean not null default false/g)).toHaveLength(1);
    expect(socialSql.match(/active boolean not null default false/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("uses hardened security-definer functions", () => {
    const functions = socialSql.match(/security definer set search_path = public, pg_temp/g) ?? [];
    expect(functions.length).toBeGreaterThanOrEqual(2);
    expect(socialSql).toContain("drafter and approver must differ");
    expect(socialSql).toContain("global daily platform cadence exceeded");
  });

  it("records first-proposal activation idempotently", () => {
    expect(attributionSql).toContain("'first_proposal:' || new.user_id::text");
    expect(attributionSql).toContain("on conflict (event_id) do nothing");
  });

  it("exposes no publishing method in the provider contract", () => {
    expect(provider).not.toMatch(/publish\s*\(/);
    expect(provider).toContain("reconcile(");
  });
});
