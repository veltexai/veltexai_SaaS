# Cursor → Codex contract request: R2 organization/team UI shell

Status: DRAFT REQUEST — not a contract until Codex confirms/adjusts it. This
UI remains held from merge/integration regardless of this document's status;
see "What this branch deliberately does NOT do" and the explicit
non-assumptions list below.

Branch: `cursor/r2-team-ui-shell`
Base: `fe8b1d1` (verified exact match to the coordination plan's authoritative base)
Scope: `features/organizations/**`, `app/dashboard/settings/team/**`

## Why this document exists

The UI shell in this branch was built entirely against a local mock adapter
(`features/organizations/lib/mock-team-adapter.ts`) with zero live endpoints,
zero Supabase access, and zero shared domain-contract imports, per the R2
coordination plan's boundaries. This document is the frontend's request for
the real server contract so the mock adapter can be swapped for a real one
with minimal UI churn.

## Update — hardening pass (this revision)

This revision adds a fail-closed invitation capability gate and expands
accessibility/test coverage. It does **not** change the shell's scope and
does **not** assume any answer to the open questions below — every open
question is now explicitly tagged `BLOCKED`, `DEFERRED`, or
`REQUIRED BEFORE INTEGRATION` rather than left implicit.

Cross-reference: Codex's own current backend evidence
(`docs/product/platform-build/R2_ROLE_AND_RLS_MATRIX.md`,
`docs/product/platform-build/R2_IMPLEMENTATION_EVIDENCE.md`, exact reviewed
candidate commit `d12743a` in `/private/tmp/veltex-r0-privilege-hardening`,
superseding `dcf56ce`, `0452823`, and the earlier range `764abc7..1e3c541`)
states team/membership mutation is **disabled for every runtime role** until
a consent-bound invitation flow and a seat-billing decision ship, and that
"invitation email flows are not implemented." Production UI stays on
`UnavailableTeamAdapter` until Codex implements authenticated caller
organization reads, persisted active-organization read/write, guarded
switching, a privacy-minimized roster projection, and server-owned
capabilities. This UI does **not** implement that server adapter.

## Update — backend candidate `d12743a`

Read (did not modify) `/private/tmp/veltex-r0-privilege-hardening` at
`d12743ad8ba00d3d54d883c72c771db399c6d560`
(`fix: correct R2 cleanup guard ordering`). It adds
`supabase/migrations/20260925006000_r2_cleanup_guard_ordering.sql`.

No status in the existing mapping table changes: organization/membership
reads remain **AVAILABLE** at the table/RLS layer; invitations,
`getCapabilities`, contact-detail projections, and any membership mutation
remain **NOT IMPLEMENTED**. The new migration only removes a stale
organization-row lookup from the authorized membership-cascade exception
during empty-account cleanup. Every non-bootstrap insert/update/delete
still raises the fail-closed invitation/seat-billing exception. No
service-role membership bypass was added.

**Production remains unavailable** on this branch until Codex ships all of:

1. Authenticated, caller-bound organization listing
2. Persisted active-organization read (`profiles.active_organization_id`)
3. Guarded active-organization switching (trigger-rejected writes must
   surface, never be swallowed)
4. A privacy-minimized roster projection (see RPC requirements below)
5. Server-owned capabilities, including `invitationsEnabled: false` and
   `contactDetailsEnabled: false` by default

## Update — read-only backend mapping (superseded revision, kept for history)

This revision added no functional/UI code. It (a) eliminated the React
`act(...)` warnings Codex's independent test rerun flagged in
`invite-member-dialog.test.tsx`, and (b) read (without integrating or
modifying) backend candidate `0452823` to replace the guesses above with an
exact, source-verified mapping. **Every citation of `0452823` alone below is
now superseded by the `dcf56ce` mapping in the next section** — kept here
only so the trail of what changed between candidates stays visible.

## Update — read-only backend mapping, range `0452823..dcf56ce`

This revision also adds no functional/UI code. It read (without integrating
or modifying) two further backend commits:

- `52cd691` — `docs: preflight Cursor R2 integration` (Codex's own doc-only
  comparison of this UI's commit `6de1aa4` against backend `0452823`; no
  schema change).
- `dcf56ce` — `fix: close R2 account lifecycle review gaps`, adding
  `supabase/migrations/20260925005000_r2_third_security_remediation.sql`.

None of these change any status in the mapping table below (invitations and
`getCapabilities` remain **NOT IMPLEMENTED**; reads remain **AVAILABLE**).
They tighten backend integrity guarantees this UI does not directly depend
on but should not contradict. Four items the founder specifically asked to
be reflected:

1. **Account deletion semantics.** The FK from `organizations.created_by` to
   `profiles.id`, and the new FK from `profiles.active_organization_id` to
   `organizations.id`, are now `on delete no action deferrable initially
   deferred` (previously the first was `on delete cascade`). Both rows must
   be goneable in the same transaction without Postgres complaining about a
   circular reference mid-statement; deferred `NO ACTION` defers the check
   to transaction end. Tenant-owned data still blocks deletion via separate
   `RESTRICT` foreign keys — this change only affects the empty-account
   case. Cleanup order also changed: `organization_event_inbox`,
   `organization_event_outbox`, and `organization_audit_log` rows for the
   private bootstrap tenant are now deleted **before** the organization row
   itself (previously the same set, different statement ordering), so no
   audit/outbox row can ever reference an organization id that no longer
   exists, even transiently. (`20260925005000...sql` lines ~7-44)
2. **Deferred owner enforcement.** A new deferred constraint trigger,
   `require_organization_owner_on_commit` (on `organizations`, `after insert
   or update of created_by ... deferrable initially deferred`), raises
   `23514` if any organization would commit without its creator holding an
   `owner` row in `organization_memberships`. This closes a gap where a
   direct `service_role` insert into `organizations` could previously commit
   an ownerless tenant before the membership insert landed in the same
   transaction. Not reachable from any browser role; informational for this
   UI, since `listOrganizations()` can now rely on "every organization I can
   see has at least one owner" as an invariant rather than a hope.
   (`20260925005000...sql` lines ~47-71)
3. **Public tracked-view audit suppression.** `record_organization_change()`
   now suppresses audit/outbox noise for *any* pure proposal view-counter
   update (`view_count`/`last_viewed_at`/`updated_at` only), regardless of
   whether the public recipient is anonymous **or** a signed-in user who is
   not an organization member. The prior (second-remediation) version only
   suppressed this for `auth.uid() is null`; a signed-in non-member viewing
   a public tracked link previously could still generate a spurious audit
   row. No client-visible effect — this UI never reads
   `organization_audit_log`. (`20260925005000...sql` lines ~76-97)
4. **Hosted digest/concurrency cleanup.** Unrelated to any table/RLS
   contract this UI depends on: the hosted verification harness's
   proposal-digest baseline check now excludes the harness's own fixture
   rows (`id::text not like '91000000-%'`) so its concurrency test fixtures
   can't produce a false "pre-existing data changed" failure, and the
   last-owner concurrency script's cleanup step now fails loudly (exit 1)
   and removes its temp log files if fixture teardown itself fails, instead
   of silently swallowing a cleanup failure with `|| true`. Purely a test
   harness fix; no schema/RLS/RPC change. (diff of
   `quality/r2-hosted-verification-20260925/**` between `52cd691` and
   `dcf56ce`)
5. **Invitations remain unavailable.** Unchanged by this range:
   `organization_memberships` insert/update/delete stays fully revoked from
   `public, anon, authenticated`, and `guard_organization_membership()`
   still raises `'team memberships are disabled until invitation consent
   and seat billing ship'` (errcode `42501`) for every case except the
   trigger-internal bootstrap. No capability/invitation RPC or column
   exists anywhere in `dcf56ce`. This confirms — again, by direct reading,
   not assumption — that this branch's `invitationsEnabled: false` default
   remains correct with zero changes required.

### Read-only backend mapping — candidate `d12743a` (table statuses unchanged from `dcf56ce`)

Read directly from
`/private/tmp/veltex-r0-privilege-hardening/supabase/migrations/20260925002000_r2_organization_tenancy.sql`,
`..._003000_r2_claude_security_remediation.sql`,
`..._004000_r2_second_security_remediation.sql`, and
`..._005000_r2_third_security_remediation.sql`, and
`..._006000_r2_cleanup_guard_ordering.sql` at commit `d12743a`. No
migration, RLS policy, or backend file was modified to produce this table.

| UI adapter operation | Backend table / helper / policy | Status | Evidence |
| --- | --- | --- | --- |
| `listOrganizations()` | `public.organizations`, policy `organizations_member_read` (`select` using `is_organization_member(id)`); columns `id, name, slug, created_by, created_at, updated_at` match the local `Organization` type as-is | **AVAILABLE** | `20260925002000...sql` lines ~1-11, ~373-375 |
| Active organization (read) | `public.profiles.active_organization_id`, policy `"Users can view own profile"` (`select` using `id = auth.uid()`) | **AVAILABLE** | `020_fix_profiles_rls_recursion.sql` (self-select policy); column added in `20260925002000...sql` line ~24 |
| Active organization (write / "switch org") | `public.profiles.active_organization_id` via generic `"Users can update own profile"` policy (`using id = auth.uid()`), guarded by trigger `guard_profile_active_organization` → `guard_active_organization()`, which raises `42501` unless the new value is one of the caller's own `organization_memberships` rows. As of `dcf56ce`, this column's FK to `organizations` is `on delete no action deferrable initially deferred` (account-deletion ordering only — no change to the write path a client uses) | **AVAILABLE** (as a plain column write, not a dedicated "switch organization" endpoint) | `20260925002000...sql` lines ~113-130; `020_fix_profiles_rls_recursion.sql` lines ~60-66; FK updated in `20260925005000...sql` lines ~12-16 |
| `listMembers(organizationId)` — raw membership rows | `public.organization_memberships`, policy `memberships_member_read` (`select` using `is_organization_member(organization_id)`); returns `organization_id, user_id, role, created_at, updated_at` only — no `id`, `status`, `invited_at`, or `joined_at` | **AVAILABLE**, but shape mismatch vs. `OrganizationMember` | `20260925002000...sql` lines ~14-22, ~380-382 |
| `listMembers(organizationId)` — name/email/avatar enrichment | Would require joining `public.profiles`, but `profiles` has **no** cross-member read policy — only `"Users can view own profile"` (self) and admin-only view-all policies exist | **NOT IMPLEMENTED** | Confirmed via `grep` of every `profiles` policy across `001_initial_schema.sql`, `003_fix_admin_policies.sql`, `020_fix_profiles_rls_recursion.sql`, `20250901194222_add_user_roles.sql` — none grant member-to-member profile reads |
| `inviteMember()` / any membership `insert`/`update`/`delete` | `public.organization_memberships`: `revoke insert, update, delete, truncate ... from public, anon, authenticated` (both remediation migrations); trigger `guard_organization_membership()` raises `'team memberships are disabled until invitation consent and seat billing ship'` (errcode `42501`) for every case except a trigger-internal bootstrap (`pg_trigger_depth() >= 2` in the current candidate) | **NOT IMPLEMENTED** (by design) | `20260925003000...sql` lines ~44-84; `20260925004000...sql` lines ~10-47 |
| `getCapabilities()` (incl. `invitationsEnabled` and `contactDetailsEnabled`) | No table column, RPC, or endpoint of any kind exists for this today | **NOT IMPLEMENTED** | Confirmed via `grep` for `capabilit` across the R2 migrations through `d12743a` — zero matches |
| `InviteMemberInput.role` accepting `"owner"` | `organization_memberships.role` check constraint allows `'owner'|'admin'|'estimator'|'viewer'` at the column level; no server rule specifically rejects an "invite" naming `owner` because no invite path exists at all yet | **NOT IMPLEMENTED** (moot until an invite endpoint exists; the UI already excludes `owner` from `INVITABLE_ROLES` client-side, which is necessary but not itself an authorization boundary) | `20260925002000...sql` line ~18 |
| Organization-scoped role-based UI gating (`can_manage_organization`, `can_edit_organization_work` semantics assumed by `OrganizationRole`) | `public.can_manage_organization(uuid)` → `role in ('owner','admin')`; `public.can_edit_organization_work(uuid)` → `role in ('owner','admin','estimator')`; `viewer` is read-only everywhere, matching this UI's `ROLE_META`/`INVITABLE_ROLES` assumptions | **AVAILABLE** (already consistent with this UI's role model) | `20260925002000...sql` lines ~46-56 |

