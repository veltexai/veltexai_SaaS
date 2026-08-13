import { run100C } from "../src/run";
import { InMemorySyncRepository } from "../src/in-memory-repository";
import { FixtureOutboundProvider } from "../src/fixture-provider";
import { MemoryDiagnosticSink } from "../src/diagnostics";
import { APPROVED_PILOT_SYNC_LIMITS, type SyncConfig } from "../src/config";
import type { ApprovedCampaign, CampaignState, SyncCandidate } from "../src/types";

const config = (over: Partial<SyncConfig["limits"]> = {}): SyncConfig => ({
  enabled: true, manualOnly: true, lockTtlMs: APPROVED_PILOT_SYNC_LIMITS.lockTtlMs, provider: "fixture",
  limits: { maxContactsConsidered: 5, maxLeadsSubmitted: 1, maxInstantlyWriteRequests: 1, maxProviderRequestsPerRun: 4, maxRunDurationMs: 600000, maxEligibilityAgeMs: 14 * 24 * 3600 * 1000, ...over },
});
const campaign: ApprovedCampaign = { configId: "cfg1", instantlyCampaignId: "c-id", label: "L", segment: "s", environment: "100c-pilot", approved: true, approvalReference: "R", expectedWorkspaceId: null, allowedStates: ["draft", "paused"], dailySyncCap: 1, totalPilotCap: 1, active: true };
const clock = { now: () => new Date("2026-08-09T00:00:00Z") };
const cand = (id: string, over: Partial<SyncCandidate> = {}): SyncCandidate => ({
  canonicalContactId: id, canonicalProspectId: "p-" + id, workEmail: `${id}@biz.example.com`, normalizedEmail: `${id}@biz.example.com`,
  firstName: "A", lastName: "B", fullName: "A B", title: "Owner", companyName: "Biz", website: "https://biz.example.com",
  outreachEligibility: "ready_for_outreach", emailVerificationStatus: "verified", suppressionStatus: "none", isCurrentContact: true,
  provider: "apollo", providerRecordId: "r-" + id, lastVerifiedAt: "2026-08-08T00:00:00Z", eligibleCleaningCompany: true, isCustomer: false, ...over,
});
const run = (repo: InMemorySyncRepository, provider: FixtureOutboundProvider, cfg = config(), camp = campaign) =>
  run100C(cfg, { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: camp, clock, createRunId: () => "run-1" }, "manual");

