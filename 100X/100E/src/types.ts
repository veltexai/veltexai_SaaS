export const WORKFLOW_ID = "100E" as const;
export const CLASSIFIER_VERSION = "100E-rules-v1" as const;

export type ReplyClassification =
  | "interested"
  | "meeting_intent"
  | "question"
  | "not_interested"
  | "unsubscribe"
  | "out_of_office"
  | "wrong_person"
  | "automatic_reply"
  | "unknown";

export type ReplyRoute =
  | "sales_review"
  | "scheduling_review"
  | "follow_up_later"
  | "human_review"
  | "no_action";

export interface ReplyPayload {
  event_type?: unknown;
  workspace?: unknown;
  campaign_id?: unknown;
  lead_email?: unknown;
  timestamp?: unknown;
  email_id?: unknown;
  reply_text?: unknown;
  reply_html?: unknown;
  text?: unknown;
  html?: unknown;
  subject?: unknown;
  [key: string]: unknown;
}

export interface ClassifiedReply {
  providerEventId: string;
  campaignConfigId: string;
  normalizedEmail: string;
  occurredAt: string;
  classification: ReplyClassification;
  route: ReplyRoute;
  confidence: number;
  evidenceCodes: string[];
  bodySha256: string;
  bodyLength: number;
  classifierVersion: string;
  suppressionKind: "do_not_contact" | null;
}

export interface ReplyApplyResult { inserted: boolean; suppressionInserted: boolean }

export interface ReplyRepository {
  applyClassification(reply: ClassifiedReply): Promise<ReplyApplyResult>;
}

export interface ReplyResult {
  outcome: "processed" | "duplicate" | "ignored" | "rejected_invalid";
  classification: ReplyClassification | null;
  route: ReplyRoute | null;
  reason: string;
}
