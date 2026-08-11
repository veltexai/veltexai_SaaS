import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function files(path: string): string[] { return readdirSync(path).flatMap((name) => { const item = join(path, name); return statSync(item).isDirectory() ? files(item) : [item]; }); }
describe("100A static safety boundaries", () => {
  const source = files(join(process.cwd(), "100X/100A/src")).map((file) => readFileSync(file, "utf8")).join("\n");
  const operator = files(join(process.cwd(), "100X/100A/operator")).filter((file) => !file.endsWith(".json")).map((file) => readFileSync(file, "utf8")).join("\n");
  it("contains no outreach, CRM, email, cron, proposal, pricing, or billing capability", () => {
    expect(source).not.toMatch(/from ["'].*(?:instantly|apollo|hubspot|nodemailer|resend|email|proposal|pricing|billing|cron)/i);
    expect(source).not.toMatch(/sendEmail|createCampaign|createContact|createDeal/i);
  });
  it("remains inactive and manual-only with a five-record pilot default", () => {
    expect(source).toContain('env.VELTEX_100A_ENABLED === "true"');
    expect(source).toContain('trigger !== "manual"');
    expect(source).toContain('VELTEX_100A_MAX_NEW_PROSPECTS, 5');
  });
  it("keeps the operator terminal-only and rejects broad service-role composition", () => {
    expect(operator).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(operator).not.toMatch(/from ["']next|createServer\(|\.listen\(/i);
    expect(operator).toContain("SUPABASE_100A_WORKER_JWT");
    expect(operator).toContain("WRITE_MAX_5");
  });
});
