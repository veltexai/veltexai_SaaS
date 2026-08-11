import { readFileSync } from "fs";
import { resolve } from "path";
import { executeOperator, type OperatorFactories, type LocalSyncContext, type ProviderInspectContext } from "../operator/runtime";
import { FixtureOutboundProvider } from "../src/fixture-provider";
import { InMemorySyncRepository } from "../src/in-memory-repository";
import type { ApprovedCampaign, SyncCandidate } from "../src/types";
import type { ApprovedEnvironment } from "../operator/command";

const pilot: ApprovedEnvironment = { id: "100c-pilot", label: "Pilot", expectedSupabaseHostname: "pilot.supabase.co", approved: true, approvalReference: "ENV-1", controlledWritesAllowed: true, type: "pilot" };
const prod: ApprovedEnvironment = { ...pilot, id: "prod", type: "production" };
const campaign: ApprovedCampaign = { configId: "cfg1", instantlyCampaignId: "c-id", label: "L", segment: "s", environment: "100c-pilot", approved: true, approvalReference: "R", expectedWorkspaceId: null, allowedStates: ["draft", "paused"], dailySyncCap: 1, totalPilotCap: 1, active: true };
const jwt = `x.${Buffer.from(JSON.stringify({ role: "veltex_100c_worker" })).toString("base64url")}.x`;
const clock = () => new Date("2026-08-09T00:00:00Z");
const eligible: SyncCandidate = { canonicalContactId: "c1", canonicalProspectId: "p1", workEmail: "dir@biz.example.com", normalizedEmail: "dir@biz.example.com", firstName: "D", lastName: "D", fullName: "D D", title: "Owner", companyName: "Biz", website: "https://biz.example.com", outreachEligibility: "ready_for_outreach", emailVerificationStatus: "verified", suppressionStatus: "none", isCurrentContact: true, provider: "apollo", providerRecordId: "r1", lastVerifiedAt: "2026-08-08T00:00:00Z", eligibleCleaningCompany: true, isCustomer: false };

const records: Record<string, unknown>[] = [];
const output = { info: (r: Record<string, unknown>) => records.push(r) };
beforeEach(() => records.splice(0));

function factories(): OperatorFactories & { fixture: jest.Mock; provider: jest.Mock; controlled: jest.Mock } {
  const fixture = jest.fn((): LocalSyncContext => ({ provider: new FixtureOutboundProvider({ campaignState: "draft" }), repository: new InMemorySyncRepository([eligible], {}, clock), campaign }));
  const provider = jest.fn((): ProviderInspectContext => ({ provider: new FixtureOutboundProvider({ campaignState: "draft" }), campaign }));
  const controlled = jest.fn((): LocalSyncContext => ({ provider: new FixtureOutboundProvider({ campaignState: "draft" }), repository: new InMemorySyncRepository([eligible], {}, clock), campaign }));
  return { createFixtureContext: fixture, createProviderContext: provider, createControlledContext: controlled, fixture, provider, controlled };
}

