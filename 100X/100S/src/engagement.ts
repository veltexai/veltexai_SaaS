import type { EngagementClass, EngagementDecision } from "./types";

const patterns: Array<{ classification: EngagementClass; pattern: RegExp }> = [
  { classification: "legal_risk", pattern: /\b(?:lawyer|lawsuit|legal|compliance|employee classification|wage law)\b/i },
  { classification: "complaint", pattern: /\b(?:refund|charged|fraud|scam|broken|doesn't work|angry|complaint)\b/i },
  { classification: "spam", pattern: /\b(?:crypto|forex|dm me for promotion|buy followers)\b/i },
  { classification: "lead", pattern: /\b(?:demo|trial|pricing|subscribe|sign up|interested)\b/i },
  { classification: "objection", pattern: /\b(?:too expensive|already use|why pay|spreadsheet is fine)\b/i },
];
const publicAnswerDenylist = /\b(?:guarantee|competitor|customer name|specific price|legal advice|employment advice|refund|chargeback)\b/i;

export function classifyEngagement(text: string): EngagementDecision {
  const match = patterns.find((candidate) => candidate.pattern.test(text));
  const classification = match?.classification ?? "question";
  if (classification === "legal_risk" || classification === "complaint") return { classification, allowAiDraft: false, requiresHumanApproval: true, priority: "urgent", reason: "Sensitive items route directly to a human; no AI reply is generated" };
  if (publicAnswerDenylist.test(text)) return { classification, allowAiDraft: false, requiresHumanApproval: true, priority: "high", reason: "Public-answer denylist matched" };
  return { classification, allowAiDraft: classification !== "spam", requiresHumanApproval: true, priority: classification === "lead" ? "high" : "normal", reason: classification === "spam" ? "Hide or report after human review; do not reply" : "AI may suggest a reply, but a human must approve it" };
}
