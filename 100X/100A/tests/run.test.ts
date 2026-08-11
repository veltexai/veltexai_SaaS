import { load100AConfig, type DiscoveryConfig } from "../src/config";
import { MemoryDiagnosticSink } from "../src/diagnostics";
import { GooglePlacesTextSearchClient } from "../src/google-places";
import { InMemoryProspectRepository } from "../src/in-memory-repository";
import { RulesCleaningQualifier } from "../src/qualifier";
import { run100A } from "../src/run";
import { DuplicateSourceRecordError, type DiagnosticSink, type PlacesCandidate, type PlacesClient } from "../src/types";

const instant = new Date("2026-08-06T12:00:00.000Z");
const clock = { now: () => instant };
const base = load100AConfig({ VELTEX_100A_ENABLED: "true" }, [{ id: "sea", label: "Seattle, WA" }, { id: "pdx", label: "Portland, OR" }]);
const config: DiscoveryConfig = { ...base, searchTerms: ["commercial cleaning"] };
const candidate = (id: string, overrides: Partial<PlacesCandidate> = {}): PlacesCandidate => ({ id, displayName: { text: `Commercial Cleaning ${id}` }, websiteUri: `https://${id}.example`, nationalPhoneNumber: `206555${id.padStart(4,"0").slice(-4)}`, primaryType: "cleaning_service", ...overrides });
const pageClient = (candidates: PlacesCandidate[], nextPageToken: string | null = null): PlacesClient => ({ searchText: async () => ({ candidates, nextPageToken, requestsUsed: 1 }) });
function dependencies(repository = new InMemoryProspectRepository(clock.now), places: PlacesClient = pageClient([candidate("1")]), diagnostics: DiagnosticSink = new MemoryDiagnosticSink()) {
  return { repository, places, qualifier: new RulesCleaningQualifier(), diagnostics, clock, createRunId: () => "00000000-0000-4000-8000-000000000001", diagnosticFallback: jest.fn() };
}

