import { createHash } from "node:crypto";
import { CLASSIFIER_VERSION, type ReplyClassification, type ReplyRoute } from "./types";

interface Decision { classification: ReplyClassification; route: ReplyRoute; confidence: number; evidenceCodes: string[]; suppressionKind: "do_not_contact" | null }

const rules: Array<{ code: string; classification: ReplyClassification; route: ReplyRoute; confidence: number; suppress: boolean; pattern: RegExp }> = [
  { code: "explicit_unsubscribe", classification: "unsubscribe", route: "no_action", confidence: 0.99, suppress: true, pattern: /\b(unsubscribe|remove me|take me off|stop (emailing|contacting)|do not (email|contact))\b/i },
  { code: "wrong_person", classification: "wrong_person", route: "human_review", confidence: 0.96, suppress: true, pattern: /\b(wrong person|no longer (work|with)|not the (right|correct) person|contact .* instead)\b/i },
  { code: "out_of_office", classification: "out_of_office", route: "follow_up_later", confidence: 0.97, suppress: false, pattern: /\b(out of (the )?office|automatic reply|auto[ -]?reply|on (vacation|leave)|return(ing)? on)\b/i },
  { code: "not_interested", classification: "not_interested", route: "no_action", confidence: 0.94, suppress: true, pattern: /\b(not interested|no thank(s| you)?|not a fit|pass on this|we'?re all set)\b/i },
  { code: "meeting_intent", classification: "meeting_intent", route: "scheduling_review", confidence: 0.93, suppress: false, pattern: /\b(book|schedule|calendar|meeting|call|demo|availability|available (on|at|tomorrow|next))\b/i },
  { code: "positive_interest", classification: "interested", route: "sales_review", confidence: 0.9, suppress: false, pattern: /\b(interested|tell me more|sounds good|let'?s talk|send (me )?(more|details)|would like to learn)\b/i },
];

export function normalizeReplyText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ").trim();
}

export function classifyReply(text: string, eventType: string): Decision & { bodySha256: string; bodyLength: number; classifierVersion: string } {
  const bodySha256 = createHash("sha256").update(text, "utf8").digest("hex");
  if (eventType === "auto_reply_received") {
    return { classification: "automatic_reply", route: "follow_up_later", confidence: 0.98, evidenceCodes: ["provider_auto_reply"], suppressionKind: null, bodySha256, bodyLength: text.length, classifierVersion: CLASSIFIER_VERSION };
  }
  for (const rule of rules) {
    if (rule.pattern.test(text)) return { classification: rule.classification, route: rule.route, confidence: rule.confidence, evidenceCodes: [rule.code], suppressionKind: rule.suppress ? "do_not_contact" : null, bodySha256, bodyLength: text.length, classifierVersion: CLASSIFIER_VERSION };
  }
  if (/\?/.test(text)) return { classification: "question", route: "sales_review", confidence: 0.7, evidenceCodes: ["question_mark"], suppressionKind: null, bodySha256, bodyLength: text.length, classifierVersion: CLASSIFIER_VERSION };
  return { classification: "unknown", route: "human_review", confidence: 0, evidenceCodes: ["no_rule_match"], suppressionKind: null, bodySha256, bodyLength: text.length, classifierVersion: CLASSIFIER_VERSION };
}
