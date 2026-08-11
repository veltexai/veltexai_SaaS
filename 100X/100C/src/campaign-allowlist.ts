import { PILOT_SAFE_CAMPAIGN_STATES } from "./types";
import type { ApprovedCampaign, CampaignState } from "./types";

// Campaign safety model. 100C never accepts an arbitrary campaign id: a campaign must be present in
// the approved allowlist, approved+active, bound to the approved environment, and (before any live
// lead) observed in a pilot-safe state (draft/paused). Every other state fails closed.

export function selectApprovedCampaign(configId: string, campaigns: ApprovedCampaign[], environmentId: string): ApprovedCampaign {
  const campaign = campaigns.find((c) => c.configId === configId);
  if (!campaign) throw new Error("campaign is not in the approved allowlist");
  if (!campaign.approved) throw new Error("campaign is not approved");
  if (!campaign.active) throw new Error("campaign is disabled");
  if (!campaign.approvalReference) throw new Error("campaign approval reference is required");
  if (!campaign.instantlyCampaignId) throw new Error("campaign has no approved Instantly campaign id (unapproved placeholder)");
  if (campaign.environment !== environmentId) throw new Error("campaign is not bound to the approved environment");
  if (campaign.dailySyncCap <= 0 || campaign.totalPilotCap <= 0) throw new Error("campaign caps must be positive");
  return campaign;
}

// Verify the freshly-read provider campaign state is safe for the pilot. Called BEFORE any lead
// creation. Rejects active/completed/unknown/unhealthy/etc.
export function assertCampaignStateSafe(campaign: ApprovedCampaign, observed: CampaignState, allowActive = false): void {
  const allowed = campaign.allowedStates.length ? campaign.allowedStates : [...PILOT_SAFE_CAMPAIGN_STATES];
  const permitted = allowActive ? [...PILOT_SAFE_CAMPAIGN_STATES, "active" as const] : [...PILOT_SAFE_CAMPAIGN_STATES];
  if (observed === "active" && !allowActive) throw new Error("campaign is active; active sync requires explicit authorization");
  if (!allowed.every((s) => permitted.includes(s as typeof permitted[number]))) {
    throw new Error("campaign allowlist permits a non-pilot-safe state");
  }
  if (!permitted.includes(observed as typeof permitted[number])) throw new Error(`campaign state '${observed}' is not authorized; failing closed`);
  if (!allowed.includes(observed)) throw new Error(`campaign state '${observed}' is not in the campaign allowlist`);
}

// Fail-closed workspace identity check. When an approved campaign configures `expectedWorkspaceId`,
// the freshly-read Instantly campaign MUST provide a verifiable, matching workspace identity
// (Instantly V2 `organization`). A missing, blank, malformed, or different observed identity rejects
// the run BEFORE any reservation or lead creation. When no `expectedWorkspaceId` is configured, the
// campaign-id ↔ environment binding + the authenticated campaign read remain the verification (see
// docs/INSTANTLY.md); a null observed id is then acceptable.
const WORKSPACE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{3,}$/; // non-blank, plausibly an id/UUID

export function assertWorkspaceAllowed(campaign: ApprovedCampaign, observedWorkspaceId: string | null): void {
  if (!campaign.expectedWorkspaceId) return; // no workspace pin configured — nothing to verify here
  const observed = typeof observedWorkspaceId === "string" ? observedWorkspaceId.trim() : "";
  if (!observed) throw new Error("expected Instantly workspace is configured but none was returned; failing closed");
  if (!WORKSPACE_ID_RE.test(observed)) throw new Error("observed Instantly workspace identity is malformed; failing closed");
  if (observed !== campaign.expectedWorkspaceId) throw new Error("Instantly workspace does not match the approved campaign workspace");
}
