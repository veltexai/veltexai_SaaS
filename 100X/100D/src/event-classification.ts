import type { EngagementCategory, InstantlyEventType, SuppressionKind } from "./types";
import { INSTANTLY_EVENT_TYPES } from "./types";

// Deterministic classification of an Instantly event type into a provider-neutral engagement
// category, plus whether it must suppress the contact and with what durable kind. Unknown/custom
// labels fail SAFE: category "unknown", never suppresses, and are held for review downstream.
//
// A reply, open, or click NEVER suppresses. Only bounce/unsubscribe/complaint/DNC suppress.

interface Classification {
  category: EngagementCategory;
  suppresses: boolean;
  suppressionKind: SuppressionKind | null;
}

const DELIVERY = new Set<InstantlyEventType>(["email_sent", "email_opened", "email_link_clicked", "campaign_completed"]);
const REPLY = new Set<InstantlyEventType>(["reply_received", "auto_reply_received", "lead_neutral", "lead_interested", "lead_not_interested", "lead_out_of_office", "lead_wrong_person"]);
const MEETING = new Set<InstantlyEventType>(["lead_meeting_booked", "lead_meeting_completed", "lead_closed", "lead_no_show"]);
const OPERATIONAL = new Set<InstantlyEventType>(["account_error"]);

// Suppression mapping — the ONLY events that create a durable suppression.
const SUPPRESSION: Partial<Record<InstantlyEventType, SuppressionKind>> = {
  email_bounced: "hard_bounce",
  lead_unsubscribed: "unsubscribed",
  spam_complaint: "spam_complaint",
  do_not_contact: "do_not_contact",
};

export function isKnownInstantlyEvent(eventType: string): eventType is InstantlyEventType {
  return (INSTANTLY_EVENT_TYPES as readonly string[]).includes(eventType);
}

export function classifyEvent(eventType: string): Classification {
  if (!isKnownInstantlyEvent(eventType)) {
    return { category: "unknown", suppresses: false, suppressionKind: null };
  }
  const suppressionKind = SUPPRESSION[eventType] ?? null;
  if (suppressionKind) return { category: "suppression", suppresses: true, suppressionKind };
  if (DELIVERY.has(eventType)) return { category: "delivery", suppresses: false, suppressionKind: null };
  if (REPLY.has(eventType)) return { category: "reply", suppresses: false, suppressionKind: null };
  if (MEETING.has(eventType)) return { category: "meeting", suppresses: false, suppressionKind: null };
  if (OPERATIONAL.has(eventType)) return { category: "operational", suppresses: false, suppressionKind: null };
  // Known but uncategorized (defensive) — treat as unknown, never suppress.
  return { category: "unknown", suppresses: false, suppressionKind: null };
}
