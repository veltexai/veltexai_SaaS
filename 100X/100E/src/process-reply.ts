import { normalizeEmail } from "../../100D/src/normalize";
import { classifyReply, normalizeReplyText } from "./classifier";
import type { ReplyPayload, ReplyRepository, ReplyResult } from "./types";

export interface ReplyDeps {
  enabled: boolean;
  maxReplyChars: number;
  campaignConfigId: string;
  providerEventId: string;
  repository: ReplyRepository;
  now: () => Date;
}

export async function processReply(payload: ReplyPayload, deps: ReplyDeps): Promise<ReplyResult> {
  const eventType = typeof payload.event_type === "string" ? payload.event_type : "";
  if (!deps.enabled) return { outcome: "ignored", classification: null, route: null, reason: "100E is disabled" };
  if (eventType !== "reply_received" && eventType !== "auto_reply_received") return { outcome: "ignored", classification: null, route: null, reason: "not a reply event" };
  const normalizedEmail = normalizeEmail(typeof payload.lead_email === "string" ? payload.lead_email : null);
  if (!normalizedEmail) return { outcome: "rejected_invalid", classification: null, route: null, reason: "missing lead email" };
  const source = payload.reply_text ?? payload.text ?? payload.reply_html ?? payload.html;
  const text = normalizeReplyText(source);
  if (!text) return { outcome: "rejected_invalid", classification: null, route: null, reason: "missing reply content" };
  if (text.length > deps.maxReplyChars) return { outcome: "rejected_invalid", classification: null, route: null, reason: "reply exceeds configured limit" };
  const occurredAtRaw = typeof payload.timestamp === "string" ? payload.timestamp : deps.now().toISOString();
  const occurredAt = Number.isNaN(Date.parse(occurredAtRaw)) ? deps.now().toISOString() : new Date(occurredAtRaw).toISOString();
  const decision = classifyReply(text, eventType);
  const applied = await deps.repository.applyClassification({
    providerEventId: deps.providerEventId, campaignConfigId: deps.campaignConfigId, normalizedEmail,
    occurredAt, ...decision,
  });
  return { outcome: applied.inserted ? "processed" : "duplicate", classification: decision.classification, route: decision.route, reason: applied.inserted ? "classified and routed" : "idempotent replay" };
}
