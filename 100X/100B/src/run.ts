import { randomUUID } from "crypto";
import { assertSafeToRun, type EnrichmentConfig } from "./config";
import { evaluateEligibility } from "./eligibility";
import { decideContactIdentity, hasIdentityConflict } from "./identity";
import { normalizeContact } from "./normalize";
import {
  DuplicateContactSourceError, WORKFLOW_ID,
  type Clock, type ContactRepository, type DiagnosticEvent, type DiagnosticSink,
  type EnrichmentProvider, type RunSummary, type SuppressionResolver,
} from "./types";

export interface Run100BDependencies {
  provider: EnrichmentProvider; suppression: SuppressionResolver; repository: ContactRepository;
  diagnostics: DiagnosticSink; prospectIds: string[];
  clock?: Clock; createRunId?: () => string; diagnosticFallback?: (event: DiagnosticEvent, error: unknown) => void;
}

export async function run100B(config: EnrichmentConfig, dependencies: Run100BDependencies, trigger: "manual" | string): Promise<RunSummary> {
  assertSafeToRun(config, trigger);
  const clock = dependencies.clock ?? { now: () => new Date() };
  const runId = dependencies.createRunId?.() ?? randomUUID();
  const startedAt = clock.now();
  const lockExpiry = () => new Date(clock.now().getTime() + config.lockTtlMs).toISOString();
  if (!await dependencies.repository.acquireLock(WORKFLOW_ID, runId, lockExpiry())) throw new Error("100B execution lock is already held");
  let diagnosticFailures = 0;
  const safeEmit = async (level: DiagnosticEvent["level"], event: string, data?: Record<string, unknown>) => {
    const diagnostic = { workflow: WORKFLOW_ID, runId, level, event, at: clock.now().toISOString(), data } satisfies DiagnosticEvent;
    try { await dependencies.diagnostics.emit(diagnostic); }
    catch (error) {
      diagnosticFailures += 1;
      try { (dependencies.diagnosticFallback ?? ((item, failure) => console.error("100B diagnostic failure", item.event, failure)))(diagnostic, error); }
      catch { /* diagnostics and their fallback are always noncritical */ }
    }
  };
  const renew = async () => {
    if (!await dependencies.repository.renewLock(WORKFLOW_ID, runId, lockExpiry())) throw new Error("100B execution lock renewal failed");
  };
  let primaryError: unknown;
  try {
    const startCursor = await dependencies.repository.getCursor(WORKFLOW_ID);
    const loadedTargets = await dependencies.repository.loadTargets(dependencies.prospectIds);
    const cursorOffset = loadedTargets.length === 0 ? 0 : startCursor % loadedTargets.length;
    const targets = [
      ...loadedTargets.slice(cursorOffset),
      ...loadedTargets.slice(0, cursorOffset),
    ].slice(0, config.limits.maxCompaniesPerRun);
    // companiesFullyProcessed is deliberately separate from the public attempted-company
    // count. A provider/contact cap may interrupt a company mid-stream; that company must
    // remain the next target. Companies completed before a normal run cap are safe to
    // advance past, which prevents the same oldest prospects from starving the queue.
    let companiesFullyProcessed = 0;
    const summary: RunSummary = {
      runId, companiesProcessed: 0, providerRequests: 0, candidates: 0, contactsProcessed: 0,
      companiesWithCandidates: 0, companiesWithoutCandidates: 0, domainlessTargets: 0,
      searchRequests: 0, fallbackSearchRequests: 0, enrichmentRequests: 0, retryAttempts: 0, successfulEnrichments: 0,
      providerReportedErrors: 0, estimatedCreditConsumingMatches: 0,
      contactsCreated: 0, sourceRecordsCreated: 0, existingSources: 0, confidentMatches: 0,
      readyForOutreach: 0, heldOrSuppressed: 0, providerErrors: 0, capped: false, cursorAdvanced: false, diagnosticFailures: 0,
      eligibilityCounts: {
        ready_for_outreach: 0, needs_enrichment: 0, unverified: 0, identity_conflict: 0,
        suppressed: 0, already_contacted: 0, customer: 0, ineligible: 0, provider_error: 0,
      },
    };
    const cap = async (reason: RunSummary["capReason"]) => { summary.capped = true; summary.capReason = reason; await safeEmit("warn", "run.capped", { reason }); };
    const durationExceeded = () => config.limits.maxRunDurationMs !== undefined && clock.now().getTime() - startedAt.getTime() >= config.limits.maxRunDurationMs;
    await safeEmit("info", "run.started", { provider: config.provider, targets: targets.length, limits: config.limits });

    companyLoop: for (const company of targets) {
      if (durationExceeded()) { await cap("duration"); break; }
      if (summary.providerRequests >= config.limits.maxProviderRequestsPerRun) { await cap("provider_requests"); break; }
      await renew();
      if (!company.websiteDomain?.trim()) summary.domainlessTargets += 1;
      let result;
      try {
        result = await dependencies.provider.enrichCompany(company, config.limits.maxProviderRequestsPerRun - summary.providerRequests);
      } catch (error) {
        summary.providerErrors += 1; summary.companiesProcessed += 1;
        await safeEmit("warn", "company.provider_error", { prospectId: company.prospectId, message: error instanceof Error ? error.message : "provider error" });
        companiesFullyProcessed += 1;
        continue;
      }
      summary.providerRequests += result.requestsUsed;
      summary.candidates += result.candidates.length;
      if (result.candidates.length > 0) summary.companiesWithCandidates += 1;
      else summary.companiesWithoutCandidates += 1;
      if (result.accounting) {
        summary.searchRequests += result.accounting.searchRequests;
        summary.fallbackSearchRequests += result.accounting.fallbackSearchRequests;
        summary.enrichmentRequests += result.accounting.enrichmentRequests;
        summary.retryAttempts += result.accounting.retryAttempts;
        summary.successfulEnrichments += result.accounting.successfulEnrichments;
        summary.providerReportedErrors += result.accounting.providerErrors;
        summary.estimatedCreditConsumingMatches += result.accounting.estimatedCreditConsumingMatches;
      }
      summary.companiesProcessed += 1;
      await safeEmit("info", "company.enriched", {
        prospectId: company.prospectId,
        candidates: result.candidates.length,
        requestsUsed: result.requestsUsed,
        searchRequests: result.accounting?.searchRequests ?? 0,
        fallbackSearchRequests: result.accounting?.fallbackSearchRequests ?? 0,
        enrichmentRequests: result.accounting?.enrichmentRequests ?? 0,
      });

      let perCompany = 0;
      for (const raw of result.candidates) {
        if (durationExceeded()) { await cap("duration"); break companyLoop; }
        if (summary.contactsProcessed >= config.limits.maxContactsPerRun) { await cap("contacts"); break companyLoop; }
        if (perCompany >= config.limits.maxContactsPerCompany) { await safeEmit("warn", "company.contact_cap", { prospectId: company.prospectId }); break; }
        summary.contactsProcessed += 1; perCompany += 1;
        const contact = normalizeContact(raw, dependencies.provider.name);
        const signals = await dependencies.repository.inspectContactIdentity(company.prospectId, contact);
        const identity = decideContactIdentity(signals);
        if (identity.disposition === "existing_source_record") {
          await dependencies.repository.touchContactSource(runId, identity.sourceRecordId!, clock.now().toISOString());
          summary.existingSources += 1; await safeEmit("info", "source.rediscovered", { providerRecordId: contact.providerRecordId, contactId: identity.contactId }); continue;
        }
        const suppression = await dependencies.suppression.resolve(company, contact.normalizedEmail);
        const decision = evaluateEligibility({ company, contact, suppression, identityConflict: hasIdentityConflict(signals), providerError: false });
        const createsContact = identity.disposition !== "confident_contact_match";
        if (createsContact && summary.contactsCreated >= config.limits.maxNewContactsPerRun) { await cap("new_contacts"); break companyLoop; }
        if (summary.sourceRecordsCreated >= config.limits.maxSourceRecordsPerRun) { await cap("source_records"); break companyLoop; }
        const timestamp = clock.now().toISOString();
        try {
          const stored = await dependencies.repository.persistContact(runId, {
            disposition: identity.disposition, matchedContactId: identity.contactId,
            canonical: {
              prospectId: company.prospectId, firstName: contact.firstName, lastName: contact.lastName, fullName: contact.fullName,
              title: contact.title, roleCategory: contact.roleCategory, email: contact.email, normalizedEmail: contact.normalizedEmail,
              emailVerificationStatus: contact.verificationStatus, phone: contact.phone, linkedinUrl: contact.linkedinUrl,
              isCurrentContact: decision.isCurrentDecisionMaker, outreachEligibility: decision.eligibility, eligibilityReason: decision.reason,
              suppressionStatus: decision.suppressionStatus, suppressionReason: decision.suppressionStatus === "none" ? null : decision.reason,
              firstDiscoveredAt: timestamp, lastVerifiedAt: decision.eligibility === "ready_for_outreach" ? timestamp : null,
            },
            source: {
              provider: contact.provider, providerRecordId: contact.providerRecordId,
              providerVerificationStatus: contact.providerVerificationStatus, providerMetadata: contact.providerMetadata,
              firstObservedAt: timestamp, lastObservedAt: timestamp,
            },
          });
          if (stored.contactCreated) summary.contactsCreated += 1;
          if (stored.sourceCreated) summary.sourceRecordsCreated += 1;
          if (identity.disposition === "confident_contact_match") summary.confidentMatches += 1;
          summary.eligibilityCounts[decision.eligibility] += 1;
          if (decision.eligibility === "ready_for_outreach") summary.readyForOutreach += 1; else summary.heldOrSuppressed += 1;
          await safeEmit("info", "contact.stored", { providerRecordId: contact.providerRecordId, contactId: stored.contactId, eligibility: decision.eligibility, roleCategory: contact.roleCategory });
        } catch (error) {
          if (error instanceof DuplicateContactSourceError) { summary.existingSources += 1; await safeEmit("info", "source.concurrent_rediscovery", { providerRecordId: contact.providerRecordId }); continue; }
          throw error;
        }
      }
      companiesFullyProcessed += 1;
    }
    if (companiesFullyProcessed > 0 || !summary.capped) {
      await renew();
      await dependencies.repository.setCursor(WORKFLOW_ID, runId, startCursor + companiesFullyProcessed);
      summary.cursorAdvanced = true;
    }
    summary.diagnosticFailures = diagnosticFailures;
    await safeEmit("info", "run.completed", { ...summary });
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
      try { (dependencies.diagnosticFallback ?? ((item, failure) => console.error("100B critical cleanup failure", item.event, failure)))(event, releaseError); } catch { /* fallback must not replace operational errors */ }
      if (primaryError === undefined) throw releaseError;
    }
  }
}
