# R2 Cursor integration preflight

Status: **PREPARED / NOT INTEGRATED**

Date: 2026-09-25 Pacific

## Candidates reviewed

- Backend: `/private/tmp/veltex-r0-privilege-hardening`, commit `0452823e10d1183c616baafe8fa6457ad7949957`.
- Cursor UI: `/private/tmp/veltex-r2-team-ui-shell`, commit `6de1aa4614e307823d31a41894e364ddd275cbe2`, descended from the assigned base `fe8b1d1`.
- Both worktrees were clean for tracked files at review time. The backend worktree retained two unrelated untracked evidence/temp directories; they were not read into, changed, staged or committed by this review.
- No merge, cherry-pick, backend/UI implementation, hosted action or external communication occurred.

## Verification performed

- Cursor focused suite: **7 suites / 62 tests passed**.
- The suite is not warning-clean. The keyboard-only invite test directly calls `roleTrigger.focus()` outside React `act(...)`, producing four React console errors (`FormLabel`, `FormControl`, `FormMessage`, and one unnamed update). This warning was reproduced independently and must be fixed before integration evidence can be called clean.
- Cursor's fail-closed invitation behavior is real within the isolated mock shell: capabilities default to `invitationsEnabled: false`; the disabled dialog renders no invite form; the shell does not call `inviteMember`; and the mock adapter independently rejects direct invite calls before changing its in-memory roster.
- This is UI/mock protection only. It is not a server authorization boundary and cannot enable invitations in R2.

## Contract mismatches and missing server surfaces

1. **The page is still a mock product surface.** `app/dashboard/settings/team/page.tsx` always constructs the local mock adapter and accepts `?scenario=empty|error`. If merged as-is, signed-in users would see fixture organizations and fixture people rather than their tenant. The route must not be exposed until a server-backed adapter replaces the mock and scenario controls are development/test-only or removed.
2. **Membership shapes do not match.** The backend membership key is `(organization_id, user_id)` and has `role`, `created_at`, and `updated_at`. It has no membership `id`, `status`, nullable `user_id`, `invited_at`, or `joined_at`. Cursor's `OrganizationMember` assumes all of those invitation-oriented fields.
3. **Roster identity needs a reviewed projection.** The membership table has no name, email or avatar. Current profile RLS does not establish that every organization member, especially estimator/viewer, may read every other member's profile. A server endpoint/RPC must auth-bind the caller, enforce organization membership, and return only approved roster fields. The browser must not join arbitrary profiles or accept a caller-supplied user identity.
4. **Active-organization semantics conflict.** Backend truth is `profiles.active_organization_id`, guarded to a current membership and used to assign tenant ownership when clients omit `organization_id`. Cursor selects the first returned organization and changes only local state. A local-only switch can display one organization while new records are assigned to another. Integration needs a read of the persisted active organization plus an auth-bound update surface; failure must leave the previous server value intact.
5. **No capability endpoint exists.** `getCapabilities()` is a good fail-closed UI seam, but `0452823` has no API/RPC for it. The first real adapter should return a hardcoded server-owned `invitationsEnabled: false` (or omit invitation methods entirely) until consent, token acceptance, expiry, rate limits and seat billing are designed and reviewed.
6. **No invitation endpoint exists by design.** Backend membership INSERT/UPDATE/DELETE is revoked for browser roles and the trigger rejects mutation outside private owner bootstrap/cleanup. Cursor's enabled invitation result (`status: invited`, nullable user, optimistic roster append) cannot map to the current schema and must remain test/story-only.
7. **The input type is wider than the UI rule.** `InviteMemberInput.role` accepts `owner` even though the dialog excludes it. Any eventual endpoint must use a server-owned invitable-role schema and reject owner; client filtering is not authorization.
8. **Organization lists can be direct RLS reads, but active selection cannot be inferred from list order.** `listOrganizations()` should return only caller memberships and include the persisted active identifier separately. `listMembers(organizationId)` must treat the ID as an untrusted selector and rely on caller-bound RLS/server authorization.
9. **Cursor documentation cites a stale backend range.** The contract request cites `764abc7..1e3c541`; the reviewed candidate is `0452823`, which adds the second security remediation. Before integration, update the document to the accepted exact commit/range and current Claude verdict.
10. **Accessibility evidence is useful but not full acceptance.** The audit records jsdom/iframe rendering with compiled CSS, not a real-device or authenticated-browser acceptance pass. The deferred shared Radix reduced-motion gap remains open. Both should be carried into the integrated acceptance checklist rather than represented as completed product acceptance.

## Security disposition

- **Positive:** invitations default disabled; UI loading/error states also fail closed; no Supabase/network/environment access exists in Cursor's branch; no mock invitation can occur without explicit test opt-in.
- **Not sufficient for integration:** the mock fixture route would misrepresent real tenant data if exposed, local active-organization state can diverge from the backend security context, and roster PII has no approved server projection.
- **Do not add a service-role browser client or generic membership mutation endpoint.** The real adapter must use an authenticated server boundary or caller-bound Supabase/RPC reads and preserve R2's revoked membership writes.

## Minimum safe integration order

1. Obtain Claude's verdict on exact backend commit `0452823` and execute the exact migration/authorization chain in disposable PostgreSQL or the isolated Supabase preview. Do not integrate against a FAIL candidate.
2. Freeze the read-only team contract: organization summary, persisted active organization, redacted roster projection, and server-owned capabilities fixed to invitations disabled.
3. Implement/auth-test the smallest server surfaces: list caller organizations; list an authorized organization's redacted roster; read/update caller's active organization. Keep membership mutation and invitations absent/disabled.
4. Fix Cursor's `act(...)` warning and align local UI types to the frozen read contract. Remove or development-gate fixture/scenario behavior from the production route.
5. Integrate the UI into a new bounded branch/commit, preserving the disabled invitation explanation but no enabled production path.
6. Run focused UI tests warning-clean, full tests, TypeScript, build, and authenticated browser checks for owner/admin/estimator/viewer/non-member across two organizations. Verify switching changes the persisted server context and cannot select a non-membership.
7. Run the prepared isolated hosted harness and regression checks for proposal create/send/PDF/tracked links. Only then request another independent review and founder acceptance.

## Exact next gate

**Claude PASS (or accepted remediation) plus executable isolated-database evidence for `0452823`; then freeze and implement the read-only server adapter contract with invitations hard-disabled.** Cursor commit `6de1aa4` remains preserved but **NOT INTEGRATED**.