Net read-only conclusion (unchanged from `0452823` through `dcf56ce`): the
read side of this UI (`listOrganizations`, reading the active organization,
and reading raw membership rows) maps cleanly to existing RLS today. The
write side this UI's mock demonstrates (`inviteMember`, `getCapabilities`)
has **no** backend surface and is explicitly, deliberately blocked
server-side — which is exactly what this branch's fail-closed default
(`invitationsEnabled: false`) already assumes and enforces, independent of
this new evidence. `dcf56ce` only tightens internal integrity guarantees
(account deletion ordering, deferred owner enforcement, public tracked-view
audit suppression, hosted harness digest/cleanup correctness) — see the
five points above — none of which change any status in this table.

## The contract the UI is coded against

```ts
export type OrganizationRole = "owner" | "admin" | "estimator" | "viewer";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export type MemberStatus = "active" | "invited";

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string | null;
  name: string;
  email?: string | null; // render only when contactDetailsEnabled is true
  role: OrganizationRole;
  status: MemberStatus;
  avatarUrl?: string | null;
  invitedAt?: string;
  joinedAt?: string;
}

export interface InviteMemberInput {
  organizationId: string;
  email: string;
  role: OrganizationRole; // never "owner" — see open question 1
}

export interface InviteMemberResult {
  member: OrganizationMember;
}

// New in this revision — see "UI capability requirement" below.
export interface TeamCapabilities {
  invitationsEnabled: boolean;
  contactDetailsEnabled: boolean;
}

export interface TeamAdapter {
  listOrganizations(): Promise<Organization[]>;
  getActiveOrganizationId(): Promise<string | null>;
  setActiveOrganizationId(organizationId: string): Promise<void>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  getCapabilities(): Promise<TeamCapabilities>;
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
```

