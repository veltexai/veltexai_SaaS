import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function files(path: string): string[] { return readdirSync(path).flatMap((name) => { const item = join(path, name); return statSync(item).isDirectory() ? files(item) : [item]; }); }

describe("100C static safety boundaries", () => {
  const src = files(join(process.cwd(), "100X/100C/src")).map((f) => readFileSync(f, "utf8")).join("\n");
  const operator = files(join(process.cwd(), "100X/100C/operator")).filter((f) => !f.endsWith(".json")).map((f) => readFileSync(f, "utf8")).join("\n");
  const all = src + "\n" + operator;

  it("uses Instantly API V2 only — never a V1 endpoint", () => {
    expect(all).toContain("api.instantly.ai/api/v2");
    expect(all).not.toMatch(/instantly\.ai\/api\/v1/);
    expect(all).not.toMatch(/\/api\/v1\//);
  });
  it("exposes no campaign create/activate/update, email-send, webhook, route, cron, or schedule", () => {
    expect(all).not.toMatch(/campaigns\/(create|activate|pause|resume)/i);
    expect(all).not.toMatch(/POST[^\n]*\/campaigns\b/);           // no campaign creation
    expect(all).not.toMatch(/\/emails?\/send|send_email|sendEmail/i);
    expect(all).not.toMatch(/createWebhook|webhook_url|\/webhooks?\b/i);
    expect(all).not.toMatch(/createServer\(|\.listen\(|from ["']express|from ["']next/i);
    expect(all).not.toMatch(/node-cron|setInterval\(|cron\.schedule/i);
  });
  it("imports no email-sending or CRM outbound capability", () => {
    expect(src).not.toMatch(/from ["'].*(?:nodemailer|resend|mailgun|sendgrid|@sendgrid|smtp|hubspot)/i);
  });
  it("remains inactive and manual-only with capped defaults", () => {
    expect(src).toContain('env.VELTEX_100C_ENABLED === "true"');
    expect(src).toContain('trigger !== "manual"');
    expect(src).toContain("maxLeadsSubmitted");
  });
  it("sets explicit duplicate-skip flags and disables verification-on-import", () => {
    expect(src).toContain("skip_if_in_workspace: true");
    expect(src).toContain("skip_if_in_campaign: true");
    expect(src).toContain("skip_if_in_list: true");
    expect(src).toContain("verify_leads_on_import: false");
  });
  it("keeps the operator terminal-only, worker-JWT scoped, and service-role free", () => {
    expect(operator).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(operator).toContain("SUPABASE_100C_WORKER_JWT");
    expect(operator).toContain("LEADS_MAX_1");
  });
  it("routes all DB mutations through SECURITY DEFINER functions with a fixed search_path", () => {
    const sql = readFileSync(join(process.cwd(), "100X/100C/database/003_instantly_campaign_sync.sql"), "utf8");
    expect(sql).toContain("veltex_100c_worker nologin noinherit nobypassrls");
    expect(sql).toContain("security definer set search_path = pg_catalog, public");
    expect(sql).toContain("unique (contact_id, campaign_config_id)");
    expect(sql).not.toMatch(/service_role/);
  });
});
