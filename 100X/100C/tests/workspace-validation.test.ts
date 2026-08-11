import { assertWorkspaceAllowed } from "../src/campaign-allowlist";
import { InstantlyOutboundProvider } from "../src/instantly-provider";
import { INSTANTLY_ENDPOINTS } from "../src/instantly-config";
import { run100C } from "../src/run";
import { InMemorySyncRepository } from "../src/in-memory-repository";
import { FixtureOutboundProvider } from "../src/fixture-provider";
import { MemoryDiagnosticSink } from "../src/diagnostics";
import { APPROVED_PILOT_SYNC_LIMITS } from "../src/config";
import type { ApprovedCampaign, SyncCandidate, SyncConfig } from "../src/types";

const WS = "11111111-1111-4111-8111-111111111111";
const withWs = (over: Partial<ApprovedCampaign> = {}): ApprovedCampaign => ({ configId: "cfg1", instantlyCampaignId: "c-id", label: "L", segment: "s", environment: "100c-pilot", approved: true, approvalReference: "R", expectedWorkspaceId: WS, allowedStates: ["draft", "paused"], dailySyncCap: 1, totalPilotCap: 1, active: true, ...over });

describe("C1 fail-closed workspace validation — unit", () => {
  const c = withWs();
  it("passes when expected matches observed", () => expect(() => assertWorkspaceAllowed(c, WS)).not.toThrow());
  it("rejects when observed differs", () => expect(() => assertWorkspaceAllowed(c, "22222222-2222-4222-8222-222222222222")).toThrow(/does not match/));
  it("rejects when expected is configured but observed is missing (null)", () => expect(() => assertWorkspaceAllowed(c, null)).toThrow(/none was returned/));
  it("rejects when observed is blank", () => expect(() => assertWorkspaceAllowed(c, "   ")).toThrow(/none was returned/));
  it("rejects when observed is malformed", () => expect(() => assertWorkspaceAllowed(c, "!!")).toThrow(/malformed/));
  it("does not throw when no expected workspace is configured (null observed acceptable)", () => expect(() => assertWorkspaceAllowed(withWs({ expectedWorkspaceId: null }), null)).not.toThrow());
});

describe("C1 adapter parses Instantly `organization` as observed workspace", () => {
  it("reads organization into observedWorkspaceId", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ id: "c-id", status: 0, organization: WS }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const out = await new InstantlyOutboundProvider("k", fetchImpl as any, { sleep: async () => {} }).getCampaignState("c-id", 4);
    expect(out.observedWorkspaceId).toBe(WS);
    expect(fetchImpl.mock.calls[0][0]).toBe(INSTANTLY_ENDPOINTS.campaignById("c-id"));
  });
  it("yields null observed workspace when organization is absent", async () => {
    const fetchImpl = jest.fn(async () => new Response(JSON.stringify({ id: "c-id", status: 0 }), { status: 200, headers: { "Content-Type": "application/json" } }));
    expect((await new InstantlyOutboundProvider("k", fetchImpl as any, { sleep: async () => {} }).getCampaignState("c-id", 4)).observedWorkspaceId).toBeNull();
  });
});

describe("C1 run fails closed on workspace mismatch/absence — no reservation or lead", () => {
  const cfg: SyncConfig = { enabled: true, manualOnly: true, lockTtlMs: APPROVED_PILOT_SYNC_LIMITS.lockTtlMs, provider: "fixture", limits: { maxContactsConsidered: 5, maxLeadsSubmitted: 1, maxInstantlyWriteRequests: 1, maxProviderRequestsPerRun: 4, maxRunDurationMs: 600000, maxEligibilityAgeMs: 14 * 24 * 3600 * 1000 } };
  const clock = { now: () => new Date("2026-08-09T00:00:00Z") };
  const cand: SyncCandidate = { canonicalContactId: "c1", canonicalProspectId: "p1", workEmail: "d@biz.example.com", normalizedEmail: "d@biz.example.com", firstName: "D", lastName: "D", fullName: "D D", title: "Owner", companyName: "Biz", website: "https://biz.example.com", outreachEligibility: "ready_for_outreach", emailVerificationStatus: "verified", suppressionStatus: "none", isCurrentContact: true, provider: "apollo", providerRecordId: "r1", lastVerifiedAt: "2026-08-08T00:00:00Z", eligibleCleaningCompany: true, isCustomer: false };
  const go = (script: any, campaign: ApprovedCampaign) => {
    const repo = new InMemorySyncRepository([cand], {}, clock.now);
    return { repo, provider: new FixtureOutboundProvider(script), run: run100C(cfg, { provider: new FixtureOutboundProvider(script), repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign, clock, createRunId: () => "run-1" }, "manual") };
  };

  it("mismatch rejects before reservation", async () => {
    const repo = new InMemorySyncRepository([cand], {}, clock.now);
    const provider = new FixtureOutboundProvider({ campaignState: "draft", observedWorkspaceId: "99999999-9999-4999-8999-999999999999" });
    await expect(run100C(cfg, { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: withWs(), clock, createRunId: () => "run-1" }, "manual")).rejects.toThrow(/workspace does not match/);
    expect(repo.assignments).toHaveLength(0);
    expect(provider.getAccounting().leadWrites).toBe(0);
  });
  it("missing observed workspace rejects when one is expected", async () => {
    const repo = new InMemorySyncRepository([cand], {}, clock.now);
    const provider = new FixtureOutboundProvider({ campaignState: "draft", observedWorkspaceId: null });
    await expect(run100C(cfg, { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: withWs(), clock, createRunId: () => "run-1" }, "manual")).rejects.toThrow(/none was returned/);
    expect(repo.assignments).toHaveLength(0);
  });
  it("matching workspace proceeds to submit", async () => {
    const repo = new InMemorySyncRepository([cand], {}, clock.now);
    const provider = new FixtureOutboundProvider({ campaignState: "draft", observedWorkspaceId: WS });
    const s = await run100C(cfg, { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: withWs(), clock, createRunId: () => "run-1" }, "manual");
    expect(s.submitted).toBe(1);
  });
});