Role identifiers and permission names have one frontend source of truth in
`features/organizations/domain.ts`; adapter and UI shapes are in
`features/organizations/types/organization.ts`. Both are aligned to the
reviewed role/RLS matrix at backend candidate `d12743a`.

## UI capability requirement: invitations must fail closed

The invite dialog and the "Invite teammate" / "Invite a teammate" buttons
are gated by `getCapabilities().invitationsEnabled`. This is a hard
requirement for whatever adapter Codex provides, not just the mock:

- **Default is `false`.** Loading, error, or any non-`true` result is
  treated as disabled. The UI never optimistically assumes invitations are
  available.
- **When `false`:** clicking the invite trigger opens a dialog that states
  invitations aren't enabled yet. No email/role form is rendered. No
  `inviteMember` call is ever made from this state. No roster mutation, no
  "invite sent" message, no implication of success.
- **When `true`:** the existing invite form/flow renders as already built.
- **Defense in depth:** `MockTeamAdapter.inviteMember` itself also refuses
  to invite while `invitationsEnabled` is `false`, even if called directly
  — the real adapter should carry the same server-side refusal regardless
  of what the client believes, since the client capability check is a UX
  convenience, not the authorization boundary.
- Contact details are independently fail-closed. Member email renders only
  when `contactDetailsEnabled === true` and the authorized roster projection
  supplied a non-empty value.
