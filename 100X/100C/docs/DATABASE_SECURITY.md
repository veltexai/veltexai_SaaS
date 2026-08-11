# 100C database authorization

100C uses a dedicated `veltex_100c_worker` Postgres role (`NOLOGIN NOINHERIT NOBYPASSRLS`) through
Supabase/PostgREST with a short-lived JWT whose role claim is exactly `veltex_100c_worker`. The
operator rejects any other role and never consumes `SUPABASE_SERVICE_ROLE_KEY`.

`database/003_instantly_campaign_sync.sql` (applied to the approved `100c-pilot` project only, never to
production) creates the role, applies RLS to all eight new tables, and grants the worker the minimum it
needs:

- **read** the approved 100A `internal_prospects`, 100B `prospect_contacts` and
  `prospect_contact_sources` (via **additive** policies that do not alter the 001/002 policies), plus
  `campaign_configs`, `campaign_contact_assignments`, `outbound_event_receipts`, the durable
  `outbound_suppression_registry`, and the `campaign_sync_workflow_state` row;
- **insert** 100C diagnostics; and
- **execute** the eight run-lock-scoped fixed-search-path `SECURITY DEFINER` mutation functions.

## Customer / suppression registry (real exclusion source)
100A's `prospect_status` is constrained to `discovered | identity_review`, so it can never identify a
Veltex AI customer. Customer/trial exclusion and durable suppression therefore live in the
provider-neutral `outbound_suppression_registry` (kinds: `existing_customer`, `active_trial`,
`unsubscribed`, `hard_bounce`, `spam_complaint`, `do_not_contact`, `manual_block`,
`legal_compliance`), matched by normalized email and/or company domain, with source, reason, external
reference, and timestamp preserved. It is **append-only and auditable**: the sync worker has a
SELECT-only policy and **no** insert/update/delete grant, so it can read suppression but can never
erase or weaken it. A dedicated fixed-search-path `apply_100c_suppression(...)` function performs
idempotent, replay-safe ingestion (unique on kind/match/email/domain/source/occurred_at) and is **not**
granted to the worker — ingestion is a separate, later, authorized action. HubSpot and the production
customer database are **not** integrated here; they are the future callers of that clean interface.
The recheck evaluates the registry immediately before reservation and again immediately before
submission, and **fails closed** if the registry cannot be read.

The worker has **no** direct insert/update/delete on assignments, attempts, lead mappings, or event
receipts — every mutation flows through a function that requires the **live run-owned lock**:
`acquire/renew/release_100c_lock`, `reserve_100c_assignment` (idempotent; also verifies the campaign is
approved+active), `transition_100c_assignment` (validates the lifecycle state), `record_100c_attempt`,
`record_100c_lead_mapping` (unique per assignment), and `apply_100c_event_receipt` (idempotent event
foundation, append-only, does **not** touch `prospect_contacts`).

## Idempotency at the schema level
`campaign_contact_assignments` has `unique (contact_id, campaign_config_id)` — a contact can hold at
most one assignment per campaign, so no replay/timeout/overlap can double-submit.
`instantly_lead_mappings` is `unique (assignment_id)` and `outbound_event_receipts` is
`unique (provider, provider_event_id)`.

## Relationship to 001/002
100C does **not** weaken 100A or 100B. It adds a new role, additive read policies, and its own tables
and functions. Verified on an ephemeral PostgreSQL: apply 001+002+003 → 35/35 schema/RLS/role/grant/
lock/idempotency/behavioral assertions pass, and the 100A/100B roles, tables, and own policies remain
intact.

## Worker JWT
Create a short-lived server-side JWT with role claim exactly `veltex_100c_worker` via the approved
Supabase signing process; supply it only as `SUPABASE_100C_WORKER_JWT` to the terminal operator. Never
store either credential in the repository or expose it to browser code. Before applying `003`, verify
function ownership, `authenticator` membership, grants, policies, token expiry, rotation, audit access,
and backups in the target pilot project. **`003` is applied to the approved `100c-pilot` project only; the
short-lived worker JWT is issued at preview time and destroyed after the read-only verification.**
