import { selectAuthoritativeSource } from "./source-attribution";
import { WORKFLOW_ID } from "./types";
import type {
  AssignmentRecord, ContactSourceRow, DiagnosticEvent, DiagnosticSink, ReserveResult, SubmissionState,
  SuppressionEvent, SuppressionRegistryEntry, SyncCandidate, SyncRepository,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// PostgREST-backed SyncRepository. Mutations go ONLY through the run-lock-scoped SECURITY DEFINER
// functions defined in database/003_instantly_campaign_sync.sql; reads use the worker role's
// minimum SELECT grants. Constructed only in the disabled-by-default controlled-write path, with a
// short-lived veltex_100c_worker JWT. No service-role key is ever used.
export class SupabaseSyncRepository implements SyncRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(`100C rpc ${fn} failed: ${error.message}`);
    return data as T;
  }

  async acquireLock(_w: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    return this.rpc<boolean>("acquire_100c_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
  }
  async renewLock(_w: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    return this.rpc<boolean>("renew_100c_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
  }
  async releaseLock(_w: typeof WORKFLOW_ID, runId: string): Promise<void> {
    await this.rpc<null>("release_100c_lock", { requested_run_id: runId });
  }
  async loadCandidates(_campaignConfigId: string, limit: number): Promise<SyncCandidate[]> {
    const { data, error } = await this.client
      .from("prospect_contacts")
      .select("id, prospect_id, email, normalized_email, first_name, last_name, full_name, title, outreach_eligibility, email_verification_status, suppression_status, is_current_contact, last_verified_at, internal_prospects!inner(company_name, website, website_domain, company_type), prospect_contact_sources(provider, provider_record_id, last_observed_at)")
      .eq("outreach_eligibility", "ready_for_outreach")
      .eq("email_verification_status", "verified")
      .eq("suppression_status", "none")
      .limit(limit);
    if (error) throw new Error(`100C candidate load failed: ${error.message}`);
    const out: SyncCandidate[] = [];
    for (const r of (data ?? []) as Record<string, any>[]) {
      // Provider attribution from the ACTUAL source records — never hardcoded. Hold (skip) a contact
      // with no authoritative source rather than fabricating attribution.
      const sources: ContactSourceRow[] = (r.prospect_contact_sources ?? []).map((s: Record<string, any>) => ({ provider: s.provider, providerRecordId: s.provider_record_id, lastObservedAt: s.last_observed_at }));
      const authoritative = selectAuthoritativeSource(sources);
      if (!authoritative) continue; // fail closed: no provable source
      out.push({
        canonicalContactId: r.id, canonicalProspectId: r.prospect_id, workEmail: r.email, normalizedEmail: r.normalized_email,
        firstName: r.first_name, lastName: r.last_name, fullName: r.full_name, title: r.title,
        companyName: r.internal_prospects?.company_name ?? "", website: r.internal_prospects?.website ?? null,
        outreachEligibility: r.outreach_eligibility, emailVerificationStatus: r.email_verification_status,
        suppressionStatus: r.suppression_status, isCurrentContact: Boolean(r.is_current_contact),
        provider: authoritative.provider, providerRecordId: authoritative.providerRecordId, lastVerifiedAt: r.last_verified_at,
        // 100A's company_type constraint already restricts stored prospects to cleaning companies.
        eligibleCleaningCompany: Boolean(r.internal_prospects?.company_type),
        // Customer/trial status is NOT derivable from prospect_status (which is discovered|identity_review);
        // it comes from the durable suppression registry, evaluated in the recheck.
        isCustomer: false,
      });
    }
    return out;
  }
  async loadSuppressionEvents(contactId: string): Promise<SuppressionEvent[]> {
    const { data, error } = await this.client
      .from("outbound_event_receipts").select("event_type, occurred_at").eq("contact_id", contactId).eq("suppresses", true);
    if (error) throw new Error(`100C suppression load failed: ${error.message}`);
    return (data ?? []).map((r: Record<string, any>): SuppressionEvent => ({ type: r.event_type, occurredAt: r.occurred_at }));
  }
  async loadSuppressionRegistry(normalizedEmail: string | null, normalizedDomain: string | null): Promise<SuppressionRegistryEntry[]> {
    // Match by normalized email OR company domain. A read failure propagates (the runner fails the
    // contact closed) rather than silently treating the contact as unsuppressed.
    const filters: string[] = [];
    if (normalizedEmail) filters.push(`and(match_type.eq.email,normalized_email.eq.${normalizedEmail.toLowerCase()})`);
    if (normalizedDomain) filters.push(`and(match_type.eq.domain,normalized_domain.eq.${normalizedDomain.toLowerCase()})`);
    if (filters.length === 0) return [];
    const { data, error } = await this.client
      .from("outbound_suppression_registry").select("kind, match_type, source, reason, external_reference, occurred_at").or(filters.join(","));
    if (error) throw new Error(`100C suppression registry load failed: ${error.message}`);
    return (data ?? []).map((r: Record<string, any>): SuppressionRegistryEntry => ({ kind: r.kind, matchedBy: r.match_type, source: r.source, reason: r.reason, externalReference: r.external_reference, occurredAt: r.occurred_at }));
  }
  async findAssignment(contactId: string, campaignConfigId: string): Promise<AssignmentRecord | null> {
    const { data, error } = await this.client
      .from("campaign_contact_assignments").select("id, contact_id, campaign_config_id, state, provider_lead_id, reason, updated_at")
      .eq("contact_id", contactId).eq("campaign_config_id", campaignConfigId).maybeSingle();
    if (error) throw new Error(`100C assignment lookup failed: ${error.message}`);
    if (!data) return null;
    return { id: data.id, contactId: data.contact_id, campaignConfigId: data.campaign_config_id, state: data.state, providerLeadId: data.provider_lead_id, reason: data.reason, updatedAt: data.updated_at };
  }
  async reserveAssignment(runId: string, contactId: string, campaignConfigId: string): Promise<ReserveResult> {
    const r = await this.rpc<{ assignment_id: string; reserved: boolean; existing_state: SubmissionState | null }>("reserve_100c_assignment", { requested_run_id: runId, requested_contact_id: contactId, requested_campaign_config_id: campaignConfigId });
    return { assignmentId: r.assignment_id, reserved: r.reserved, existingState: r.existing_state };
  }
  async transitionAssignment(runId: string, assignmentId: string, state: SubmissionState, reason: string | null, providerLeadId: string | null = null): Promise<void> {
    await this.rpc<boolean>("transition_100c_assignment", { requested_run_id: runId, requested_assignment_id: assignmentId, requested_state: state, requested_reason: reason, requested_provider_lead_id: providerLeadId });
  }
  async recordAttempt(runId: string, assignmentId: string, outcome: string, errorCategory: string | null): Promise<void> {
    await this.rpc<null>("record_100c_attempt", { requested_run_id: runId, requested_assignment_id: assignmentId, requested_outcome: outcome, requested_error_category: errorCategory });
  }
  async recordLeadMapping(runId: string, assignmentId: string, providerLeadId: string): Promise<void> {
    await this.rpc<null>("record_100c_lead_mapping", { requested_run_id: runId, requested_assignment_id: assignmentId, requested_provider_lead_id: providerLeadId });
  }
}

export class SupabaseDiagnosticSink implements DiagnosticSink {
  constructor(private readonly client: SupabaseClient) {}
  async emit(event: DiagnosticEvent): Promise<void> {
    await this.client.from("campaign_sync_diagnostics").insert({ workflow_id: WORKFLOW_ID, run_id: event.runId, level: event.level, event: event.event, data: event.data ?? null });
  }
}
