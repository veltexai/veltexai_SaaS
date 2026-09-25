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
`docs/product/platform-build/R2_IMPLEMENTATION_EVIDENCE.md`, range
`764abc7..1e3c541`) states team/membership mutation is **disabled for every
runtime role** until a consent-bound invitation flow and a seat-billing
decision ship, and that "invitation email flows are not implemented." That
is independent confirmation — not an assumption on this branch's part — that
the UI's invitation experience must not present as functional yet. This is
exactly what the capability gate below enforces on the client.

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
  userId: string | null; // null while an invited email has no linked account yet
  name: string;
  email: string;
  role: OrganizationRole;
  status: MemberStatus;
  avatarUrl?: string | null;
  invitedAt?: string;   // ISO 8601
  joinedAt?: string;    // ISO 8601
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
}

export interface TeamAdapter {
  listOrganizations(): Promise<Organization[]>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  getCapabilities(): Promise<TeamCapabilities>;
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
```

Full source: `features/organizations/types/organization.ts`.

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
- The real adapter must resolve `getCapabilities()` from wherever the true
  entitlement lives (see open question 8 — this is explicitly unresolved,
  not assumed to be a simple boolean column).

## Behavior the UI already assumes and tests against

- **`listOrganizations()`** returns only organizations the current user
  belongs to. The UI treats an empty result as "no organizations" (disabled
  switcher) and a rejected promise as "organizations unavailable" (disabled
  switcher, retryless — see open question 4).
- **`listMembers(organizationId)`** returns the full roster for one
  organization, including invited-but-not-yet-joined rows. Empty array →
  "No teammates yet" empty state with an inline invite CTA (itself gated by
  the capability check above). Rejected promise → retryable error alert
  scoped to the member list only (the switcher stays interactive).
- **`inviteMember(input)`** is expected to:
  - Reject with a message safe to show verbatim to the user for duplicate
    emails, e.g. "This email has already been invited to this organization."
  - Resolve with the newly created member row (`status: "invited"`,
    `userId: null`) so the UI can optimistically append it without a full
    refetch.
  - Never be called while `invitationsEnabled` is not `true` (see above).
- The UI never assumes the shape of an "active organization" persistence
  mechanism — switching organizations is currently local `useState` only
  (see open question 3).

## Open questions — status legend

- `BLOCKED`: cannot be resolved without a design/product decision that has
  not been made yet (per Codex's own evidence, not this branch's guess).
- `DEFERRED`: known, answerable, but not required for this UI shell to
  exist or to eventually merge; can be picked up in a later wave.
- `REQUIRED BEFORE INTEGRATION`: answerable now, and must be answered
  before a real `TeamAdapter` implementation can replace the mock — but
  does not block this UI shell's own existence, tests, or hardening.

1. **`REQUIRED BEFORE INTEGRATION` — Is ownership transfer a separate
   endpoint, or does `inviteMember` support `role: "owner"`?** The invite
   dialog currently excludes `owner` entirely (`INVITABLE_ROLES`), matching
   Codex's own role matrix ("Grant/revoke owner: No" for every role). This
   branch does not assume ownership transfer belongs in the invite flow at
   all — it is simply not offered. If Codex's design differs, this needs an
   explicit UI change, not just an added enum value.
2. **`REQUIRED BEFORE INTEGRATION` — What identifies "my organizations" for
   `listOrganizations`?** Session user id via RLS, an explicit membership
   join, or something else? This affects whether the client needs to pass
   any parameter at all.
3. **`BLOCKED` — Where does "active organization" live?** Local client
   state (per browser tab), a user preference column, a URL segment, or a
   cookie? This branch does not assume any persistence mechanism; switching
   organizations is intentionally local-only `useState` until this is
   decided.
4. **`DEFERRED` — Should the organization switcher support retry after a
   load failure?** The current shell disables the switcher permanently on
   error within a mount. Not required for the shell to ship; can be added
   alongside the member list's existing retry pattern later.
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
8. **`BLOCKED` — How does the client learn `invitationsEnabled` (and any
   future team capabilities)?** A literal "always false" constant, a
   per-organization entitlement, a subscription/seat-billing tier check, or
   a global rollout flag? This branch does not assume seat-billing
   ownership or shape — Codex's own evidence states seat billing remains an
   explicit, undecided gate for organization-level entitlement. Until that
   decision exists, the real adapter's `getCapabilities()` may need to be
   as simple as a hardcoded `{ invitationsEnabled: false }` at first.

## Explicit non-assumptions (per hardening assignment)

This branch does not assume, and this document does not imply agreement
on: ownership-transfer semantics, seat-billing ownership/shape, invitation
acceptance flow/design, or active-organization persistence semantics. Each
is tracked above as `BLOCKED` or `REQUIRED BEFORE INTEGRATION` and awaits
an explicit Codex/founder decision, not a default inferred from this UI.

## What this branch deliberately does NOT do

- No Supabase client, no fetch/axios calls, no environment variables.
- No shared domain-contract imports (`types/organization.ts` here is local
  to this feature and intentionally throwaway once a real contract lands).
- No migrations, RLS, or backend routes.
- No persistence of the active organization across reloads.
- No role-change or member-removal UI (not in the assigned R2 UI scope).
- No live/functional invitation path in any production-facing default —
  the mock's "successful invite" demonstration only runs when a caller
  explicitly opts in via `capabilities: { invitationsEnabled: true }`
  (test files and this document's own examples), never by default.

## Suggested integration path

1. Codex confirms/amends the `TeamAdapter` shape above (or provides the real
   one to replace it), including how `getCapabilities()` should resolve.
2. Add a server-backed adapter implementing the same interface (e.g.
   `features/organizations/lib/server-team-adapter.ts`) that calls the real
   API/RPC layer. Its `getCapabilities()` should default to
   `{ invitationsEnabled: false }` until the real invitation/consent flow
   ships — do not flip this to `true` speculatively.
3. Swap `createMockTeamAdapter()` for the server adapter at the call site in
   `app/dashboard/settings/team/page.tsx` (currently the only integration
   point).
4. Everything under `features/organizations/components/` and
   `features/organizations/hooks/` should need no changes if the contract
   above is accepted as-is, since they depend only on the `TeamAdapter`
   interface, not on the mock implementation.