describe("100C operator mode isolation & gating", () => {
  it("dry-run constructs nothing and reports validated-no-call", async () => {
    const f = factories();
    const result = await executeOperator(["--mode=dry-run", "--target=100c-pilot"], {}, [pilot], f, output);
    expect(f.fixture).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled(); expect(f.controlled).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("summary");
    expect(records).toContainEqual(expect.objectContaining({ outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 }));
  });
  it("fixture-preview runs offline in memory; provider/controlled never constructed", async () => {
    const f = factories();
    const result = await executeOperator(["--mode=fixture-preview", "--provider=fixture", "--target=100c-pilot"], {}, [pilot], f, output);
    expect(f.fixture).toHaveBeenCalledTimes(1); expect(f.provider).not.toHaveBeenCalled(); expect(f.controlled).not.toHaveBeenCalled();
    expect(result.summary?.submitted).toBe(1);
  });
  it("provider-preview inspects campaign state read-only; never constructs the controlled context", async () => {
    const f = factories();
    const result = await executeOperator(["--mode=provider-preview", "--provider=instantly", "--target=100c-pilot", "--campaign=cfg1"], { INSTANTLY_API_KEY: "k" }, [pilot], f, output);
    expect(f.provider).toHaveBeenCalledTimes(1); expect(f.controlled).not.toHaveBeenCalled();
    expect(result.campaign).toMatchObject({ configId: "cfg1", state: "draft", safe: true });
    expect(records).toContainEqual(expect.objectContaining({ warning: expect.stringContaining("no lead creation") }));
  });
  it("controlled-write is disabled by default (no enable/confirmations) and constructs nothing", async () => {
    const f = factories();
    await expect(executeOperator(["--mode=controlled-write", "--provider=instantly", "--target=100c-pilot", "--campaign=cfg1"], {}, [pilot], f, output)).rejects.toThrow();
    expect(f.controlled).not.toHaveBeenCalled();
  });
  it("controlled-write constructs clients only after every gate passes", async () => {
    const f = factories();
    const env = { VELTEX_100C_ENABLED: "true", VELTEX_100C_TARGET_ENVIRONMENT: "100c-pilot", INSTANTLY_API_KEY: "k", NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_100C_WORKER_JWT: jwt };
    await executeOperator(["--mode=controlled-write", "--provider=instantly", "--target=100c-pilot", "--campaign=cfg1", "--confirm-target=100c-pilot", "--confirm-campaign=cfg1", "--confirm-writes=LEADS_MAX_1"], env, [pilot], f, output);
    expect(f.controlled).toHaveBeenCalledTimes(1);
  });
  it("rejects production unconditionally", async () => {
    const f = factories();
    await expect(executeOperator(["--mode=dry-run", "--target=prod"], {}, [prod], f, output)).rejects.toThrow(/production is prohibited/);
  });
});

// Ratchet re-pinned 2026-08-10: the repo ships the founder-approved pilot config
// (100C-INSTANTLY-PILOT-CAMPAIGN-APPROVED-2026-08-09). The single founder-authorized one-contact
// controlled synchronization completed on 2026-08-10 and controlled writes have been re-locked
// Founder approved live sending and automation on 2026-08-11. These tests lock the exact campaign,
// environment, workspace, approval reference, and explicit active-state authorization.
describe("100C shipped config is pinned to the approved pilot", () => {
  it("environments.json ships exactly the founder-approved live pilot", () => {
    const envs = JSON.parse(readFileSync(resolve(process.cwd(), "100X/100C/operator/environments.json"), "utf8"));
    expect(envs).toHaveLength(1);
    expect(envs[0].id).toBe("100c-pilot");
    expect(envs[0].type).toBe("pilot");
    expect(envs[0].approved).toBe(true);
    expect(envs[0].expectedSupabaseHostname).toBe("wzpgbbwdqtpyfiojowdj.supabase.co");
    expect(envs[0].controlledWritesAllowed).toBe(true);
  });
  it("campaigns.json ships exactly one approved active campaign with hard ceilings", () => {
    const campaigns = JSON.parse(readFileSync(resolve(process.cwd(), "100X/100C/operator/campaigns.json"), "utf8")).campaigns;
    expect(campaigns).toHaveLength(1);
    const c = campaigns[0];
    expect(c.configId).toBe("veltex-100c-pilot-no-send");
    expect(c.instantlyCampaignId).toBe("c01e55de-f1c8-4a0c-9817-13fe7456ab66");
    expect(c.environment).toBe("100c-pilot");
    expect(c.approved).toBe(true);
    expect(c.active).toBe(true);
    expect(c.approvalReference).toBe("FOUNDER-LIVE-SEND-APPROVED-2026-08-11");
    expect(c.expectedWorkspaceId).toBe("698b2090-f4d5-484b-a0b1-44016fee7515");
    expect(c.allowedStates).toEqual(["active"]);
    expect(c.dailySyncCap).toBe(500);
    expect(c.totalPilotCap).toBe(50000);
  });
  it("the shipped approved environment now passes dry-run while constructing nothing", async () => {
    const f = factories();
    const envs = JSON.parse(readFileSync(resolve(process.cwd(), "100X/100C/operator/environments.json"), "utf8"));
    const result = await executeOperator(["--mode=dry-run", "--target=100c-pilot"], {}, envs, f, output);
    expect(f.fixture).not.toHaveBeenCalled(); expect(f.provider).not.toHaveBeenCalled(); expect(f.controlled).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty("summary");
    expect(records).toContainEqual(expect.objectContaining({ outcome: "validated-no-call", externalClientsConstructed: 0, databaseWrites: 0 }));
  });
});
