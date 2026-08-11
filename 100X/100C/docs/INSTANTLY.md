# Instantly API V2 — 100C adapter

100C uses **Instantly API V2 only** (never V1). No live call is made anywhere in 100C until a real key
+ `fetch` are injected and an operator run is explicitly authorized.

## Endpoints (verified 2026-08)
- Campaign state read — `GET https://api.instantly.ai/api/v2/campaigns/{id}` (scope `campaigns:read`).
- Lead creation — `POST https://api.instantly.ai/api/v2/leads` (scope `leads:create`).
- Read-only reconciliation — `POST https://api.instantly.ai/api/v2/leads/list` (scope `leads:read`).

Auth: `Authorization: Bearer <API_KEY>`. The key travels only in that header and never appears in a
log, error, or plan.

## Campaign status → normalized state
Instantly returns a numeric `status`: `0 Draft`, `1 Active`, `2 Paused`, `3 Completed`,
`4 Running Subsequences`, `-1 Accounts Unhealthy`, `-2 Bounce Protect`, `-99 Account Suspended`.
100C maps these to named states; anything else is `unknown`. **Only Draft and Paused are pilot-safe;
every other state (and unknown) fails closed.** A campaign-state read always occurs before any lead
creation.

## Workspace identity (fail-closed)
The Instantly V2 campaign object exposes `organization` (a UUID) as the workspace/organization
identifier; the adapter parses it into `observedWorkspaceId`. When an approved campaign configures
`expectedWorkspaceId`, the freshly-read campaign **must** return a non-blank, well-formed, matching
`organization`; a missing, blank, malformed, or different value **rejects the run before any
reservation or lead creation**. When no `expectedWorkspaceId` is configured, the campaign-id ↔
environment binding plus the authenticated campaign read are the verification (a null observed id is
then acceptable) — the campaign state is still read live immediately before submission, and only Draft
or Paused campaigns are used.

## Lead payload (smallest safe)
`campaign`, `email`, `first_name`, `last_name`, `company_name`, `website`, `job_title`, optional
`personalization`, and `custom_variables` = `{ veltex_contact_id, veltex_campaign_config_id }`
(nonsecret internal attribution). Explicit duplicate-safety flags on every create:
`skip_if_in_workspace: true`, `skip_if_in_campaign: true`, `skip_if_in_list: true`. The workspace
default blocklist applies unless an approved `blocklist_id` is configured.

**`verify_leads_on_import` is explicitly `false`.** 100B already requires a verified email, and enabling
Instantly's import verification can consume credits and introduce asynchronous behavior; keeping it off
makes the pilot deterministic and cost-bounded. Never sent: phone, private provider metadata, Apollo
payloads, Supabase ids without a campaign purpose, or internal scoring.

## Retries, budget, and ambiguity
Reads (campaign state, reconcile) are idempotent and may retry transient/rate-limited responses
(honoring `Retry-After`). Create-lead is **not** blindly retried: a timeout or a 5xx after the request
was sent is **ambiguous** (Instantly may have created the lead), so it raises `ambiguous` and the runner
routes the pair to `reconciliation_required`, then resolves it read-only via `leads/list`. Every
physical request — including retries — counts against the ≤4 total-provider-request budget and is
recorded in `OutboundRequestAccounting` (campaignReads, leadWrites, reconcileReads, retryAttempts,
providerErrors, ambiguousOutcomes).

## Error categories
`auth (401) · scope (403) · payment (402) · campaign_not_found (404) · duplicate (409) ·
invalid_lead (400/422) · rate_limit (429, retried) · transient (5xx read, retried) · timeout ·
malformed · ambiguous · request_cap`, plus `campaign_unsafe_state` and `blocklisted` surfaced by the
runner/allowlist. `auth`, `scope`, `payment`, `campaign_not_found`, `invalid_lead`, `blocklisted`,
`duplicate`, `permanent`, and `malformed` are never retried; `auth/scope/payment/campaign_not_found`
are systemic and stop the run.

## Required Instantly V2 scopes (least privilege)
Require **only** `campaigns:read`, `leads:create`, and (if reconciliation runs) `leads:read`. Do **not**
require campaign create/update/activate, email-sending, account modification, webhook creation, or
workspace administration / master `all:all`. Verify exact scope labels in Instantly's V2 docs before
issuing a key.

## Webhooks
Instantly event webhooks may require a qualifying plan. 100C builds **no** webhook and exposes **no**
route in this phase; the future event contract is in `docs/100D_EVENT_HANDOFF.md`.

## References
- Introduction — https://developer.instantly.ai/api-reference/introduction
- Create lead — https://developer.instantly.ai/api-reference/lead/create-lead
- List leads — https://developer.instantly.ai/api-reference/lead/list-leads
- List campaign — https://developer.instantly.ai/api-reference/campaign/list-campaign
- API v2 overview — https://help.instantly.ai/en/articles/10432807-api-v2
