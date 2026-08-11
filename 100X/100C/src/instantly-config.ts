import type { CampaignState } from "./types";

// Centralized Instantly API V2 configuration — the single source of truth for endpoints, the
// numeric->named campaign-state map, disabled-feature flags, retry bounds, and planned scopes.
// NOTHING here makes a live call. V2 ONLY (never V1). See docs/INSTANTLY.md.

export const INSTANTLY_BASE_URL = "https://api.instantly.ai/api/v2" as const;
export const INSTANTLY_ENDPOINTS = Object.freeze({
  campaignById: (id: string) => `${INSTANTLY_BASE_URL}/campaigns/${id}`, // GET  — campaign state read
  createLead: `${INSTANTLY_BASE_URL}/leads`,                            // POST — capped lead creation
  listLeads: `${INSTANTLY_BASE_URL}/leads/list`,                        // POST — read-only reconciliation
} as const);

// Instantly V2 numeric campaign status -> normalized state. Anything unrecognized -> "unknown".
export function mapCampaignStatus(status: unknown): CampaignState {
  switch (status) {
    case 0: return "draft";
    case 1: return "active";
    case 2: return "paused";
    case 3: return "completed";
    case 4: return "running_subsequences";
    case -1: return "accounts_unhealthy";
    case -2: return "bounce_protect";
    case -99: return "account_suspended";
    default: return "unknown";
  }
}

export const INSTANTLY_PILOT_LIMITS = Object.freeze({
  maxAttemptsPerRequest: 3,   // physical attempts (incl. retries) per logical request
  timeoutMs: 10_000,
  maxBackoffMs: 2_000,
  defaultRetryAfterMs: 1_000,
});

// Duplicate-safety flags sent EXPLICITLY on every create-lead call so a lead can never be
// double-added, and email-verification-on-import stays off (100B already guarantees verified email;
// enabling Instantly verification may add cost / async behavior — see docs/INSTANTLY.md).
export const INSTANTLY_PILOT_LEAD_FLAGS = Object.freeze({
  skip_if_in_workspace: true,
  skip_if_in_campaign: true,
  skip_if_in_list: true,
  verify_leads_on_import: false,
});

// Least-privilege Instantly V2 scopes the pilot plans to require. Verified against V2 docs.
export const REQUIRED_INSTANTLY_SCOPES = Object.freeze({
  campaignsRead: "campaigns:read", // GET /campaigns/{id}
  leadsCreate: "leads:create",     // POST /leads
  leadsRead: "leads:read",         // POST /leads/list (only if reconciliation is used)
} as const);
// Scopes 100C must NOT require (documented for the founder before issuing a key).
export const FORBIDDEN_INSTANTLY_SCOPES: readonly string[] = [
  "campaigns:create", "campaigns:update", "campaigns:all", "emails:send", "accounts:update",
  "webhooks:create", "workspaces:admin", "all:all",
];
