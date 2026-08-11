# 100C — Instantly Campaign Sync

100C is the safe, capped bridge from a **100B outreach-ready contact** to a lead in an **approved
Instantly campaign**. It synchronizes **only currently verified, eligible, non-suppressed** contacts,
rechecking every rule immediately before it creates a lead. It creates no campaign, sends no email,
exposes no route, and runs on no schedule. **Not activated.**

```
100B ready contact → fresh eligibility + suppression recheck → approved campaign mapping
  → campaign-state safety check → idempotency reservation → Instantly lead creation
  → provider lead id stored → submission reconciled → (future) 100D events back to 100X
```

## Status and safety
- Inactive by default (`VELTEX_100C_ENABLED` must equal `true`); manual, terminal execution only.
- No route, webhook, cron, schedule, or campaign create/activate/pause/resume/update.
- Instantly **API V2 only** (never V1). Bearer auth; the key is supplied only at runtime and never logged.
- Reuses the 100A/100B safety architecture: run-owned lock, request/write caps, resilient
  diagnostics, environment + campaign allowlists, operator preflight-before-clients, in-memory
  testing, credential isolation, RLS + fixed-search-path `SECURITY DEFINER` mutation functions,
  fixture + static-boundary tests.
- **Does not weaken 001 or 002.** Migration `003` only *adds* a dedicated read-only worker role,
  additive read policies on `internal_prospects` and `prospect_contacts`, and 100C-owned tables.
  Instantly state is never mixed into `prospect_contacts`.

## Point-in-time eligibility (100B is an input, not permission to send)
A contact is considered **only** when it is currently `ready_for_outreach`, `verified`,
`suppression_status = none`, has a normalized work email, belongs to an eligible non-customer
cleaning company, is still the current contact, has no newer bounce/unsubscribe/DNC/suppression
event, is not an existing customer / active trial / suppressed entry in the durable registry, and is
not already assigned/submitted to the campaign. Everything else fails closed into an explicit recheck
outcome (`duplicate · suppressed · stale · ineligible`) with a preserved reason. The recheck runs
**immediately before reservation and again immediately before submission**; if anything changed after
reservation, the assignment is transitioned and **no lead-create request is constructed**.

Customer/trial status and durable suppression come from a provider-neutral
`outbound_suppression_registry` (matched by normalized email and/or company domain), **not** from
100A's `prospect_status` (which is only `discovered | identity_review` and cannot identify a
customer). Provider attribution is read from the actual `prospect_contact_sources` (never hardcoded);
a contact with no authoritative source is held. The pilot may start with an empty registry **only if**
the founder confirms the single pilot contact is not a customer/active trial, the pilot is limited to
one contact, and the registry is later fed automatically (HubSpot / customer DB) via
`apply_100c_suppression`.

## Campaign safety model
Campaign ids are **allowlisted** (`operator/campaigns.json` + the `campaign_configs` table). A
campaign must be approved, active, bound to the approved environment, and — read live before any
lead — observed in a **Draft or Paused** state. Active, Completed, Running-Subsequences, Unhealthy,
Bounce-Protect, Suspended, or Unknown states **fail closed**. 100C never creates, activates, pauses,
resumes, or modifies a campaign. One campaign is approved for the read-only pilot: a dedicated,
never-activated Instantly campaign ("Veltex AI 100C Pilot — No Send", config `veltex-100c-pilot-no-send`)
bound to the approved `100c-pilot` environment, with a pinned workspace, caps of 1/1, and allowed states
Draft/Paused. It has been verified live as **Draft** with zero leads. Controlled-write remains a separate
founder action; until then this campaign is used only for read-only provider-preview.

## Idempotency
A stable `(canonical contact id, approved campaign id)` identity is enforced by a unique database
constraint. A contact is never submitted to the same campaign twice — across replays, timeouts,
ambiguous provider responses, worker crashes, overlapping workers, retries, or reconciliation. The
submission lifecycle is `eligible · reserved · submitting · submitted · skipped_duplicate ·
reconciliation_required · failed_retryable · failed_terminal · suppressed · cancelled`. **Ambiguous
outcomes are never blindly retried** — they enter `reconciliation_required` and are resolved by a
read-only reconciliation.

## Instantly lead payload
The smallest payload for the approved campaign: campaign id, work email, first/last name, company,
website, job title, optional approved personalization, and nonsecret internal attribution
(`custom_variables`). It sends **no** phone, private provider metadata, Apollo payloads, Supabase ids,
or scoring. Duplicate-safety flags are explicit: `skip_if_in_workspace`, `skip_if_in_campaign`,
`skip_if_in_list` = true. `verify_leads_on_import` is explicitly **false** (100B already guarantees a
verified email; enabling Instantly verification could add cost/async behavior — see `docs/INSTANTLY.md`).

## Operator modes (all external modes inactive by default)
- `dry-run` — validates config + plan; constructs no client, makes no call, writes nothing.
- `fixture-preview` — synthetic contacts + mock adapter + in-memory; zero external calls.
- `provider-preview` — **read-only** Instantly campaign-state inspection for an approved campaign; no
  lead creation, no Supabase, no write.
- `controlled-write` — capped pilot submission (≤1 lead) into an approved Draft/Paused campaign in the
  approved isolated environment only; exact target + campaign confirmations, worker JWT, write phrase
  `LEADS_MAX_1`; disabled by default.

## Pilot limits (centralized in `src/config.ts`)
≤5 contacts considered, ≤1 lead submitted, ≤1 Instantly write request, ≤4 total provider requests
(retries count), ≤10 min runtime, exactly 15-min lock TTL, one approved campaign, one approved
environment.

Docs: `docs/ARCHITECTURE.md`, `docs/DATABASE_SECURITY.md`, `docs/INSTANTLY.md`, `docs/PILOT_RUNBOOK.md`,
`docs/TESTING.md`, `docs/100D_EVENT_HANDOFF.md`, `docs/AUTOMATION_ROADMAP.md`.
Migration: `database/003_instantly_campaign_sync.sql` (applied to the approved `100c-pilot` project only,
never to production; depends on 001 + 002).
