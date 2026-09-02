import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("100G scheduled-route authentication", () => {
  it("accepts either the dedicated workflow secret or Vercel CRON_SECRET", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/internal/100x/orchestrate/route.ts"),
      "utf8",
    );

    expect(route).toContain("authorized(presented, process.env.VELTEX_100G_CRON_SECRET)");
    expect(route).toContain("authorized(presented, process.env.CRON_SECRET)");
    expect(route).toContain("!workflowAuthorized && !vercelCronAuthorized");
    expect(route).not.toContain("VELTEX_100G_CRON_SECRET ?? process.env.CRON_SECRET");
    expect(route).toContain('req.nextUrl.searchParams.get("lane")');
    expect(route).toContain('requestedRehearsal === "100B" && req.nextUrl.searchParams.get("provider") === "hunter"');
    expect(route).toContain("enrichmentMode,");
  });
});
