import type { ContactResolution } from "./types";

// Pure contact resolution (Part 7). Resolve an event to an internal contact by, in order:
//   1. an existing Instantly lead mapping for this campaign (strongest link), then
//   2. a campaign assignment for the normalized email within the approved campaign.
// Both reduce to "the contact assigned to this approved campaign whose normalized email matches".
// Fail CLOSED: zero matches -> unmatched; more than one -> ambiguous. Never partial-name match; never
// resolve across a different campaign.

export interface AssignmentRow {
  contactId: string;
  campaignConfigId: string;
  normalizedEmail: string | null;
  hasLeadMapping: boolean;
}

export function resolveContactFrom(
  normalizedEmail: string | null,
  campaignConfigId: string | null,
  assignments: AssignmentRow[],
): ContactResolution {
  if (!campaignConfigId) return { status: "wrong_campaign", contactId: null, reason: "no approved campaign bound" };
  if (!normalizedEmail) return { status: "unmatched", contactId: null, reason: "no normalized email to match" };

  const inCampaign = assignments.filter((a) => a.campaignConfigId === campaignConfigId && a.normalizedEmail === normalizedEmail);
  if (inCampaign.length === 0) {
    // If the email matches a contact in a DIFFERENT campaign, say so explicitly (still fails closed).
    const elsewhere = assignments.some((a) => a.normalizedEmail === normalizedEmail);
    return { status: elsewhere ? "wrong_campaign" : "unmatched", contactId: null, reason: elsewhere ? "contact matches a different campaign" : "no assignment for this email in the approved campaign" };
  }
  const contactIds = new Set(inCampaign.map((a) => a.contactId));
  if (contactIds.size > 1) return { status: "ambiguous", contactId: null, reason: "multiple contacts share this email in the campaign" };

  // Prefer the mapping-backed row when present (strongest link), else the single assignment.
  const withMapping = inCampaign.find((a) => a.hasLeadMapping);
  const chosen = withMapping ?? inCampaign[0];
  return { status: "matched", contactId: chosen.contactId, reason: withMapping ? "resolved via lead mapping" : "resolved via campaign assignment" };
}
