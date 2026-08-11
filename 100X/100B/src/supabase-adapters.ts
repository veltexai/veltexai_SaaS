import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DuplicateContactSourceError, WORKFLOW_ID,
  type CompanyContext, type CompanyType, type ContactIdentitySignals, type ContactRepository,
  type DiagnosticEvent, type DiagnosticSink, type NormalizedContact, type PersistContactInput, type PersistContactResult,
} from "./types";

type Client = SupabaseClient<Record<string, unknown>>;
function assertNoError(error: { message: string; code?: string } | null, operation: string): void { if (error) throw new Error(`${operation}: ${error.message}`); }
function ids(data: unknown): string[] { return ((data ?? []) as Array<{ id?: string }>).map((row) => String(row.id)); }
const CLEANING = new Set<CompanyType>(["commercial_janitorial", "commercial_cleaning", "office_cleaning", "building_cleaning", "maid_service", "residential_cleaning"]);

export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly client: Client) {}
  async acquireLock(_w: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("acquire_100b_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
    assertNoError(error, "acquire 100B lock"); return data === true;
  }
  async renewLock(_w: typeof WORKFLOW_ID, runId: string, expiresAt: string): Promise<boolean> {
    const { data, error } = await this.client.rpc("renew_100b_lock", { requested_run_id: runId, requested_expires_at: expiresAt });
    assertNoError(error, "renew 100B lock"); return data === true;
  }
  async releaseLock(_w: typeof WORKFLOW_ID, runId: string): Promise<void> {
    const { error } = await this.client.rpc("release_100b_lock", { requested_run_id: runId }); assertNoError(error, "release 100B lock");
  }
  async getCursor(workflow: typeof WORKFLOW_ID): Promise<number> {
    const { data, error } = await this.client.from("enrichment_workflow_state").select("cursor_index").eq("workflow_id", workflow).single();
    assertNoError(error, "read 100B cursor"); return Number((data as { cursor_index: number }).cursor_index);
  }
  async setCursor(_w: typeof WORKFLOW_ID, runId: string, nextIndex: number): Promise<void> {
    const { data, error } = await this.client.rpc("set_100b_cursor", { requested_run_id: runId, requested_cursor: nextIndex });
    assertNoError(error, "update 100B cursor"); if (data !== true) throw new Error("update 100B cursor: run-owned lock required");
  }
  async loadTargets(prospectIds: string[]): Promise<CompanyContext[]> {
    if (prospectIds.length === 0) return [];
    const { data, error } = await this.client.from("internal_prospects").select("id,company_name,company_type,website_domain").in("id", prospectIds);
    assertNoError(error, "load 100B targets");
    const rows = (data ?? []) as Array<{ id: string; company_name: string; company_type: CompanyType; website_domain: string | null }>;
    const byId = new Map(rows.map((r) => [r.id, r]));
    return prospectIds.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r)).map((r) => ({
      prospectId: r.id, companyName: r.company_name, companyType: r.company_type, websiteDomain: r.website_domain,
      eligibleCleaningCompany: CLEANING.has(r.company_type),
      isCustomer: false,           // pilot DB carries no customer data; a future service supplies this
      isGloballySuppressed: false, // pilot DB carries no suppression data; a future service supplies this
    }));
  }
  async inspectContactIdentity(prospectId: string, contact: NormalizedContact): Promise<ContactIdentitySignals> {
    const sourceResult = await this.client.from("prospect_contact_sources").select("id,contact_id").eq("provider", contact.provider).eq("provider_record_id", contact.providerRecordId).limit(1).maybeSingle();
    assertNoError(sourceResult.error, "lookup contact source");
    const emailResult = contact.normalizedEmail
      ? await this.client.from("prospect_contacts").select("id").eq("prospect_id", prospectId).eq("normalized_email", contact.normalizedEmail)
      : { data: [], error: null };
    assertNoError(emailResult.error, "lookup contact email");
    const source = sourceResult.data as { id: string; contact_id: string } | null;
    return { sourceRecordId: source?.id, sourceContactId: source?.contact_id, emailContactIds: ids(emailResult.data) };
  }
  async touchContactSource(runId: string, sourceRecordId: string, observedAt: string): Promise<void> {
    const { data, error } = await this.client.rpc("touch_100b_source", { requested_run_id: runId, requested_source_id: sourceRecordId, requested_observed_at: observedAt });
    assertNoError(error, "touch contact source"); if (data !== true) throw new Error("touch contact source: run-owned lock required");
  }
  async persistContact(runId: string, input: PersistContactInput): Promise<PersistContactResult> {
    const c = input.canonical;
    const contact = {
      prospect_id: c.prospectId, first_name: c.firstName, last_name: c.lastName, full_name: c.fullName, title: c.title,
      role_category: c.roleCategory, email: c.email, normalized_email: c.normalizedEmail, email_verification_status: c.emailVerificationStatus,
      phone: c.phone, linkedin_url: c.linkedinUrl, is_current_contact: c.isCurrentContact, outreach_eligibility: c.outreachEligibility,
      eligibility_reason: c.eligibilityReason, suppression_status: c.suppressionStatus, suppression_reason: c.suppressionReason,
      first_discovered_at: c.firstDiscoveredAt, last_verified_at: c.lastVerifiedAt,
    };
    const s = input.source;
    const source = {
      provider: s.provider, provider_record_id: s.providerRecordId, provider_verification_status: s.providerVerificationStatus,
      provider_metadata: s.providerMetadata, first_observed_at: s.firstObservedAt, last_observed_at: s.lastObservedAt,
    };
    const { data, error } = await this.client.rpc("persist_100b_contact", { requested_run_id: runId, contact_record: contact, source_record: source, matched_contact_id: input.matchedContactId ?? null });
    if (error?.code === "23505") throw new DuplicateContactSourceError();
    assertNoError(error, "persist 100B contact");
    const result = data as { contact_id: string; source_record_id: string; contact_created: boolean; source_created: boolean };
    return { contactId: result.contact_id, sourceRecordId: result.source_record_id, contactCreated: result.contact_created, sourceCreated: result.source_created };
  }
}
export class SupabaseDiagnosticSink implements DiagnosticSink {
  constructor(private readonly client: Client) {}
  async emit(event: DiagnosticEvent): Promise<void> {
    const { error } = await this.client.from("enrichment_diagnostics").insert({ workflow_id: event.workflow, run_id: event.runId, level: event.level, event: event.event, data: event.data ?? null, created_at: event.at });
    assertNoError(error, "write 100B diagnostic");
  }
}