- A future real adapter must return both capability flags. Until server-owned
  capability and roster surfaces pass review, both flags remain `false`.

## Current behavior at `72e09a2`

- **`listOrganizations()`** returns only organizations the current user
  belongs to. The UI treats an empty result as "no organizations" (disabled
  switcher). A rejected promise renders a visible, keyboard-operable Retry
  action that reloads both the organization list and persisted selection.
- **`listMembers(organizationId)`** returns the full roster for one
  organization, including invited-but-not-yet-joined rows. Empty array →
  "No teammates yet" empty state with an inline invite CTA (itself gated by
  the capability check above). Rejected promise → retryable error alert
  scoped to the member list only (the switcher stays interactive).
- **Active organization:** the UI reads the adapter's persisted organization
  id on load. A switch calls `setActiveOrganizationId`; local selection changes
  only after the adapter write resolves. Rejection preserves the prior
  selection and renders a visible Retry action for that exact failed target.
- **`inviteMember(input)`** is mock-preview behavior only and is expected to:
  - Reject with a message safe to show verbatim to the user for duplicate
    emails, e.g. "This email has already been invited to this organization."
  - Resolve with the newly created member row (`status: "invited"`,
    `userId: null`) so the UI can optimistically append it without a full
    refetch.
  - Never be called while `invitationsEnabled` is not `true` (see above).
- **Production boundary:** production constructs no mock adapter and ignores
  scenario query strings. With no accepted authenticated server adapter yet,
  `TeamSettingsShell` defaults to `UnavailableTeamAdapter` and fails closed.

## Remaining decisions and prerequisites

- `BLOCKED`: cannot be resolved without a design/product decision that has
  not been made yet (per Codex's own evidence, not this branch's guess).
- `DEFERRED`: known, answerable, but not required for this UI shell to
  exist or to eventually merge; can be picked up in a later wave.
- `REQUIRED BEFORE INTEGRATION`: must be implemented and independently
  reviewed before `UnavailableTeamAdapter` can be replaced in production.

