import { executeOperator, type FixtureFile } from "../operator/runtime";
import { toAllowlist } from "../operator/command";
import type { AllowlistCampaign } from "../src/allowlist";

const WS = "698b2090-f4d5-484b-a0b1-44016fee7515";
const CID = "c01e55de-f1c8-4a0c-9817-13fe7456ab66";
const campaigns: AllowlistCampaign[] = [{ configId: "cfg", instantlyCampaignId: CID, expectedWorkspaceId: WS, approved: true, active: true }];

const fixture: FixtureFile = {
  assignments: [{ contactId: "c1", campaignConfigId: "cfg", normalizedEmail: "dir@co.example", hasLeadMapping: true }],
  lateAssignments: [{ contactId: "c2", campaignConfigId: "cfg", normalizedEmail: "late@co.example", hasLeadMapping: false }],
  instantlyEvents: [
    { event_type: "email_sent", workspace: WS, campaign_id: CID, lead_email: "dir@co.example", timestamp: "2026-08-10T00:01:00.000Z" },
    { event_type: "email_bounced", workspace: WS, campaign_id: CID, lead_email: "dir@co.example", timestamp: "2026-08-10T00:03:00.000Z" },
    { event_type: "email_opened", workspace: WS, campaign_id: CID, lead_email: "late@co.example", timestamp: "2026-08-10T00:04:00.000Z" },
    { event_type: "email_sent", workspace: "00000000-0000-4000-8000-000000000999", campaign_id: CID, lead_email: "dir@co.example", timestamp: "2026-08-10T00:06:00.000Z" },
  ],
  customerStatusEvents: [{ status: "subscription_active", email: "owner@co.example" }],
};

const run = async (args: string[], env: Record<string, string | undefined> = {}) => {
  const records: Record<string, unknown>[] = [];
  await executeOperator(args, env, campaigns, () => fixture, { info: (r) => records.push(r) });
  return records;
};

describe("100D operator modes (offline, non-live)", () => {
  it("dry-run validates config + allowlist and constructs nothing", async () => {
    const [rec] = await run(["--mode=dry-run"]);
    expect(rec).toMatchObject({ outcome: "validated-no-call", enabled: false, externalClientsConstructed: 0, databaseWrites: 0, approvedCampaigns: 1 });
  });
  it("fixture-preview processes matched events, applies suppression, holds unmatched, rejects wrong workspace", async () => {
    const [rec] = await run(["--mode=fixture-preview"]);
    const instantly = rec.instantly as Record<string, number>;
    expect(instantly.processed).toBeGreaterThanOrEqual(2); // sent + bounce matched
    expect(instantly.suppressionsApplied).toBeGreaterThanOrEqual(1);
    expect(instantly.held_unmatched).toBeGreaterThanOrEqual(1); // late@ not yet assigned
    expect(instantly.rejected_allowlist).toBeGreaterThanOrEqual(1); // wrong workspace
    expect(rec.suppressions as number).toBeGreaterThanOrEqual(1);
  });
  it("local-route-test exercises the shared-secret auth cases", async () => {
    const [rec] = await run(["--mode=local-route-test"], { VELTEX_100D_WEBHOOK_SECRET: "a-strong-100d-webhook-secret-value" });
    const auth = rec.auth as Array<{ case: string; auth: boolean }>;
    expect(auth.find((a) => a.case === "correct-secret")?.auth).toBe(true);
    expect(auth.find((a) => a.case === "missing-secret")?.auth).toBe(false);
    expect(auth.find((a) => a.case === "wrong-secret")?.auth).toBe(false);
    expect(rec.wrongWorkspace).toBe("rejected_allowlist");
  });
  it("reconciliation-preview links held events after late assignments appear", async () => {
    const [rec] = await run(["--mode=reconciliation-preview"]);
    expect(rec.unmatchedBefore as number).toBeGreaterThanOrEqual(1);
    expect(rec.reconciled as number).toBeGreaterThanOrEqual(1);
  });
  it("rejects an unknown mode", async () => {
    await expect(run(["--mode=nope"])).rejects.toThrow(/mode/);
  });
  it("toAllowlist maps the 100C campaigns file shape", () => {
    const rows = toAllowlist({ campaigns: [{ configId: "x", instantlyCampaignId: "y", expectedWorkspaceId: "z", approved: true, active: true }] });
    expect(rows[0]).toMatchObject({ configId: "x", instantlyCampaignId: "y", expectedWorkspaceId: "z", approved: true, active: true });
  });
});
