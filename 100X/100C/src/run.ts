import { randomUUID } from "crypto";
import { assertCampaignStateSafe, assertWorkspaceAllowed } from "./campaign-allowlist";
import { assertSafeToRun, type SyncConfig } from "./config";
import { recheckSyncEligibility } from "./eligibility-recheck";
import { InstantlyError } from "./instantly-provider";
import { WORKFLOW_ID } from "./types";
import type {
  ApprovedCampaign, Clock, DiagnosticEvent, DiagnosticSink, OutboundLead, OutboundSyncProvider,
  RecheckDecision, SubmissionState, SuppressionEvent, SuppressionRegistryEntry, SyncCandidate,
  SyncRepository, SyncSummary,
} from "./types";

export interface Run100CDependencies {
  provider: OutboundSyncProvider;
  repository: SyncRepository;
  diagnostics: DiagnosticSink;
  campaign: ApprovedCampaign;
  clock?: Clock;
  createRunId?: () => string;
}

// Error kinds that are systemic (recur for every contact) — stop the run rather than burn budget.
const SYSTEMIC = new Set(["auth", "scope", "payment", "campaign_not_found", "campaign_unsafe_state", "request_cap"]);
// Terminal (do not retry) create failures that are NOT systemic — fail this contact, continue.
const TERMINAL_LEAD = new Set(["invalid_lead", "blocklisted", "permanent", "malformed"]);
// Retryable-later (safe transient) — mark failed_retryable, continue.
const RETRYABLE = new Set(["transient", "timeout", "rate_limit"]);

const emailDomain = (email: string | null): string | null => (email && email.includes("@") ? email.split("@")[1] ?? null : null);
const companyDomain = (c: SyncCandidate): string | null => {
  if (c.website) { try { return new URL(c.website).hostname.replace(/^www\./, "").toLowerCase(); } catch { /* fall through */ } }
  return emailDomain(c.normalizedEmail)?.toLowerCase() ?? null;
};

