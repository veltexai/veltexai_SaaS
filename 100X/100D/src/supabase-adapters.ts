import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplyEventResult, ContactResolution, DiagnosticEvent, IngestRepository, NormalizedOutboundEvent,
  ResolutionStatus, SuppressionKind,
} from "./types";

// Production repository. Every mutation flows through migration-004 fixed-search-path SECURITY DEFINER
// functions; the route/worker authenticates as the dedicated least-privilege `veltex_100d_ingest` role
// (a short-lived JWT) and holds EXECUTE on those functions ONLY — no direct table read/write and no
// service-role key. The atomic apply resolves the contact, inserts the idempotent receipt, applies the
// durable suppression when needed, records the processing outcome, and holds unmatched events — in one
// transaction — so a receipt is never stored without its due suppression.
export class SupabaseIngestRepository implements IngestRepository {
  constructor(private readonly client: SupabaseClient) {}
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.client.rpc(fn, args);
    if (error) throw new Error(`100D rpc ${fn} failed: ${error.message}`);
    return data as T;
  }

  async resolveContact(normalizedEmail: string | null, campaignConfigId: string | null): Promise<ContactResolution> {
    const r = await this.rpc<{ status: ResolutionStatus; contact_id: string | null; reason: string }>("resolve_100d_contact", {
      requested_email: normalizedEmail, requested_campaign_config_id: campaignConfigId,
    });
    return { status: r.status, contactId: r.contact_id, reason: r.reason };
  }

  async applyEvent(event: NormalizedOutboundEvent): Promise<ApplyEventResult> {
    const r = await this.rpc<{ inserted: boolean; suppression_inserted: boolean; matched: boolean; resolution: ResolutionStatus }>("apply_100d_instantly_event", {
      requested_provider: event.provider,
      requested_event_id: event.providerEventId,
      requested_event_type: event.rawEventType,
      requested_campaign_config_id: event.campaignConfigId,
      requested_normalized_email: event.normalizedEmail,
      requested_occurred_at: event.occurredAt,
      requested_suppresses: event.suppresses,
      requested_suppression_kind: event.suppressionKind,
      requested_engagement_category: event.engagementCategory,
      requested_provider_metadata: event.providerMetadata,
      requested_normalization_version: event.normalizationVersion,
    });
    return { inserted: r.inserted, suppressionInserted: r.suppression_inserted, matched: r.matched, resolution: r.resolution };
  }

  async applyCustomerStatus(kind: SuppressionKind, normalizedEmail: string, source: string, externalReference: string | null, occurredAt: string): Promise<{ inserted: boolean }> {
    const r = await this.rpc<{ inserted: boolean }>("apply_100d_customer_status", {
      requested_kind: kind, requested_email: normalizedEmail, requested_source: source,
      requested_external_reference: externalReference, requested_occurred_at: occurredAt,
    });
    return { inserted: r.inserted };
  }

  async listUnmatched(): Promise<Array<{ providerEventId: string; event: NormalizedOutboundEvent }>> {
    // Reconciliation reads the held queue through a dedicated read function (SECURITY DEFINER) that
    // returns PII-free rows; the raw email is not exposed.
    const rows = await this.rpc<Array<{ provider_event_id: string; event: NormalizedOutboundEvent }>>("list_100d_unmatched", {});
    return (rows ?? []).map((r) => ({ providerEventId: r.provider_event_id, event: r.event }));
  }

  async markReconciled(providerEventId: string, contactId: string): Promise<{ reconciled: boolean }> {
    const r = await this.rpc<{ reconciled: boolean }>("reconcile_100d_event", { requested_provider_event_id: providerEventId, requested_contact_id: contactId });
    return { reconciled: r.reconciled };
  }

  async emitDiagnostic(event: DiagnosticEvent): Promise<void> {
    await this.rpc<null>("record_100d_diagnostic", { requested_run_id: event.runId, requested_level: event.level, requested_event: event.event, requested_data: event.data ?? null });
  }
}
