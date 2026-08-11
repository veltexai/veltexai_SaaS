import type { SupabaseClient } from "@supabase/supabase-js";
import { DuplicateSourceRecordError, WORKFLOW_ID, type DiagnosticEvent, type DiagnosticSink, type IdentitySignals, type NormalizedCandidate, type PersistObservationInput, type PersistObservationResult, type ProspectRepository } from "./types";

type Client = SupabaseClient<Record<string, unknown>>;
function assertNoError(error: { message: string; code?: string } | null, operation: string): void { if (error) throw new Error(`${operation}: ${error.message}`); }
function ids(data: unknown): string[] { return ((data ?? []) as Array<{ id?: string; prospect_id?: string }>).map((row) => String(row.id ?? row.prospect_id)); }

export class SupabaseProspectRepository implements ProspectRepository {
  constructor(private readonly client: Client) {}
  async acquireLock(_workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("acquire_100a_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
    assertNoError(error, "acquire 100A lock"); return data === true;
  }
  async renewLock(_workflow: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("renew_100a_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
    assertNoError(error, "renew 100A lock"); return data === true;
  }
  async releaseLock(_workflow: typeof WORKFLOW_ID, runId: string): Promise<void> {
    const { error } = await this.client.rpc("release_100a_lock", { requested_run_id: runId }); assertNoError(error, "release 100A lock");
  }
  async getCursor(workflow: typeof WORKFLOW_ID): Promise<number> {
    const { data, error } = await this.client.from("acquisition_workflow_state").select("cursor_index").eq("workflow_id", workflow).single();
    assertNoError(error, "read 100A cursor"); return Number((data as { cursor_index: number }).cursor_index);
  }
  async setCursor(_workflow: typeof WORKFLOW_ID, runId: string, nextIndex: number): Promise<void> {
    const { data, error } = await this.client.rpc("set_100a_cursor", { requested_run_id: runId, requested_cursor: nextIndex });
    assertNoError(error, "update 100A cursor"); if (data !== true) throw new Error("update 100A cursor: run-owned lock required");
  }
  async inspectIdentity(candidate: NormalizedCandidate): Promise<IdentitySignals> {
    const sourceResult = await this.client.from("prospect_source_records").select("id,prospect_id").eq("provider", candidate.provider).eq("provider_record_id", candidate.providerRecordId).limit(1).maybeSingle();
    assertNoError(sourceResult.error, "lookup provider source");
    const domainResult = candidate.websiteDomain ? await this.client.from("internal_prospects").select("id").eq("website_domain", candidate.websiteDomain) : { data: [], error: null };
    assertNoError(domainResult.error, "lookup canonical domain");
    const phoneResult = candidate.normalizedPhone ? await this.client.from("internal_prospects").select("id").eq("normalized_phone", candidate.normalizedPhone) : { data: [], error: null };
    assertNoError(phoneResult.error, "lookup canonical phone");
    const locationResult = candidate.city && candidate.state ? await this.client.from("prospect_source_records").select("prospect_id").ilike("observed_company_name", candidate.companyName).ilike("city", candidate.city).ilike("state", candidate.state) : { data: [], error: null };
    assertNoError(locationResult.error, "lookup canonical name/location");
    const source = sourceResult.data as { id: string; prospect_id: string } | null;
    return { sourceRecordId: source?.id, sourceProspectId: source?.prospect_id, domainProspectIds: ids(domainResult.data), phoneProspectIds: ids(phoneResult.data), nameLocationProspectIds: ids(locationResult.data) };
  }
  async touchSourceRecord(runId: string, sourceRecordId: string, observedAt: string): Promise<void> {
    const { data, error } = await this.client.rpc("touch_100a_source", { requested_run_id: runId, requested_source_id: sourceRecordId, requested_observed_at: observedAt });
    assertNoError(error, "touch provider source"); if (data !== true) throw new Error("touch provider source: run-owned lock required");
  }
  async persistObservation(runId: string, input: PersistObservationInput): Promise<PersistObservationResult> {
    const canonical = { company_name: input.canonical.companyName, website: input.canonical.website, website_domain: input.canonical.websiteDomain, primary_phone: input.canonical.primaryPhone, normalized_phone: input.canonical.normalizedPhone, company_type: input.canonical.companyType, prospect_status: input.canonical.status, first_discovered_at: input.canonical.firstDiscoveredAt, last_updated_at: input.canonical.lastUpdatedAt };
    const source = { provider: input.source.provider, provider_record_id: input.source.providerRecordId, source_geography: input.source.sourceGeography, source_query: input.source.sourceQuery, provider_url: input.source.providerUrl, observed_company_name: input.source.observedCompanyName, observed_website: input.source.observedWebsite, observed_phone: input.source.observedPhone, observed_address: input.source.observedAddress, city: input.source.city, state: input.source.state, qualification: input.source.qualification, first_observed_at: input.source.firstObservedAt, last_observed_at: input.source.lastObservedAt, provider_metadata: input.source.providerMetadata };
    const { data, error } = await this.client.rpc("persist_100a_observation", { requested_run_id: runId, canonical_record: canonical, source_record: source, matched_prospect_id: input.matchedProspectId ?? null });
    if (error?.code === "23505") throw new DuplicateSourceRecordError();
    assertNoError(error, "persist 100A observation");
    const result = data as { prospect_id: string; source_record_id: string; canonical_created: boolean; source_created: boolean };
    return { prospectId: result.prospect_id, sourceRecordId: result.source_record_id, canonicalCreated: result.canonical_created, sourceCreated: result.source_created };
  }
}
export class SupabaseDiagnosticSink implements DiagnosticSink {
  constructor(private readonly client: Client) {}
  async emit(event: DiagnosticEvent): Promise<void> {
    const { error } = await this.client.from("acquisition_diagnostics").insert({ workflow_id: event.workflow, run_id: event.runId, level: event.level, event: event.event, data: event.data ?? null, created_at: event.at });
    assertNoError(error, "write 100A diagnostic");
  }
}