export async function run100C(config: SyncConfig, deps: Run100CDependencies, trigger: "manual" | string): Promise<SyncSummary> {
  assertSafeToRun(config, trigger);
  const clock = deps.clock ?? { now: () => new Date() };
  const runId = deps.createRunId?.() ?? randomUUID();
  const startedAt = clock.now();
  const campaign = deps.campaign;
  const lockExpiry = () => new Date(clock.now().getTime() + config.lockTtlMs).toISOString();
  if (!await deps.repository.acquireLock(WORKFLOW_ID, runId, lockExpiry())) throw new Error("100C execution lock is already held");

  let diagnosticFailures = 0;
  const safeEmit = async (level: DiagnosticEvent["level"], event: string, data?: Record<string, unknown>) => {
    const diagnostic: DiagnosticEvent = { workflow: WORKFLOW_ID, runId, level, event, at: clock.now().toISOString(), data };
    try { await deps.diagnostics.emit(diagnostic); } catch { diagnosticFailures += 1; }
  };

  const summary: SyncSummary = {
    runId, campaignConfigId: campaign.configId, campaignState: "unknown",
    considered: 0, eligibleAfterRecheck: 0, reserved: 0, submitted: 0, campaignReactivated: false, skippedDuplicate: 0,
    suppressed: 0, ineligible: 0, stale: 0, reconciliationRequired: 0, failedRetryable: 0, failedTerminal: 0,
    providerRequests: 0, providerErrors: 0, ambiguousOutcomes: 0, capped: false, diagnosticFailures: 0,
  };
  const totalRequests = () => { const a = deps.provider.getAccounting(); return a.campaignReads + a.campaignWrites + a.leadWrites + a.reconcileReads; };
  const remaining = () => config.limits.maxProviderRequestsPerRun - totalRequests();
  const cap = async (reason: SyncSummary["capReason"]) => { summary.capped = true; summary.capReason = reason; await safeEmit("warn", "run.capped", { reason }); };
  const durationExceeded = () => clock.now().getTime() - startedAt.getTime() >= config.limits.maxRunDurationMs;

  try {
    await safeEmit("info", "run.started", { campaignConfigId: campaign.configId, limits: config.limits });

    // 1) Campaign-state read BEFORE any lead creation. Unsafe state fails the whole run closed.
    if (remaining() <= 0) { await cap("provider_requests"); return finalize(); }
    const stateResult = await deps.provider.getCampaignState(campaign.instantlyCampaignId!, remaining());
    summary.campaignState = stateResult.state;
    assertCampaignStateSafe(
      campaign,
      stateResult.state,
      config.allowActiveCampaign === true,
      config.allowCompletedCampaignReactivation === true,
    ); // throws -> fail closed
    assertWorkspaceAllowed(campaign, stateResult.observedWorkspaceId); // fail closed on workspace mismatch/absence
    await safeEmit("info", "campaign.state_verified", { state: stateResult.state, workspaceVerified: Boolean(campaign.expectedWorkspaceId) });

    // 2) Consider a capped set of contacts.
    const candidates = await deps.repository.loadCandidates(campaign.configId, config.limits.maxContactsConsidered);
    summary.considered = candidates.length;

    // Fresh read + recheck. `ignoreAssignment` skips the duplicate check for the FINAL pre-submit
    // pass (this run already owns the reservation). A registry read failure fails the contact closed.
    const readAndRecheck = async (cand: SyncCandidate, ignoreAssignment = false): Promise<RecheckDecision> => {
      let events: SuppressionEvent[] = []; let registry: SuppressionRegistryEntry[] = []; let registryUnavailable = false;
      try {
        events = await deps.repository.loadSuppressionEvents(cand.canonicalContactId);
        registry = await deps.repository.loadSuppressionRegistry(cand.normalizedEmail, companyDomain(cand));
      } catch { registry = []; registryUnavailable = true; }
      const existing = ignoreAssignment ? null : await deps.repository.findAssignment(cand.canonicalContactId, campaign.configId);
      return recheckSyncEligibility({ candidate: cand, suppressionEvents: events, registry, existingAssignment: existing, now: clock.now(), maxEligibilityAgeMs: config.limits.maxEligibilityAgeMs, registryUnavailable });
    };
    const countNonEligible = (o: RecheckDecision["outcome"]) => { if (o === "duplicate") summary.skippedDuplicate += 1; else if (o === "suppressed") summary.suppressed += 1; else if (o === "stale") summary.stale += 1; else summary.ineligible += 1; };
    const stateForOutcome = (o: RecheckDecision["outcome"]): SubmissionState => (o === "suppressed" ? "suppressed" : o === "duplicate" ? "skipped_duplicate" : "cancelled");

    for (const cand of candidates) {
      if (durationExceeded()) { await cap("duration"); break; }

      // 3) Fresh recheck immediately before reservation (customer/suppression/verification/staleness).
      const decision = await readAndRecheck(cand);
      const base = { contactId: cand.canonicalContactId, campaignConfigId: campaign.configId, hasEmail: Boolean(cand.normalizedEmail), emailDomain: emailDomain(cand.normalizedEmail) };
      if (decision.outcome !== "eligible") {
        countNonEligible(decision.outcome);
        await safeEmit("info", "contact.recheck", { ...base, outcome: decision.outcome, reason: decision.reason });
        continue;
      }
      summary.eligibleAfterRecheck += 1;

      if (summary.submitted >= config.limits.maxLeadsSubmitted) { await cap("leads"); break; }

      // 4) Idempotency reservation (unique contact/campaign).
      const reservation = await deps.repository.reserveAssignment(runId, cand.canonicalContactId, campaign.configId);
      if (!reservation.reserved) { summary.skippedDuplicate += 1; await safeEmit("info", "contact.reserve_conflict", { ...base, existingState: reservation.existingState }); continue; }
      summary.reserved += 1;
      await deps.repository.transitionAssignment(runId, reservation.assignmentId, "submitting", null);

      // 5) Budget gates before the write.
      const writes = deps.provider.getAccounting().leadWrites;
      if (remaining() <= 0 || writes >= config.limits.maxInstantlyWriteRequests) {
        await deps.repository.transitionAssignment(runId, reservation.assignmentId, "reserved", "capped before submission");
        await cap(remaining() <= 0 ? "provider_requests" : "writes"); break;
      }

      // 6) FINAL freshness re-check immediately before the provider write. If anything changed since
      //    reservation (suppression, customer, verification, staleness, eligibility), transition and
      //    record WITHOUT constructing any lead-create request.
      const finalDecision = await readAndRecheck(cand, true);
      if (finalDecision.outcome !== "eligible") {
        await deps.repository.transitionAssignment(runId, reservation.assignmentId, stateForOutcome(finalDecision.outcome), `pre-submit recheck: ${finalDecision.reason}`);
        await deps.repository.recordAttempt(runId, reservation.assignmentId, "pre_submit_recheck_failed", finalDecision.outcome);
        summary.eligibleAfterRecheck -= 1;
        countNonEligible(finalDecision.outcome);
        await safeEmit("warn", "contact.pre_submit_recheck_failed", { ...base, outcome: finalDecision.outcome, reason: finalDecision.reason });
        continue;
      }

      const lead = buildLead(cand, campaign);
      try {
        const result = await deps.provider.createLead(campaign.instantlyCampaignId!, lead, remaining());
        if (result.disposition === "skipped_duplicate") {
          await deps.repository.transitionAssignment(runId, reservation.assignmentId, "skipped_duplicate", "provider skip (already in workspace/campaign/list)");
          await deps.repository.recordAttempt(runId, reservation.assignmentId, "skipped_duplicate", null);
          summary.skippedDuplicate += 1;
          await safeEmit("info", "contact.skipped_duplicate", base);
        } else {
          await deps.repository.recordLeadMapping(runId, reservation.assignmentId, result.providerLeadId!);
          await deps.repository.transitionAssignment(runId, reservation.assignmentId, "submitted", null, result.providerLeadId);
          await deps.repository.recordAttempt(runId, reservation.assignmentId, "submitted", null);
          summary.submitted += 1;
          await safeEmit("info", "contact.submitted", { ...base, disposition: "submitted" });
        }
      } catch (error) {
        const kind = error instanceof InstantlyError ? error.kind : "transient";
        await deps.repository.recordAttempt(runId, reservation.assignmentId, "create_failed", kind);
        if (kind === "ambiguous") {
          await handleAmbiguous(deps, config, runId, reservation.assignmentId, campaign, lead, summary, remaining, safeEmit, base);
        } else if (kind === "duplicate") {
          await deps.repository.transitionAssignment(runId, reservation.assignmentId, "skipped_duplicate", "provider duplicate");
          summary.skippedDuplicate += 1;
          await safeEmit("info", "contact.skipped_duplicate", base);
        } else if (RETRYABLE.has(kind)) {
          await deps.repository.transitionAssignment(runId, reservation.assignmentId, "failed_retryable", kind);
          summary.failedRetryable += 1;
          await safeEmit("warn", "contact.failed_retryable", { ...base, errorCategory: kind });
        } else {
          await deps.repository.transitionAssignment(runId, reservation.assignmentId, "failed_terminal", kind);
          summary.failedTerminal += 1;
          await safeEmit("error", "contact.failed_terminal", { ...base, errorCategory: kind });
        }
        if (SYSTEMIC.has(kind)) { await cap("provider_error"); break; }
      }
    }
    // A completed campaign is reactivated only after at least one newly verified lead was safely
    // submitted in this run. This prevents activating an empty campaign and keeps the action bound
    // to the exact approved campaign id, explicit continuity gate, and physical request budget.
    if (stateResult.state === "completed" && summary.submitted > 0) {
      if (!config.allowCompletedCampaignReactivation) throw new Error("completed campaign reactivation is not authorized");
      if (remaining() <= 0) throw new InstantlyError("request_cap", "campaign reactivation request budget exhausted");
      const activation = await deps.provider.activateCampaign(campaign.instantlyCampaignId!, remaining());
      summary.campaignReactivated = activation.activated;
      await safeEmit("info", "campaign.reactivated_after_submission", { campaignConfigId: campaign.configId });
    }
    return finalize();
  } finally {
    await deps.repository.releaseLock(WORKFLOW_ID, runId);
  }

  function finalize(): SyncSummary {
    const acc = deps.provider.getAccounting();
    summary.providerRequests = acc.campaignReads + acc.campaignWrites + acc.leadWrites + acc.reconcileReads;
    summary.providerErrors = acc.providerErrors;
    summary.ambiguousOutcomes = acc.ambiguousOutcomes;
    summary.diagnosticFailures = diagnosticFailures;
    return summary;
  }
}

