import { randomUUID } from "crypto";
import { assertSafeToRun, type DiscoveryConfig } from "./config";
import { decideIdentity } from "./identity";
import { normalizePlace } from "./normalize";
import { DuplicateSourceRecordError, WORKFLOW_ID, type CandidateQualifier, type Clock, type DiagnosticEvent, type DiagnosticSink, type PlacesClient, type ProspectRepository, type RunSummary } from "./types";

export interface Run100ADependencies {
  places: PlacesClient; qualifier: CandidateQualifier; repository: ProspectRepository; diagnostics: DiagnosticSink;
  clock?: Clock; createRunId?: () => string; diagnosticFallback?: (event: DiagnosticEvent, error: unknown) => void;
}
export async function run100A(config: DiscoveryConfig, dependencies: Run100ADependencies, trigger: "manual" | string): Promise<RunSummary> {
  assertSafeToRun(config, trigger);
  const clock = dependencies.clock ?? { now: () => new Date() };
  const runId = dependencies.createRunId?.() ?? randomUUID();
  const startedAt = clock.now();
  const lockExpiry = () => new Date(clock.now().getTime() + config.lockTtlMs).toISOString();
  if (!await dependencies.repository.acquireLock(WORKFLOW_ID, runId, lockExpiry())) throw new Error("100A execution lock is already held");
  let diagnosticFailures = 0;
  const safeEmit = async (level: DiagnosticEvent["level"], event: string, data?: Record<string, unknown>) => {
    const diagnostic = { workflow: WORKFLOW_ID, runId, level, event, at: clock.now().toISOString(), data } satisfies DiagnosticEvent;
    try { await dependencies.diagnostics.emit(diagnostic); }
    catch (error) {
      diagnosticFailures += 1;
      try { (dependencies.diagnosticFallback ?? ((item, failure) => console.error("100A diagnostic failure", item.event, failure)))(diagnostic, error); }
      catch { /* diagnostics and their fallback are always noncritical */ }
    }
  };
  const renew = async () => {
    if (!await dependencies.repository.renewLock(WORKFLOW_ID, runId, lockExpiry())) throw new Error("100A execution lock renewal failed");
  };
  let primaryError: unknown;
  try {
    const rawCursor = await dependencies.repository.getCursor(WORKFLOW_ID);
    const cursor = ((rawCursor % config.geographies.length) + config.geographies.length) % config.geographies.length;
    const geography = config.geographies[cursor];
    const summary: RunSummary = { runId, geography, placesRequests: 0, candidates: 0, candidatesProcessed: 0, canonicalProspectsCreated: 0, sourceRecordsCreated: 0, existingSources: 0, confidentMatches: 0, possibleMatches: 0, rejected: 0, capped: false, cursorAdvanced: false, diagnosticFailures: 0 };
    const cap = async (reason: RunSummary["capReason"]) => { summary.capped = true; summary.capReason = reason; await safeEmit("warn", "run.capped", { reason }); };
    const durationExceeded = () => config.limits.maxRunDurationMs !== undefined && clock.now().getTime() - startedAt.getTime() >= config.limits.maxRunDurationMs;
    await safeEmit("info", "run.started", { geography: geography.id, cursor, limits: config.limits });

    searchLoop: for (const term of config.searchTerms) {
      let pageToken: string | undefined;
      for (let pageNumber = 1; pageNumber <= config.limits.maxPagesPerSearch; pageNumber += 1) {
        if (durationExceeded()) { await cap("duration"); break searchLoop; }
        if (summary.placesRequests >= config.limits.maxPlacesRequestsPerRun) { await cap("places_requests"); break searchLoop; }
        await renew();
        const sourceQuery = `${term} in ${geography.label}`;
        const page = await dependencies.places.searchText(sourceQuery, pageToken, config.limits.maxPlacesRequestsPerRun - summary.placesRequests);
        summary.placesRequests += page.requestsUsed;
        summary.candidates += page.candidates.length;
        await safeEmit("info", "search.page_completed", { query: sourceQuery, pageNumber, count: page.candidates.length, requestsUsed: page.requestsUsed });
        for (const raw of page.candidates) {
          if (durationExceeded()) { await cap("duration"); break searchLoop; }
          if (summary.candidatesProcessed >= config.limits.maxCandidatesPerRun) { await cap("candidates"); break searchLoop; }
          summary.candidatesProcessed += 1;
          const candidate = normalizePlace(raw, geography.id, term);
          if (!candidate) { summary.rejected += 1; await safeEmit("warn", "candidate.invalid"); continue; }
          const qualification = await dependencies.qualifier.qualify(candidate, raw);
          if (!qualification.accepted || !qualification.companyType) {
            summary.rejected += 1; await safeEmit("info", "candidate.rejected", { providerRecordId: candidate.providerRecordId, reason: qualification.reason, method: qualification.method, version: qualification.version }); continue;
          }
          const decision = decideIdentity(await dependencies.repository.inspectIdentity(candidate));
          if (decision.disposition === "existing_source_record") {
            await dependencies.repository.touchSourceRecord(runId, decision.sourceRecordId!, clock.now().toISOString());
            summary.existingSources += 1; await safeEmit("info", "source.rediscovered", { providerRecordId: candidate.providerRecordId, prospectId: decision.prospectId }); continue;
          }
          const createsCanonical = decision.disposition !== "confident_canonical_match";
          if (createsCanonical && summary.canonicalProspectsCreated >= config.limits.maxNewProspectsPerRun) { await cap("new_prospects"); break searchLoop; }
          if (summary.sourceRecordsCreated >= config.limits.maxSourceRecordsPerRun) { await cap("source_records"); break searchLoop; }
          const timestamp = clock.now().toISOString();
          try {
            const stored = await dependencies.repository.persistObservation(runId, {
              disposition: decision.disposition, matchedProspectId: decision.prospectId,
              canonical: { companyName: candidate.companyName, website: candidate.website, websiteDomain: candidate.websiteDomain, primaryPhone: candidate.phone, normalizedPhone: candidate.normalizedPhone, companyType: qualification.companyType, status: decision.disposition === "possible_match_review" ? "identity_review" : "discovered", firstDiscoveredAt: timestamp, lastUpdatedAt: timestamp },
              source: { provider: candidate.provider, providerRecordId: candidate.providerRecordId, sourceGeography: candidate.sourceGeography, sourceQuery: candidate.sourceQuery, providerUrl: candidate.providerUrl, observedCompanyName: candidate.companyName, observedWebsite: candidate.website, observedPhone: candidate.phone, observedAddress: candidate.address, city: candidate.city, state: candidate.state, qualification, firstObservedAt: timestamp, lastObservedAt: timestamp, providerMetadata: null },
            });
            if (stored.canonicalCreated) summary.canonicalProspectsCreated += 1;
            if (stored.sourceCreated) summary.sourceRecordsCreated += 1;
            if (decision.disposition === "confident_canonical_match") summary.confidentMatches += 1;
            if (decision.disposition === "possible_match_review") summary.possibleMatches += 1;
            await safeEmit("info", "observation.stored", { providerRecordId: candidate.providerRecordId, prospectId: stored.prospectId, disposition: decision.disposition });
          } catch (error) {
            if (error instanceof DuplicateSourceRecordError) { summary.existingSources += 1; await safeEmit("info", "source.concurrent_rediscovery", { providerRecordId: candidate.providerRecordId }); continue; }
            throw error;
          }
        }
        if (!page.nextPageToken) break;
        if (pageNumber >= config.limits.maxPagesPerSearch) { await safeEmit("warn", "search.pagination_omitted", { query: sourceQuery, pageNumber }); break; }
        pageToken = page.nextPageToken;
      }
    }
    if (!summary.capped) { await renew(); await dependencies.repository.setCursor(WORKFLOW_ID, runId, (cursor + 1) % config.geographies.length); summary.cursorAdvanced = true; }
    summary.diagnosticFailures = diagnosticFailures;
    await safeEmit("info", "run.completed", { ...summary, geography: geography.id });
    summary.diagnosticFailures = diagnosticFailures;
    return summary;
  } catch (error) {
    primaryError = error;
    await safeEmit("error", "run.failed", { message: error instanceof Error ? error.message : "unknown error" });
    throw error;
  } finally {
    try { await dependencies.repository.releaseLock(WORKFLOW_ID, runId); }
    catch (releaseError) {
      const event = { workflow: WORKFLOW_ID, runId, level: "error", event: "lock.release_failed", at: clock.now().toISOString(), data: { message: releaseError instanceof Error ? releaseError.message : "unknown error" } } satisfies DiagnosticEvent;
      try { (dependencies.diagnosticFallback ?? ((item, failure) => console.error("100A critical cleanup failure", item.event, failure)))(event, releaseError); } catch { /* fallback must not replace operational errors */ }
      if (primaryError === undefined) throw releaseError;
    }
  }
}