1. **`REQUIRED BEFORE INTEGRATION` — Is ownership transfer a separate
   endpoint, or does `inviteMember` support `role: "owner"`?** The invite
   dialog currently excludes `owner` entirely (`INVITABLE_ROLES`), matching
   Codex's own role matrix ("Grant/revoke owner: No" for every role). This
   branch does not assume ownership transfer belongs in the invite flow at
   all — it is simply not offered. If Codex's design differs, this needs an
   explicit UI change, not just an added enum value.
2. **`REQUIRED BEFORE INTEGRATION` — authenticated organization adapter.**
   `listOrganizations()` must be caller-bound through the reviewed RLS path,
   accept no caller-supplied user id and return only current memberships.
3. **`REQUIRED BEFORE INTEGRATION` — persisted active organization.** The
   UI seam and retry behavior are complete. The real adapter must read and
   write `profiles.active_organization_id` for the authenticated caller and
   surface the trigger's `42501` rejection safely. It must not substitute
   browser-local persistence or optimistically change selection.
4. **`REQUIRED BEFORE INTEGRATION` — privacy-minimized roster and
   capabilities.** The reviewed server projection must omit or null contact
   details unless the caller's server-owned capability permits them.
   `getCapabilities()` must return both `invitationsEnabled` and
   `contactDetailsEnabled`, defaulting both to `false` on ambiguity.
5. **`BLOCKED` — Rate limiting / re-invite semantics:** if someone invites
   the same already-invited email again, is that idempotent (return the
   existing pending invite) or an error? The mock treats it as an error.
   This cannot be resolved yet: Codex's evidence states the real
   invitation/consent flow itself is not implemented, so its retry
   semantics aren't designed either.
6. **`BLOCKED` — Invite delivery and acceptance flow** (email content,
   token/link format, expiry, and the consent boundary Codex's own review
   flagged as missing — owners/admins must not be able to add arbitrary
   existing user IDs without consent). Entirely out of this shell's scope.
   This branch does not assume the accepted design will match the mock's
   "immediately append a `status: 'invited'` row" behavior — that behavior
   is explicitly mock-only per the capability gate above.
7. **`DEFERRED` — Last-owner protection and role-change/removal actions**
   are not built in this shell (out of the stated R2 UI scope: it only
   covers the member list, invite dialog, and switcher). Codex's backend
   already has final-owner protection server-side; exposing role-change/
   removal in this UI is additional scope for a later wave, not this one.

## Explicit non-assumptions (per hardening assignment)

This branch does not assume ownership-transfer semantics, seat-billing
ownership/shape or an invitation acceptance flow. Active-organization
persistence is no longer an open UI question: the adapter seam, confirmed
write-before-display behavior and retry states are implemented, while the
real authenticated adapter remains a required integration prerequisite.

## What this branch deliberately does NOT do

- No Supabase client, no fetch/axios calls, no environment variables.
- No live server-domain import. Frontend role identifiers and permissions are
  canonicalized in `features/organizations/domain.ts`, with adapter shapes in
  `features/organizations/types/organization.ts`.
- No migrations, RLS, or backend routes.
- No real persistence transport yet; the UI calls the adapter read/write seam
  and never replaces confirmed server persistence with local storage.
