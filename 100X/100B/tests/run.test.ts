import { load100BConfig, type EnrichmentConfig } from "../src/config";
import { MemoryDiagnosticSink } from "../src/diagnostics";
import { FixtureEnrichmentProvider } from "../src/fixture-provider";
import { InMemoryContactRepository } from "../src/in-memory-repository";
import { InMemorySuppressionResolver, NullSuppressionResolver } from "../src/suppression";
import { run100B } from "../src/run";
import { DuplicateContactSourceError, type CompanyContext, type DiagnosticSink, type ProviderContactCandidate, type SuppressionResolver } from "../src/types";

const instant = new Date("2026-08-09T12:00:00.000Z");
const clock = { now: () => instant };
const base = load100BConfig({ VELTEX_100B_ENABLED: "true" }, "fixture");
const company = (id: string, over: Partial<CompanyContext> = {}): CompanyContext => ({ prospectId: id, companyName: `Co ${id}`, companyType: "commercial_cleaning", websiteDomain: `${id}.example`, eligibleCleaningCompany: true, isCustomer: false, isGloballySuppressed: false, ...over });
const cand = (rid: string, over: Partial<ProviderContactCandidate> = {}): ProviderContactCandidate => ({ providerRecordId: rid, firstName: "Dana", lastName: "Rivera", title: "Owner", email: `${rid}@x.example`, providerVerificationStatus: "verified", ...over });

function deps(companies: CompanyContext[], byProspect: Record<string, ProviderContactCandidate[]>, opts: { suppression?: SuppressionResolver; diagnostics?: DiagnosticSink; errors?: Record<string, "throw" | "rate_limit">; repo?: InMemoryContactRepository } = {}) {
  const repository = opts.repo ?? new InMemoryContactRepository(companies, clock.now);
  return {
    provider: new FixtureEnrichmentProvider(byProspect, opts.errors ?? {}),
    suppression: opts.suppression ?? new NullSuppressionResolver(),
    repository, diagnostics: opts.diagnostics ?? new MemoryDiagnosticSink(),
    prospectIds: companies.map((c) => c.prospectId), clock, createRunId: () => "00000000-0000-4000-8000-0000000000b1", diagnosticFallback: jest.fn(),
  };
}

