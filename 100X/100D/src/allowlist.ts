// Workspace + campaign allowlisting (Part 4). 100D reuses 100C's approved campaign allowlist
// (operator/campaigns.json + campaign_configs) as the authoritative source — it never accepts an
// arbitrary campaign id from the request. An event must match an approved+active campaign whose
// provider campaign id and workspace both equal the event's values, or it fails closed.

export interface AllowlistCampaign {
  configId: string;
  instantlyCampaignId: string | null;
  expectedWorkspaceId: string | null;
  approved: boolean;
  active: boolean;
}

export interface AllowlistMatch {
  ok: boolean;
  campaignConfigId: string | null;
  reason: string;
}

export function matchApprovedCampaign(
  workspaceId: string | null | undefined,
  campaignId: string | null | undefined,
  campaigns: AllowlistCampaign[],
): AllowlistMatch {
  const ws = typeof workspaceId === "string" ? workspaceId.trim() : "";
  const cid = typeof campaignId === "string" ? campaignId.trim() : "";
  if (!ws) return { ok: false, campaignConfigId: null, reason: "missing workspace" };
  if (!cid) return { ok: false, campaignConfigId: null, reason: "missing campaign" };

  const campaign = campaigns.find((c) => c.instantlyCampaignId && c.instantlyCampaignId === cid);
  if (!campaign) return { ok: false, campaignConfigId: null, reason: "unknown campaign" };
  if (!campaign.approved || !campaign.active) return { ok: false, campaignConfigId: null, reason: "campaign is not approved/active" };
  if (!campaign.expectedWorkspaceId) return { ok: false, campaignConfigId: null, reason: "campaign has no pinned workspace" };
  if (campaign.expectedWorkspaceId !== ws) return { ok: false, campaignConfigId: null, reason: "workspace does not match approved campaign" };
  return { ok: true, campaignConfigId: campaign.configId, reason: "ok" };
}
