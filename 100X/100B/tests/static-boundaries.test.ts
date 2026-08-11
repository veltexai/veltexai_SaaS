import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function files(path: string): string[] { return readdirSync(path).flatMap((name) => { const item = join(path, name); return statSync(item).isDirectory() ? files(item) : [item]; }); }
describe("100B static safety boundaries", () => {
  const source = files(join(process.cwd(), "100X/100B/src")).map((f) => readFileSync(f, "utf8")).join("\n");
  const operator = files(join(process.cwd(), "100X/100B/operator")).filter((f) => !f.endsWith(".json")).map((f) => readFileSync(f, "utf8")).join("\n");
  it("imports no outreach, email-sending, or CRM capability", () => {
    expect(source).not.toMatch(/from ["'].*(?:instantly|hubspot|nodemailer|resend|mailgun|sendgrid|@sendgrid|smtp)/i);
    expect(source).not.toMatch(/sendEmail|createCampaign|instantlyClient|sendOutreach/i);
    expect(operator).not.toMatch(/from ["'].*(?:instantly|hubspot|nodemailer|resend)/i);
  });
  it("remains inactive and manual-only with capped enrichment defaults", () => {
    expect(source).toContain('env.VELTEX_100B_ENABLED === "true"');
    expect(source).toContain('trigger !== "manual"');
    expect(source).toContain("VELTEX_100B_MAX_NEW_CONTACTS");
    expect(source).toContain("normalizeEmail");
  });
  it("keeps Apollo enrichment cost/PII features disabled by default and webhook-free", () => {
    // The pilot flags must be present and false; nothing may enable phone/personal/waterfall or a webhook.
    expect(source).toContain("reveal_personal_emails: false");
    expect(source).toContain("reveal_phone_number: false");
    expect(source).toContain("run_waterfall_email: false");
    expect(source).toContain("run_waterfall_phone: false");
    expect(source).not.toMatch(/reveal_personal_emails:\s*true/);
    expect(source).not.toMatch(/reveal_phone_number:\s*true/);
    expect(source).not.toMatch(/run_waterfall_(?:email|phone):\s*true/);
    expect(source).not.toMatch(/webhook_url/);
    // People Search must be the api_search endpoint and must never be mined for emails.
    expect(source).toContain("mixed_people/api_search");
    expect(source).toContain("people/match");
  });
  it("binds fixture-preview and provider-preview to distinct, non-interchangeable input files", () => {
    // Synthetic fixtures and approved real targets must never share a loader.
    expect(operator).toContain("enrichment-fixtures.json");
    expect(operator).toContain("provider-preview-targets.json");
    // provider-preview must select approved targets (fail-closed) before building the Apollo client.
    expect(operator).toContain("selectApprovedTargets");
    expect(operator).toContain("loadProviderPreviewTargets");
  });
  it("keeps the operator terminal-only, worker-JWT scoped, and service-role free", () => {
    expect(operator).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(operator).not.toMatch(/from ["']next|createServer\(|\.listen\(/i);
    expect(operator).toContain("SUPABASE_100B_WORKER_JWT");
    expect(operator).toContain("CONTACTS_MAX_10");
  });
});