- No role-change or member-removal UI (not in the assigned R2 UI scope).
- No live/functional invitation path in any production-facing default —
  the mock's "successful invite" demonstration only runs when a caller
  explicitly opts in via `capabilities: { invitationsEnabled: true }`
  (test files and this document's own examples), never by default.

## Suggested integration path

1. Add an independently reviewed, authenticated roster projection and decide
   whether capabilities use the fail-closed constant adapter result or a
   reviewed server-owned RPC. Both capability fields default to `false`.
2. Add a server-backed adapter implementing the current interface (e.g.
   `features/organizations/lib/server-team-adapter.ts`) that calls the real
   API/RPC layer. Its `getCapabilities()` should default to
   `{ invitationsEnabled: false, contactDetailsEnabled: false }` until each
   capability has a separately reviewed server contract.
3. Bind reads and writes to the authenticated caller, including guarded
   `profiles.active_organization_id` persistence and the privacy-minimized
   roster surface.
4. Replace the production `UnavailableTeamAdapter` with the accepted adapter.
   Keep `TeamSettingsDevelopmentPreview` and scenario controls restricted to
   literal development builds.

## Integration checklist — smallest files that change after Claude PASS

This lists the smallest expected integration surface after independent PASS
on backend candidate `d12743a` and on the new roster/capability surface.

1. **New file** `features/organizations/lib/server-team-adapter.ts` — the
   adapter implementation. It must implement organization reads, persisted
   active-organization read/write, privacy-minimized roster reads and both
   capability flags. `inviteMember()` continues to reject.
2. `features/organizations/types/organization.ts` changes only if the accepted
   roster projection differs; email remains optional and fail-closed.
3. **New file** — a reviewed, auth-bound roster-read RPC/endpoint (owned by
   Codex, not this branch) is a **prerequisite**, not a Cursor-side file,
   since no `profiles` policy today lets one member read another's name/
   email. This UI cannot self-serve that gap.
4. `app/dashboard/settings/team/page.tsx` — inject the accepted server adapter
   in production. Development fixture controls are already literal-
   development-only and remain that way.
5. No hook redesign is expected: `useOrganizations` already reads persisted
   selection, writes before changing displayed state, surfaces safe errors and
   retries the failed target.

No migration, RLS policy, Stripe/billing file, or shared contract file is
expected to change on the Cursor side of this list — those remain Codex's
integration-owner responsibility per the coordination plan.

## Post-PASS server-adapter implementation plan and test matrix

Scope of this section: `listOrganizations`, active-organization read/write,
redacted team roster reads, and capability reads only. **Explicitly out of
scope, by instruction, and not planned or tested below:** invitation
creation, seat billing, ownership transfer, and any live mutation beyond the
single-column active-organization write. This plan assumes Claude has
returned PASS on the exact backend candidate and Codex has frozen the
read-only contract mapped above.

### Implementation plan

1. **New file** `features/organizations/lib/server-team-adapter.ts`,
   implementing the existing `TeamAdapter` interface so no component/hook
   changes are needed (per the integration checklist above).
2. **`listOrganizations()`** — a direct table read:
   `supabase.from("organizations").select("id, name, slug")`. Relies
   entirely on the `organizations_member_read` RLS policy; the adapter adds
   no filter of its own (adding a redundant client-side filter would risk
   masking an RLS regression instead of surfacing it). Maps 1:1 to the
   existing `Organization` type — no shape translation needed.
3. **Active organization (read)** — `supabase.from("profiles").select(
   "active_organization_id").eq("id", session.user.id).single()`, using the
   caller's own session id, never a value passed in from the client's own
   prior state. Firmly self-scoped by the existing "own profile" policy.
4. **Active organization (write / "switch org")** —
   `supabase.from("profiles").update({ active_organization_id: id }).eq(
   "id", session.user.id)`. The adapter must not pre-validate membership
   client-side and treat that as sufficient; the `guard_active_organization`
   trigger is the actual authorization boundary. The adapter must
   distinguish the trigger's `42501` ("active organization must be a
   current membership") from a generic network/unknown error and surface a
   specific, safe-to-show message — not swallow it as a generic failure.
5. **Privacy-minimized team roster reads** — **must not** be a client-side join of
   `organization_memberships` and `profiles` (no policy authorizes that
   join today, per the mapping above). Must call the Codex-owned RPC
   defined in the next section, e.g.
   `supabase.rpc("list_organization_members_redacted", { p_organization_id:
   id })`. The adapter maps the RPC's flat row shape to `OrganizationMember`
   and must **not** invent `status`, `invitedAt`, or `joinedAt` values that
   the backend doesn't return — those fields should be dropped from the
   real adapter's returned shape (see integration checklist item 2) rather
   than backfilled with placeholders.
6. **Capability reads** — until Codex ships the optional RPC in the next
   section, `getCapabilities()` returns a hardcoded
   `{ invitationsEnabled: false, contactDetailsEnabled: false }` with **no**
   network call at all (Option A
   below). If/when Codex ships the RPC (Option B), swap the hardcoded
   return for `supabase.rpc("get_team_capabilities", ...)`, still defaulting
   to `false` on any error, timeout, or unexpected shape — never `true` on
   an ambiguous result.
7. **`inviteMember()`** — out of scope for a real implementation. The real
   adapter's `inviteMember` must throw a clear, typed "not implemented"
   error rather than silently resolving or no-op-succeeding, so any caller
   that bypasses the UI capability gate (a test, a future refactor) fails
   loudly instead of pretending to invite someone. This is defense in
   depth beneath the existing UI-level gate, matching the mock adapter's
   own current behavior.

### Test matrix

Each row is a required test for the real adapter (in addition to, not
replacing, the existing mock-adapter/component tests, which stay as
mock-only regression coverage).

| Operation | Required test cases |
| --- | --- |
| `listOrganizations()` | (1) returns the caller's organizations only; (2) returns `[]` for a caller with zero memberships (not an error); (3) network/RLS-unexpected error rejects distinguishably from "empty"; (4) never returns an organization the caller isn't a member of, even if the caller supplies no filter (regression guard against a future RLS relaxation) |
| Active organization (read) | (1) returns the caller's own `active_organization_id`; (2) returns `null` gracefully if unset (should not happen post-backfill, but must not crash); (3) never reads another user's row (no `user_id`/`profile_id` parameter accepted from the caller) |
| Active organization (write) | (1) succeeds when switching to a real current membership; (2) the trigger's `42501` rejection (switching to an organization the caller is **not** a member of) surfaces as a specific, safe, non-generic error and does **not** update local UI state optimistically before the write confirms; (3) network error leaves the previously displayed active organization unchanged (no optimistic corruption); (4) a membership revoked concurrently by another session, then a switch attempt to that same now-stale organization, is rejected the same way as case 2 |
| Redacted roster reads | (1) returns every current member of an organization the caller belongs to, in any caller role including `viewer`; (2) returns `[]` (not an error) for a valid organization id the caller is **not** a member of — must not leak "this organization exists" vs. "this organization doesn't exist"; (3) never returns rows from a different organization than the one requested, tested with two real organizations and cross-checking the response of each against the other's roster; (4) a membership revoked mid-session is reflected on the next read (no stale client-side cache masking a removal); (5) malformed/non-UUID organization id is rejected client-side before any network call, and server-side rejection (if it slips through) is handled without a crash; (6) large roster (≥ 200 rows, matching a plausible upper bound) completes without truncation or timeout in the adapter's contract, or the adapter's contract explicitly documents a pagination limit if Codex's RPC imposes one |
| Capability reads | (1) resolves `{ invitationsEnabled: false, contactDetailsEnabled: false }` today, unconditionally, matching the "NOT IMPLEMENTED" status above; (2) any RPC error, timeout, or unexpected response shape (once Option B ships) resolves both flags to `false`, never `true` and never a rejected promise that the caller might misinterpret as "unknown, assume enabled" |
| `inviteMember()` (out-of-scope guard) | (1) calling the real adapter's `inviteMember` directly (bypassing the UI gate) throws/rejects with a clear "not implemented" error, not a silent success or no-op resolve |

Explicitly **not** in this matrix, per instruction: creating an invitation,
any seat-billing check or entitlement calculation, any ownership-transfer
flow, and any membership `insert`/`update`/`delete` beyond the single
`profiles.active_organization_id` column write above.

## Minimum Codex-owned SQL/RPC contract — redacted roster + capabilities

**Documentation only.** No migration, RPC, function, or backend code was
created, modified, or proposed as executable SQL by this branch. This is a
specification for Codex to accept, amend, or reject — the smallest server
surface this UI's read side needs beyond what already exists.

### RPC 1 — redacted roster read

**Name (proposed):** `public.list_organization_members_redacted(
p_organization_id uuid)`

**Input:** a single `uuid` parameter, the organization to list. No caller
identity parameter — identity must bind via `auth.uid()` internally, per
the existing R2 `SECURITY DEFINER` helper convention ("never accept a
caller-supplied user id").

**Output (proposed row shape):**

```sql
returns table (
  organization_id uuid,
  user_id uuid,
  role text,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz,
  updated_at timestamptz
)
```

`email` and `avatar_url` are **role-minimized**, not always populated.
At `d12743a`, viewers and estimators have no approved contact-detail
projection. Until one exists, those columns must be `null` for
`viewer`/`estimator` callers (and for any caller when
`contactDetailsEnabled` is false). Owner/admin contact-detail access is
also **NOT IMPLEMENTED** today — do not infer it from `organization:manage`.

No `id`, `status`, `invited_at`, or `joined_at` — those don't exist in
`organization_memberships` today and should not be invented server-side
just to satisfy this UI's current (mock-derived) type. `(organization_id,
user_id)` is the natural client-side key, matching the table's actual
primary key.

**Authorization expectations:**

- `security definer`, `set search_path = pg_catalog, public`, granted to
  `authenticated` only (never `anon`).
- Must internally verify `public.is_organization_member(p_organization_id)`
  for `auth.uid()`.
- Identity binds only to `auth.uid()`. Never accept a caller-supplied
  user id.
- **PII minimization by role is mandatory.** A viewer or estimator must
  not receive another member's email, even if they can read the membership
  row. Name may be a display label only if a later reviewed projection
  allows it; email requires an explicit `contactDetailsEnabled` grant.
- **Privileged-function allowlist review is required** before this RPC
  can ship. It must be added to the R2 SECURITY DEFINER allowlist and
  independently reviewed; an unreviewed definer function is not an
  accepted contract.
- **Recommendation:** on failed membership, return an **empty result set**,
  not a raised exception — consistent with how every existing R2 RLS policy
  already behaves (`is_organization_member` used in a `using` clause simply
  filters rows, it never errors). Raising an exception here instead would
  let a caller distinguish "this organization id doesn't exist" from "you
  aren't a member of it" by timing/error-shape, a minor enumeration risk
  that's trivial to avoid by matching the existing pattern.
- Must select from `public.organization_memberships` joined to
  `public.profiles`, scoped to `m.organization_id = p_organization_id`, with
  no path for the caller to widen that scope.

**Abuse tests (for whoever implements/reviews this):**

1. Non-member calls with a real organization id they don't belong to →
   empty rows, not an error, not another organization's data.
2. Non-member calls with a random/non-existent organization id → empty
   rows, indistinguishable from case 1 (no existence oracle).
3. Member of organization A calls with organization B's id (A ≠ B, caller
   not a member of B) → empty rows.
4. Membership revoked mid-session, then the same caller calls again for the
   same organization → empty rows on the very next call (no server-side
   caching that outlives the RLS-equivalent check).
5. Caller passes a syntactically invalid UUID → rejected by parameter typing
   before any row scan (Postgres function-argument type coercion handles
   this; verify it isn't bypassed by a `text`-typed wrapper somewhere in
   the call path).
6. A profile row with a `null` `name`/`email`/`avatar_url` (if that's
   possible in this schema) does not crash the function or omit the row —
   it returns the row with `null` in that column, and the client is
   responsible for a display fallback (this UI already truncates/handles
   long values; it should also handle empty ones).
7. A very large roster (hundreds of rows) does not error or silently
   truncate; if Codex wants a hard cap, it must be an explicit, documented
   `limit`/`offset` pair on the function signature, not a silent server-side
   truncation the client can't detect.
8. **Tenant isolation:** a member of tenant A never receives tenant B's
   roster, names, or emails.
9. **Role PII minimization:** a `viewer` or `estimator` caller of tenant A
   receives `email`/`avatar_url` as null for every row, including owners
   and admins. An `owner`/`admin` caller still receives emails only when
   the server-owned `contactDetailsEnabled` capability is true.
10. A caller cannot escalate by passing another user's id or by calling
    the function with `service_role` from the browser. Direct
    `service_role` use remains a privileged-function allowlist item, not a
    client path.

### RPC/column — capability read

Two options, in order of recommendation:

**Option A (recommended today):** no backend change at all. The client
adapter hardcodes `{ invitationsEnabled: false, contactDetailsEnabled: false }`.
This matches Codex's own preflight recommendation and requires zero new
SQL, zero new grants, and zero new abuse surface. Revisit only once a real
seat-billing/consent decision and a reviewed contact-detail projection
exist to flip against.

**Option B (only if Codex wants a server-owned kill switch without a client
release):** `public.get_team_capabilities(p_organization_id uuid) returns
table (invitations_enabled boolean, contact_details_enabled boolean)`.

- **Input:** organization id (kept for future per-organization entitlement
  even though today's implementation ignores it and always returns
  `false`).
- **Output:** a single row, both flags boolean, both default `false`.
- **Authorization:** `security definer`, granted to `authenticated` only;
  since the value is currently a constant with no per-tenant secret, a
  membership check is not strictly required for confidentiality, but should
  still be present for consistency with every other org-scoped function in
  this file and to avoid the function becoming a generic "does this
  organization id exist" ping endpoint for non-members. Same
  empty-result/false-default convention as RPC 1: a non-member gets `false`
  (a safe default), not an error.
- **Abuse tests:** (1) always returns both flags `false` while
  unimplemented, for members and non-members alike; (2) a non-existent
  organization id also returns `false`/`false`, not an error, not `true`;
  (3) a `viewer` or `estimator` never receives `contact_details_enabled:
  true`; (4) once real seat billing ships and this function's body changes
  to something conditional, the same non-member-gets-`false` default must
  still hold — a non-member must never learn a real organization's
  entitlement state through this function.
  Privileged-function allowlist review is required before Option B ships.
