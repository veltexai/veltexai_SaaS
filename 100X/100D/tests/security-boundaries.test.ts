import { readFileSync } from "fs";
import { resolve } from "path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const migration = read("100X/100D/database/004_automated_suppression_and_event_intelligence.sql");
const eventsRoute = read("app/api/internal/100x/instantly/events/route.ts");
const customerRoute = read("app/api/internal/100x/customer-status/route.ts");
const normalizeEventSrc = read("100X/100D/src/normalize-event.ts");
const authSrc = read("100X/100D/src/auth.ts");

const NEW_TABLES = ["outbound_event_processing", "outbound_unmatched_events", "outbound_ingestion_diagnostics", "outbound_ingestion_workflow_state"];
const FUNCTIONS = ["resolve_100d_contact", "apply_100d_instantly_event", "apply_100d_customer_status", "list_100d_unmatched", "reconcile_100d_event", "record_100d_diagnostic"];

describe("100D migration 004 — least-privilege database boundary", () => {
  it("creates the dedicated ingest role with NOLOGIN NOINHERIT NOBYPASSRLS", () => {
    expect(migration).toContain("create role veltex_100d_ingest nologin noinherit nobypassrls");
  });
  it("enables RLS on every new table", () => {
    for (const t of NEW_TABLES) expect(migration).toContain(`alter table public.${t} enable row level security`);
  });
  it("revokes all on every new table from public/anon/authenticated", () => {
    expect(migration).toMatch(/revoke all on[\s\S]*outbound_event_processing[\s\S]*from public, anon, authenticated/);
  });
  it("uses a fixed search_path on every SECURITY DEFINER function", () => {
    const definers = migration.match(/security definer set search_path = pg_catalog, public/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(FUNCTIONS.length);
  });
  it("grants EXECUTE on the 004 functions to the ingest role and NO direct table DML", () => {
    for (const f of FUNCTIONS) expect(migration).toContain(f);
    expect(migration).toContain("grant execute on function");
    expect(migration).toContain("to veltex_100d_ingest");
    // Least privilege: the role gets usage + execute only, never table select/insert/update/delete.
    expect(migration).not.toMatch(/grant (select|insert|update|delete)[\s\S]*to veltex_100d_ingest/);
  });
  it("never deletes or weakens history (append-only) — no DELETE/DROP/TRUNCATE in 004", () => {
    expect(migration.toLowerCase()).not.toMatch(/\bdelete from\b/);
    expect(migration.toLowerCase()).not.toMatch(/\bdrop table\b/);
    expect(migration.toLowerCase()).not.toMatch(/\btruncate\b/);
  });
  it("does not alter or drop any 001/002/003 object", () => {
    // No ALTER/DROP on the pre-existing tables; 004 only references them inside function bodies.
    for (const t of ["campaign_configs", "prospect_contacts", "outbound_event_receipts", "outbound_suppression_registry", "campaign_contact_assignments"]) {
      expect(migration).not.toMatch(new RegExp(`alter table public\\.${t}`));
      expect(migration).not.toMatch(new RegExp(`drop [a-z ]*${t}`));
    }
  });
  it("constrains receipt provider and processing outcomes explicitly", () => {
    expect(migration).toContain("check (provider in ('instantly','fixture'))");
    expect(migration).toContain("check (outcome in ('processed','held_unmatched','reconciled'))");
  });
});

describe("100D routes — safe, non-live, least privilege", () => {
  for (const [name, src] of [["events", eventsRoute], ["customer-status", customerRoute]] as const) {
    it(`${name}: runs on the node runtime and is disabled by default (404)`, () => {
      expect(src).toContain('export const runtime = "nodejs"');
      expect(src).toContain("if (!config.enabled) return NextResponse.json({ ok: false }, { status: 404 })");
    });
    it(`${name}: validates content-type, size, and shared-secret auth`, () => {
      expect(src).toContain("application/json");
      expect(src).toContain("maxBodyBytes");
      expect(src).toContain("verifySharedSecret");
      expect(src).toContain("status: 401");
    });
    it(`${name}: never uses the service-role key or the shared prod Supabase URL`, () => {
      expect(src).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(src).not.toContain("createServiceClient");
      // Pinned to the pilot via the dedicated resolver — must NOT read the shared prod URL directly.
      expect(src).toContain("resolve100DPilotTarget");
      expect(src).not.toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    });
  }
});

describe("100D never persists raw bodies and never logs secrets", () => {
  it("the normalizer does not read or store reply/email bodies", () => {
    for (const banned of ["reply_text", "reply_html", "email_text", "email_html", "reply_subject", "unibox_url"]) {
      expect(normalizeEventSrc).not.toContain(banned);
    }
  });
  it("auth never console.logs the secret or header value", () => {
    expect(authSrc).not.toContain("console.log");
    expect(authSrc).not.toContain("console.error");
  });
  it("routes never log the secret, headers, or body", () => {
    for (const src of [eventsRoute, customerRoute]) {
      expect(src).not.toContain("console.log");
      expect(src).not.toMatch(/console\.(log|error|info|warn)\([^)]*secret/i);
    }
  });
});