describe("100A controlled discovery", () => {
  it("accounts retries and multiple searches against one combined run budget", async () => {
    const response = (status = 200) => new Response(JSON.stringify(status === 200 ? { places: [] } : {}), { status });
    const fetcher = jest.fn().mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response()).mockResolvedValueOnce(response());
    const places = new GooglePlacesTextSearchClient("test-key", fetcher, { maxAttempts: 3, maxRequestsPerSearch: 3, sleep: async () => {} });
    const bounded = { ...config, searchTerms: ["one", "two"], limits: { ...config.limits, maxPlacesRequestsPerRun: 3 } };
    await expect(run100A(bounded, dependencies(undefined, places), "manual")).resolves.toMatchObject({ placesRequests: 3, capped: false });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("reuses one Google client across idempotency runs with a fresh budget each time", async () => {
    const payload = { places: [candidate("shared")] };
    const fetcher = jest.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const places = new GooglePlacesTextSearchClient("test-key", fetcher, { maxRequestsPerSearch: 1 });
    const repository = new InMemoryProspectRepository(clock.now);
    const oneRequest = { ...config, geographies: [{ id: "sea", label: "Seattle, WA" }], limits: { ...config.limits, maxPlacesRequestsPerRun: 1 } };
    await expect(run100A(oneRequest, dependencies(repository, places), "manual")).resolves.toMatchObject({ placesRequests: 1, canonicalProspectsCreated: 1 });
    await expect(run100A(oneRequest, dependencies(repository, places), "manual")).resolves.toMatchObject({ placesRequests: 1, existingSources: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("creates provider-neutral canonical and Google source records idempotently", async () => {
    const deps = dependencies();
    const first = await run100A(config, deps, "manual");
    expect(first).toMatchObject({ canonicalProspectsCreated: 1, sourceRecordsCreated: 1, capped: false, cursorAdvanced: true });
    expect(deps.repository.prospects[0]).not.toHaveProperty("providerRecordId");
    expect(deps.repository.sourceRecords[0]).toMatchObject({ provider: "google_places", providerRecordId: "1", qualification: { method: "rules" } });
    const second = await run100A(config, deps, "manual");
    expect(second).toMatchObject({ canonicalProspectsCreated: 0, sourceRecordsCreated: 0, existingSources: 1 });
    expect(deps.repository.prospects).toHaveLength(1); expect(deps.repository.sourceRecords).toHaveLength(1);
  });

  it("never creates over five prospects across terms, pages, or repeated candidates", async () => {
    const candidates = Array.from({ length: 8 }, (_, index) => candidate(String(index + 1)));
    const cappedConfig = { ...base, searchTerms: ["commercial cleaning", "office cleaning"], limits: { ...base.limits, maxPagesPerSearch: 2 } };
    const deps = dependencies(undefined, pageClient([...candidates, candidates[0]], "next"));
    const result = await run100A(cappedConfig, deps, "manual");
    expect(result).toMatchObject({ canonicalProspectsCreated: 5, sourceRecordsCreated: 5, capped: true, capReason: "new_prospects", cursorAdvanced: false });
    expect(deps.repository.prospects).toHaveLength(5); expect(deps.repository.sourceRecords).toHaveLength(5);
  });

  it("enforces candidate and Places request caps", async () => {
    const candidateCapped = { ...config, limits: { ...config.limits, maxCandidatesPerRun: 1 } };
    await expect(run100A(candidateCapped, dependencies(undefined, pageClient([candidate("1"), candidate("2")])), "manual")).resolves.toMatchObject({ capped: true, capReason: "candidates", canonicalProspectsCreated: 1 });
    const requestCapped = { ...base, searchTerms: ["one", "two"], limits: { ...base.limits, maxPlacesRequestsPerRun: 1 } };
    await expect(run100A(requestCapped, dependencies(), "manual")).resolves.toMatchObject({ capped: true, capReason: "places_requests", placesRequests: 1 });
  });

  it("diagnostic failures before search and after insert are nonfatal", async () => {
    for (const failedEvent of ["run.started", "observation.stored"]) {
      const sink: DiagnosticSink = { emit: async (event) => { if (event.event === failedEvent) throw new Error("diagnostics down"); } };
      const deps = dependencies(undefined, undefined, sink);
      await expect(run100A(config, deps, "manual")).resolves.toMatchObject({ canonicalProspectsCreated: 1, diagnosticFailures: 1 });
      expect(deps.repository.writeLog).toContain("lock.release");
    }
  });

  it("a failing diagnostic fallback is also nonfatal", async () => {
    const deps = dependencies(undefined, undefined, { emit: async () => { throw new Error("sink down"); } });
    deps.diagnosticFallback = jest.fn(() => { throw new Error("fallback down"); });
    await expect(run100A(config, deps, "manual")).resolves.toMatchObject({ canonicalProspectsCreated: 1 });
    expect(deps.repository.writeLog).toContain("lock.release");
  });

  it("preserves the original provider error when error diagnostics and lock release fail", async () => {
    class ReleaseFailureRepository extends InMemoryProspectRepository { async releaseLock(): Promise<void> { throw new Error("release failed"); } }
    const sink: DiagnosticSink = { emit: async () => { throw new Error("diagnostics failed"); } };
    const places: PlacesClient = { searchText: async () => { throw new Error("provider failed"); } };
    await expect(run100A(config, dependencies(new ReleaseFailureRepository(clock.now), places, sink), "manual")).rejects.toThrow("provider failed");
  });

  it("surfaces lock release failure when there is no original error", async () => {
    class ReleaseFailureRepository extends InMemoryProspectRepository { async releaseLock(): Promise<void> { throw new Error("release failed"); } }
    await expect(run100A(config, dependencies(new ReleaseFailureRepository(clock.now)), "manual")).rejects.toThrow("release failed");
  });

  it("rejects live locks, allows expired locks, and enforces run-owned renewal", async () => {
    const repository = new InMemoryProspectRepository(clock.now);
    expect(await repository.acquireLock("100A", "owner", "2026-08-06T12:10:00.000Z")).toBe(true);
    expect(await repository.acquireLock("100A", "other", "2026-08-06T12:10:00.000Z")).toBe(false);
    expect(await repository.renewLock("100A", "other", "2026-08-06T12:11:00.000Z")).toBe(false);
    expect(await repository.renewLock("100A", "owner", "2026-08-06T12:11:00.000Z")).toBe(true);
    const expired = new InMemoryProspectRepository(clock.now);
    await expired.acquireLock("100A", "old", "2026-08-06T11:59:00.000Z");
    expect(await expired.acquireLock("100A", "new", "2026-08-06T12:10:00.000Z")).toBe(true);
  });

  it("stops safely at maximum duration", async () => {
    let calls = 0;
    const movingClock = { now: () => new Date(instant.getTime() + calls++ * 500) };
    const durationConfig = { ...config, limits: { ...config.limits, maxRunDurationMs: 100 } };
    const repo = new InMemoryProspectRepository(movingClock.now);
    const deps = { ...dependencies(repo), clock: movingClock };
    await expect(run100A(durationConfig, deps, "manual")).resolves.toMatchObject({ capped: true, capReason: "duration", cursorAdvanced: false });
  });

  it("does not advance cursor after partial failure, but advances after successful replay", async () => {
    const repository = new InMemoryProspectRepository(clock.now);
    await expect(run100A(config, dependencies(repository, { searchText: async () => { throw new Error("quota"); } }), "manual")).rejects.toThrow("quota");
    await expect(run100A(config, dependencies(repository), "manual")).resolves.toMatchObject({ geography: { id: "sea" }, cursorAdvanced: true });
  });

  it("concurrent source conflicts cannot bypass creation caps", async () => {
    class RacingRepository extends InMemoryProspectRepository { async persistObservation(): Promise<never> { throw new DuplicateSourceRecordError(); } }
    const result = await run100A(config, dependencies(new RacingRepository(clock.now), pageClient([candidate("1"), candidate("2")])), "manual");
    expect(result).toMatchObject({ canonicalProspectsCreated: 0, sourceRecordsCreated: 0, existingSources: 2 });
  });

  it("does no writes when inactive or automatic", async () => {
    const repository = new InMemoryProspectRepository(clock.now);
    await expect(run100A(load100AConfig({}, [{ id: "sea", label: "Seattle" }]), dependencies(repository), "manual")).rejects.toThrow("inactive");
    await expect(run100A(config, dependencies(repository), "cron")).rejects.toThrow("manual execution only");
    expect(repository.writeLog).toEqual([]);
  });

  it("allows only explicitly authorized 100G orchestration", async () => {
    const repository = new InMemoryProspectRepository(clock.now);
    await expect(run100A(config, dependencies(repository), "100g")).rejects.toThrow(/100G orchestration is explicitly enabled/);
    await expect(run100A({ ...config, orchestrationEnabled: true }, dependencies(repository), "100g")).resolves.toBeDefined();
  });
});
