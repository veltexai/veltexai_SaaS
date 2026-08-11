import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassifiedReply, ReplyApplyResult, ReplyRepository } from "./types";

export class SupabaseReplyRepository implements ReplyRepository {
  constructor(private readonly client: SupabaseClient) {}
  async applyClassification(reply: ClassifiedReply): Promise<ReplyApplyResult> {
    const { data, error } = await this.client.rpc("apply_100e_reply_classification", {
      requested_provider_event_id: reply.providerEventId,
      requested_campaign_config_id: reply.campaignConfigId,
      requested_normalized_email: reply.normalizedEmail,
      requested_occurred_at: reply.occurredAt,
      requested_classification: reply.classification,
      requested_route: reply.route,
      requested_confidence: reply.confidence,
      requested_evidence_codes: reply.evidenceCodes,
      requested_body_sha256: reply.bodySha256,
      requested_body_length: reply.bodyLength,
      requested_classifier_version: reply.classifierVersion,
      requested_suppression_kind: reply.suppressionKind,
    });
    if (error) throw new Error(`100E classification apply failed: ${error.message}`);
    const row = data as { inserted: boolean; suppression_inserted: boolean };
    return { inserted: row.inserted, suppressionInserted: row.suppression_inserted };
  }
}