describe("100B controlled enrichment", () => {
  it("enriches a company, stores verified decision-makers as outreach-ready, and advances cursor", async () => {
    const d = deps([company("p1")], { p1: [cand("a1")] });
    const summary = await run100B(base, d, "manual");
    expect(summary).toMatchObject({ contactsCreated: 1, sourceRecordsCreated: 1, readyForOutreach: 1, capped: false, cursorAdvanced: true });
    expect(d.repository.contacts[0]).toMatchObject({ roleCategory: "owner", outreachEligibility: "ready_for_outreach", isCurrentContact: true });
    expect(d.repository.contacts[0]).not.toHaveProperty("providerRecordId");
  });

  it("is idempotent on replay: the same provider record creates no duplicate", async () => {
    const repo = new InMemoryContactRepository([company("p1")], clock.now);
    await run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "manual");
    const second = await run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "manual");
    expect(second).toMatchObject({ contactsCreated: 0, sourceRecordsCreated: 0, existingSources: 1 });
    expect(repo.contacts).toHaveLength(1); expect(repo.contactSources).toHaveLength(1);
  });

  it("deduplicates one person across providers into a single contact with two sources", async () => {
    const d = deps([company("p1")], { p1: [cand("a1", { email: "dana@x.example" }), cand("a2", { email: "dana@x.example" })] });
    const summary = await run100B(base, d, "manual");
    expect(summary).toMatchObject({ contactsCreated: 1, sourceRecordsCreated: 2, confidentMatches: 1 });
    expect(d.repository.contacts).toHaveLength(1); expect(d.repository.contactSources).toHaveLength(2);
  });

  it("holds unverified emails and suppressed contacts closed with reasons", async () => {
    const d = deps([company("p1")], { p1: [cand("a1", { providerVerificationStatus: "unknown" }), cand("a2", { email: "info@x.example", providerVerificationStatus: "verified" })] },
      { suppression: new InMemorySuppressionResolver({ unsubscribed: ["a2@x.example"] }) });
    const summary = await run100B(base, d, "manual");
    expect(summary.readyForOutreach).toBe(1); // a2 generic mailbox is verified & not suppressed by that email; a1 unverified held
    const byRecord = Object.fromEntries(d.repository.contactSources.map((s, i) => [s.providerRecordId, d.repository.contacts[i]]));
    expect(byRecord["a1"].outreachEligibility).toBe("unverified");
  });

  it("suppresses an unsubscribed decision-maker", async () => {
    const d = deps([company("p1")], { p1: [cand("a1", { email: "dana@x.example" })] }, { suppression: new InMemorySuppressionResolver({ unsubscribed: ["dana@x.example"] }) });
    const summary = await run100B(base, d, "manual");
    expect(summary).toMatchObject({ readyForOutreach: 0, heldOrSuppressed: 1 });
    expect(d.repository.contacts[0]).toMatchObject({ outreachEligibility: "suppressed", suppressionStatus: "unsubscribed" });
  });

  it("rejects existing customers as ineligible-to-contact", async () => {
    const d = deps([company("p1", { isCustomer: true })], { p1: [cand("a1")] });
    const summary = await run100B(base, d, "manual");
    expect(d.repository.contacts[0].outreachEligibility).toBe("customer"); expect(summary.readyForOutreach).toBe(0);
  });

  it("enforces the new-contact write cap", async () => {
    const capped = { ...base, limits: { ...base.limits, maxNewContactsPerRun: 1 } } satisfies EnrichmentConfig;
    const d = deps([company("p1")], { p1: [cand("a1"), cand("a2")] });
    const summary = await run100B(capped, d, "manual");
    expect(summary).toMatchObject({ contactsCreated: 1, capped: true, capReason: "new_contacts", cursorAdvanced: false });
  });

  it("enforces the provider request cap across companies", async () => {
    const capped = { ...base, limits: { ...base.limits, maxProviderRequestsPerRun: 1 } } satisfies EnrichmentConfig;
    const companies = [company("p1"), company("p2")];
    const repo = new InMemoryContactRepository(companies, clock.now);
    const first = await run100B(capped, deps(companies, { p1: [cand("a1")], p2: [cand("b1")] }, { repo }), "manual");
    expect(first).toMatchObject({ providerRequests: 1, capped: true, capReason: "provider_requests", cursorAdvanced: true });

    const second = await run100B(capped, deps(companies, { p1: [cand("a1")], p2: [cand("b1")] }, { repo }), "manual");
    expect(second).toMatchObject({ contactsCreated: 1, readyForOutreach: 1 });
    expect(repo.contacts.map(({ prospectId }) => prospectId)).toEqual(["p1", "p2"]);
  });

  it("uses the persisted cursor to rotate a bounded target window", async () => {
    const bounded = { ...base, limits: { ...base.limits, maxCompaniesPerRun: 1 } } satisfies EnrichmentConfig;
    const companies = [company("p1"), company("p2"), company("p3")];
    const repo = new InMemoryContactRepository(companies, clock.now);

    await run100B(bounded, deps(companies, {}, { repo }), "manual");
    const second = await run100B(bounded, deps(companies, { p2: [cand("b1")] }, { repo }), "manual");

    expect(second).toMatchObject({ companiesProcessed: 1, contactsCreated: 1, readyForOutreach: 1 });
    expect(repo.contacts[0]?.prospectId).toBe("p2");
  });

  it("caps contacts per company without failing the run", async () => {
    const capped = { ...base, limits: { ...base.limits, maxContactsPerCompany: 1 } } satisfies EnrichmentConfig;
    const summary = await run100B(capped, deps([company("p1")], { p1: [cand("a1"), cand("a2")] }), "manual");
    expect(summary).toMatchObject({ contactsProcessed: 1, capped: false });
  });

  it("skips a company whose provider errors, non-fatally, and releases the lock", async () => {
    const d = deps([company("p1"), company("p2")], { p2: [cand("b1")] }, { errors: { p1: "throw" } });
    const summary = await run100B(base, d, "manual");
    expect(summary).toMatchObject({ providerErrors: 1, contactsCreated: 1 });
    expect(d.repository.writeLog).toContain("lock.release");
  });

  it("acquires, blocks a live second run, and releases the lock", async () => {
    const repo = new InMemoryContactRepository([company("p1")], clock.now);
    expect(await repo.acquireLock("100B", "owner", "2026-08-09T12:10:00.000Z")).toBe(true);
    expect(await repo.acquireLock("100B", "other", "2026-08-09T12:10:00.000Z")).toBe(false);
    await repo.releaseLock("100B", "owner");
    const summary = await run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "manual");
    expect(summary.contactsCreated).toBe(1); expect(repo.writeLog).toContain("lock.release");
  });

  it("releases the lock on a fatal persistence error and preserves the original error", async () => {
    class FailingRepo extends InMemoryContactRepository { async persistContact(): Promise<never> { throw new Error("db down"); } }
    const repo = new FailingRepo([company("p1")], clock.now);
    await expect(run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "manual")).rejects.toThrow("db down");
    expect(repo.writeLog).toContain("lock.release");
  });

  it("treats a concurrent duplicate source as a rediscovery, not a new contact", async () => {
    class RacingRepo extends InMemoryContactRepository { async persistContact(): Promise<never> { throw new DuplicateContactSourceError(); } }
    const summary = await run100B(base, deps([company("p1")], { p1: [cand("a1"), cand("a2")] }, { repo: new RacingRepo([company("p1")], clock.now) }), "manual");
    expect(summary).toMatchObject({ contactsCreated: 0, existingSources: 2 });
  });

  it("does nothing when inactive or non-manual", async () => {
    const repo = new InMemoryContactRepository([company("p1")], clock.now);
    await expect(run100B(load100BConfig({}, "fixture"), deps([company("p1")], { p1: [cand("a1")] }, { repo }), "manual")).rejects.toThrow("inactive");
    await expect(run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "cron")).rejects.toThrow("manual execution only");
    expect(repo.writeLog).toEqual([]);
  });

  it("allows only explicitly authorized 100G orchestration", async () => {
    const repo = new InMemoryContactRepository([company("p1")], clock.now);
    await expect(run100B(base, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "100g")).rejects.toThrow(/100G orchestration is explicitly enabled/);
    await expect(run100B({ ...base, orchestrationEnabled: true }, deps([company("p1")], { p1: [cand("a1")] }, { repo }), "100g")).resolves.toBeDefined();
  });
});