describe("100C sync runner", () => {
  it("is disabled by default (assertSafeToRun)", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    await expect(run100C({ ...config(), enabled: false }, { provider: new FixtureOutboundProvider(), repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign }, "manual")).rejects.toThrow(/inactive/);
  });
  it("reads campaign state before submitting and fails closed on an active campaign", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    await expect(run(repo, new FixtureOutboundProvider({ campaignState: "active" }))).rejects.toThrow(/active/);
    expect(repo.assignments).toHaveLength(0); // nothing reserved
  });
  it("submits exactly one eligible verified contact and records a lead mapping", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft" }));
    expect(s.submitted).toBe(1);
    expect(repo.assignments[0].state).toBe("submitted");
    expect(repo.leadMappings).toHaveLength(1);
  });
  it("reactivates a completed campaign only after a verified lead is submitted and the gate is explicit", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const provider = new FixtureOutboundProvider({ campaignState: "completed" });
    const completed = { ...campaign, allowedStates: ["completed"] as CampaignState[] };
    const s = await run100C(
      { ...config(), allowCompletedCampaignReactivation: true },
      { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: completed, clock, createRunId: () => "run-1" },
      "manual",
    );
    expect(s).toMatchObject({ submitted: 1, campaignReactivated: true, providerRequests: 3 });
    expect(provider.getAccounting()).toMatchObject({ campaignReads: 1, leadWrites: 1, campaignWrites: 1 });
  });
  it("never activates a completed campaign when no lead was submitted", async () => {
    const repo = new InMemorySyncRepository([cand("c1", { suppressionStatus: "unsubscribed" })], {}, clock.now);
    const provider = new FixtureOutboundProvider({ campaignState: "completed" });
    const completed = { ...campaign, allowedStates: ["completed"] as CampaignState[] };
    const s = await run100C(
      { ...config(), allowCompletedCampaignReactivation: true },
      { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign: completed, clock, createRunId: () => "run-1" },
      "manual",
    );
    expect(s).toMatchObject({ submitted: 0, campaignReactivated: false });
    expect(provider.getAccounting().campaignWrites).toBe(0);
  });
  it("fails closed on completed without the separate continuity gate", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const completed = { ...campaign, allowedStates: ["completed"] as CampaignState[] };
    await expect(run(repo, new FixtureOutboundProvider({ campaignState: "completed" }), config(), completed)).rejects.toThrow(/reactivation requires explicit authorization/);
  });
  it("prevents duplicate campaign submission (unique reserve) and is replay-idempotent", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    await run(repo, new FixtureOutboundProvider({ campaignState: "draft" }));
    const second = await run(repo, new FixtureOutboundProvider({ campaignState: "draft" }));
    expect(second.submitted).toBe(0);
    expect(second.skippedDuplicate).toBe(1);
    expect(repo.assignments).toHaveLength(1); // still one assignment
  });
  it("routes an ambiguous create outcome to reconciliation_required (no blind retry) when reconcile finds nothing", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft", createByEmail: { "c1@biz.example.com": "ambiguous" }, reconcileByEmail: {} }));
    expect(s.reconciliationRequired).toBe(1);
    expect(s.submitted).toBe(0);
    expect(repo.assignments[0].state).toBe("reconciliation_required");
  });
  it("resolves an ambiguous outcome to submitted when reconciliation finds the lead", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft", createByEmail: { "c1@biz.example.com": "ambiguous" }, reconcileByEmail: { "c1@biz.example.com": true } }));
    expect(s.submitted).toBe(1);
    expect(repo.assignments[0].state).toBe("submitted");
    expect(repo.leadMappings).toHaveLength(1);
  });
  it("skips a suppressed / unverified / stale contact and never reserves it", async () => {
    const candidates = [cand("c1", { suppressionStatus: "unsubscribed" }), cand("c2", { emailVerificationStatus: "accept_all" }), cand("c3", { lastVerifiedAt: "2000-01-01T00:00:00Z" })];
    const repo = new InMemorySyncRepository(candidates, {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft" }));
    expect(s.suppressed).toBe(1); expect(s.ineligible).toBe(1); expect(s.stale).toBe(1);
    expect(s.submitted).toBe(0); expect(repo.assignments).toHaveLength(0);
  });
  it("honors the one-lead pilot cap across multiple eligible contacts", async () => {
    const repo = new InMemorySyncRepository([cand("c1"), cand("c2")], {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft" }));
    expect(s.submitted).toBe(1); expect(s.capped).toBe(true); expect(s.capReason).toBe("leads");
  });
  it("records a skipped_duplicate when the provider skips the lead", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    const s = await run(repo, new FixtureOutboundProvider({ campaignState: "draft", createByEmail: { "c1@biz.example.com": "skipped_duplicate" } }));
    expect(s.skippedDuplicate).toBe(1); expect(s.submitted).toBe(0);
    expect(repo.assignments[0].state).toBe("skipped_duplicate");
  });
});

describe("100C durable registry + final freshness (C2/C4) through the runner", () => {
  const rows = (kind: string, matchedBy: "email" | "domain", email?: string, domain?: string): any => ([{ normalizedEmail: email ?? null, normalizedDomain: domain ?? null, entry: { kind, matchedBy, source: "pilot_seed", reason: null, externalReference: null, occurredAt: "2026-08-09T00:00:00Z" } }]);

  it("blocks an existing customer from the registry and never reserves or writes", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now, rows("existing_customer", "email", "c1@biz.example.com"));
    const provider = new FixtureOutboundProvider({ campaignState: "draft" });
    const s = await run100C(config(), { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign, clock, createRunId: () => "run-1" }, "manual");
    expect(s.ineligible).toBe(1); expect(s.submitted).toBe(0);
    expect(repo.assignments).toHaveLength(0);
    expect(provider.getAccounting().leadWrites).toBe(0);
  });

  it("blocks a domain-suppressed contact from the registry", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now, rows("do_not_contact", "domain", undefined, "biz.example.com"));
    const s = await run100C(config(), { provider: new FixtureOutboundProvider({ campaignState: "draft" }), repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign, clock, createRunId: () => "run-1" }, "manual");
    expect(s.suppressed).toBe(1); expect(s.submitted).toBe(0);
  });

  it("fails closed and constructs no lead when the registry read throws", async () => {
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    (repo as any).loadSuppressionRegistry = async () => { throw new Error("registry unavailable"); };
    const provider = new FixtureOutboundProvider({ campaignState: "draft" });
    const s = await run100C(config(), { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign, clock, createRunId: () => "run-1" }, "manual");
    expect(s.ineligible).toBe(1); expect(s.submitted).toBe(0);
    expect(provider.getAccounting().leadWrites).toBe(0);
  });

  it("the FINAL pre-submit recheck cancels a reservation and creates NO lead when state changes after reserve", async () => {
    // Registry is clean on the first (pre-reserve) read but returns a suppression on the second
    // (pre-submit) read — proving the final freshness gate blocks before any lead-create request.
    const repo = new InMemorySyncRepository([cand("c1")], {}, clock.now);
    let calls = 0;
    (repo as any).loadSuppressionRegistry = async () => { calls += 1; return calls >= 2 ? [{ kind: "hard_bounce", matchedBy: "email", source: "event", reason: null, externalReference: null, occurredAt: "2026-08-09T00:00:00Z" }] : []; };
    const provider = new FixtureOutboundProvider({ campaignState: "draft" });
    const s = await run100C(config(), { provider, repository: repo, diagnostics: new MemoryDiagnosticSink(), campaign, clock, createRunId: () => "run-1" }, "manual");
    expect(s.submitted).toBe(0);
    expect(s.suppressed).toBe(1);
    expect(provider.getAccounting().leadWrites).toBe(0);      // NO lead-create request constructed
    expect(repo.assignments[0].state).toBe("suppressed");     // reservation transitioned, not submitted
  });
});
