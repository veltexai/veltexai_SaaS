# Cursor → Codex contract request: R2 organization/team UI shell

Status: DRAFT REQUEST — not a contract until Codex confirms/adjusts it.

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

export interface TeamAdapter {
  listOrganizations(): Promise<Organization[]>;
  listMembers(organizationId: string): Promise<OrganizationMember[]>;
  inviteMember(input: InviteMemberInput): Promise<InviteMemberResult>;
}
```

Full source: `features/organizations/types/organization.ts`.

## Behavior the UI already assumes and tests against

- **`listOrganizations()`** returns only organizations the current user
  belongs to. The UI treats an empty result as "no organizations" (disabled
  switcher) and a rejected promise as "organizations unavailable" (disabled
  switcher, retryless — see open question 4).
- **`listMembers(organizationId)`** returns the full roster for one
  organization, including invited-but-not-yet-joined rows. Empty array →
  "No teammates yet" empty state with an inline invite CTA. Rejected promise
  → retryable error alert scoped to the member list only (the switcher stays
  interactive).
- **`inviteMember(input)`** is expected to:
  - Reject with a message safe to show verbatim to the user for duplicate
    emails, e.g. "This email has already been invited to this organization."
  - Resolve with the newly created member row (`status: "invited"`,
    `userId: null`) so the UI can optimistically append it without a full
    refetch.
- The UI never assumes the shape of an "active organization" persistence
  mechanism — switching organizations is currently local `useState` only
  (see open question 3).

## Open questions that block wiring the real adapter

1. **Is ownership transfer a separate endpoint, or does `inviteMember`
   support `role: "owner"`?** The invite dialog currently excludes `owner`
   entirely (`features/organizations/constants/roles.ts`,
   `INVITABLE_ROLES`). If ownership is meant to be invite-able directly,
   the dialog needs a different flow/confirmation, not just an added enum
   value.
2. **What identifies "my organizations" for `listOrganizations`?** Session
   user id via RLS, an explicit membership join, or something else? This
   affects whether the client needs to pass any parameter at all.
3. **Where does "active organization" live?** Local client state (per
   browser tab), a user preference column, a URL segment, or a cookie? The
   shell needs this to know whether switching organizations should trigger
   a navigation, a mutation, or neither.
4. **Should the organization switcher support retry after a load failure?**
   The current shell disables the switcher permanently on error within a
   mount; if organizations are expected to be flaky/paginated, we likely
   want an explicit retry affordance here too, not just on the member list.
5. **Rate limiting / re-invite semantics:** if someone invites the same
   already-invited email again, is that idempotent (return the existing
   pending invite) or an error? The mock treats it as an error; real
   behavior may differ once invites can be resent/expired.
6. **Invite delivery and acceptance flow** (email content, token/link
   format, expiry) are entirely out of this shell's scope — flagging so
   Codex can confirm there's no UI expectation beyond "an invite now exists
   in the roster with `status: 'invited'`."
7. **Last-owner protection and role-change/removal actions** are not yet
   built in this shell (out of the stated R2 UI scope: it only covers the
   member list, invite dialog, and switcher). If Codex needs the UI to also
   expose "change role" / "remove member" before merge, that's additional
   scope this branch does not currently cover.

## What this branch deliberately does NOT do

- No Supabase client, no fetch/axios calls, no environment variables.
- No shared domain-contract imports (`types/organization.ts` here is local
  to this feature and intentionally throwaway once a real contract lands).
- No migrations, RLS, or backend routes.
- No persistence of the active organization across reloads.
- No role-change or member-removal UI (not in the assigned R2 UI scope).

## Suggested integration path

1. Codex confirms/amends the `TeamAdapter` shape above (or provides the real
   one to replace it).
2. Add a server-backed adapter implementing the same interface (e.g.
   `features/organizations/lib/server-team-adapter.ts`) that calls the real
   API/RPC layer.
3. Swap `createMockTeamAdapter()` for the server adapter at the call site in
   `app/dashboard/settings/team/page.tsx` (currently the only integration
   point).
4. Everything under `features/organizations/components/` and
   `features/organizations/hooks/` should need no changes if the contract
   above is accepted as-is, since they depend only on the `TeamAdapter`
   interface, not on the mock implementation.