function buildLead(cand: SyncCandidate, campaign: ApprovedCampaign): OutboundLead {
  return {
    campaignConfigId: campaign.configId,
    workEmail: cand.workEmail!,
    firstName: cand.firstName,
    lastName: cand.lastName,
    companyName: cand.companyName,
    website: cand.website,
    jobTitle: cand.title,
    personalization: null, // no unverified personalization claims in the initial version
    attribution: { canonicalContactId: cand.canonicalContactId, campaignConfigId: campaign.configId },
  };
}

// Ambiguous create outcome: NEVER blindly retried. Resolve read-only via reconciliation if budget
// allows; otherwise leave the pair in reconciliation_required for a later job.
async function handleAmbiguous(
  deps: Run100CDependencies, config: SyncConfig, runId: string, assignmentId: string, campaign: ApprovedCampaign,
  lead: OutboundLead, summary: SyncSummary, remaining: () => number,
  safeEmit: (l: DiagnosticEvent["level"], e: string, d?: Record<string, unknown>) => Promise<void>,
  base: Record<string, unknown>,
): Promise<void> {
  if (remaining() > 0) {
    try {
      const rec = await deps.provider.reconcileLead(campaign.instantlyCampaignId!, lead.workEmail, remaining());
      if (rec.existsInCampaign && rec.providerLeadId) {
        await deps.repository.recordLeadMapping(runId, assignmentId, rec.providerLeadId);
        await deps.repository.transitionAssignment(runId, assignmentId, "submitted", "resolved via reconciliation", rec.providerLeadId);
        summary.submitted += 1;
        await safeEmit("info", "contact.reconciled_submitted", base);
        return;
      }
    } catch { /* fall through to reconciliation_required */ }
  }
  await deps.repository.transitionAssignment(runId, assignmentId, "reconciliation_required", "ambiguous create outcome; unresolved");
  summary.reconciliationRequired += 1;
  await safeEmit("warn", "contact.reconciliation_required", base);
}
