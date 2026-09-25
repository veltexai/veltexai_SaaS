# R2 organization/tenancy implementation evidence

Status: **LOCAL REMEDIATION CANDIDATE — HOSTED VERIFICATION AND CLAUDE RE-REVIEW PENDING**

Date: 2026-09-25 Pacific

## Implemented

- Organizations and owner/admin/estimator/viewer memberships.
- One private organization and owner membership for every existing profile.
- Active-organization membership guard and automatic organization creation for new profiles.
- Mandatory organization ownership for proposals, business-service profiles, company profiles and branding settings while retaining legacy `user_id` creator attribution.
- Backward-compatible organization assignment for existing application clients.
- Caller-bound RLS helpers that derive identity only from `auth.uid()`.
- Tenant policies for operational records and proposal tracking dependencies.
- Protection against cross-tenant reassignment, creator reassignment, unauthorized ownership changes and removal of the final owner.
- Append-only organization audit records and transactional event outbox records.
- Service-only outbox/inbox with `(consumer, event_id)` inbox idempotency.
- Frozen TypeScript role/permission contract and generated-database type updates.
- Role/RLS matrix plus non-destructive rollback procedure.

## Local verification

- Focused organization tests: 2 suites / 9 tests passed.
- Full repository tests: 67 suites / 554 tests / 5 snapshots passed after the company/branding extension.
- TypeScript: passed.
- Next.js production build: passed; 79 static pages generated.
- `git diff --check`: passed before the final documentation append and must be repeated at integration handoff.

## Still required

- Execute the candidate migration on an isolated Supabase preview.
- Run the real two-tenant, four-role RLS matrix and verify cross-tenant denials.
- Verify backfill counts and fail-closed orphan queries.
- Exercise new-user signup and default-organization creation in hosted Auth.
- Verify legacy proposal create/edit/send/download/tracked-link behavior after migration.
- Independently review the exact candidate commit/range through Claude.
- Freeze server API contracts before integrating Cursor's UI shell.
- Founder acceptance and separate production deployment authorization.

## Claude exact-candidate remediation

Migration `20260925003000_r2_claude_security_remediation.sql` addresses the accepted review of `74899c3` without advancing later objectives:

- Client and service membership mutation is fail-closed; only trigger-internal owner bootstrap is permitted until invitation consent and seat billing are implemented.
- Owner decisions serialize on the organization row, and empty private bootstrap tenants can be removed during profile deletion while tenant-owned work remains protected by restrictive foreign keys.
- Creator-only PDF-export and proposal-add-on policies are replaced with parent-proposal tenant checks.
- Public tracked-link entitlement follows the organization billing owner, not a collaborating proposal creator.
- Anonymous view-counter updates no longer produce organization audit/outbox noise; membership audit payloads contain old and new roles.
- Viewers cannot read raw work rows containing costs, wages and margins.
- Direct destructive tracking operations, TRUNCATE, and client infrastructure writes are explicitly revoked; outbox delivery has deterministic tie ordering.
- The mandatory SECURITY DEFINER allowlist includes the four reviewed, caller-bound R2 membership helpers.

These are local source and static-contract claims only until the exact migration chain and hostile matrix run in an isolated database and Claude reviews the remediation range.

## Second Claude remediation candidate

Migration `20260925004000_r2_second_security_remediation.sql` and the send-route correction address the follow-up FAIL on `1e3c541`:

- the authenticated send path now relies on tenant RLS rather than creator-only filtering, and tracking INSERT is restored only for an editable parent proposal;
- tracking UPDATE/DELETE/TRUNCATE stays unavailable to browser roles;
- empty private-account deletion suppresses nested cleanup audit recreation, while the cleanup exception requires trigger nesting and cannot be opened by a caller-set configuration value alone;
- the committed Release 1 fixtures supply explicit organization ownership, and the hosted harness no longer creates arbitrary memberships through `service_role`;
- public tracked-link branding resolves the proposal organization profile/name;
- raw business-service wage/cost/overhead rows remain unavailable to viewers;
- direct organization INSERT/DELETE/TRUNCATE is revoked; and
- outbox records receive a monotonic event sequence for deterministic delivery order.

Focused source gates and harness static validation pass. Disposable PostgreSQL execution, the privileged-function gate over the exact chain, and hosted application/Auth evidence remain pending and must not be inferred from static tests.

## Third Claude remediation candidate

Migration `20260925005000_r2_third_security_remediation.sql` addresses the
follow-up findings on `0452823` without enabling team invitations:

- empty auth accounts delete their profile and private bootstrap organization
  atomically using deferred `NO ACTION` circular references, while existing
  tenant-owned `RESTRICT` references continue to protect accounts with work;
- cleanup removes audit/outbox/inbox rows before the organization and keeps the
  membership cleanup exception nested-trigger-only;
- a deferred constraint trigger prevents any organization from committing
  without its creator as an owner, including direct service-role inserts;
- pure proposal view-counter updates no longer generate organization
  audit/outbox noise for anonymous or signed-in public recipients;
- Release 1 assertion D3 now requires permission denial for the intentionally
  revoked `proposal_tracking` UPDATE privilege; and
- hosted concurrency cleanup is mandatory and fails the run if fixtures cannot
  be removed.

Local evidence: 67 suites / 570 tests / 5 snapshots, TypeScript, a 79-page
production build, shell syntax, hosted-harness static validation and diff checks
pass. This worktree has no PostgreSQL executable, so executable migration,
deletion and concurrency evidence remains pending independent/isolated database
execution. No hosted system was changed.

## Fourth Claude remediation candidate

Migration `20260925006000_r2_cleanup_guard_ordering.sql` removes the one stale
organization-row lookup from the authorized membership-cascade exception. At
that trigger point PostgreSQL has already removed the organization row from the
deleting statement's view. The exception still requires all three independent
guards: nested trigger depth, an exact private-cleanup organization token, and
exactly one remaining membership. Every non-bootstrap insert/update/delete still
raises the fail-closed invitation/seat-billing exception; no service-role bypass
was introduced.

The committed hosted matrix now proves complete residue removal for both
auth-user deletion and trusted direct empty-profile cleanup; atomic rollback for
a work-bearing owner; and absence of a general service-role membership path.
The concurrency cleanup script also asserts that its auth user, profile,
organization and membership are all gone and treats cleanup failure as a failed
run. Local evidence: 67 suites / 572 tests / 5 snapshots, TypeScript, 79-page
production build, shell syntax, hosted-harness static validation and diff checks
pass. Exact database execution remains an independent/isolated gate.

## Known boundary

Subscriptions, usage, billing history and user template preferences remain user-scoped in R2. They represent personal/legacy entitlement state and require an explicit seat-billing decision before organization migration. They must not be silently reclassified as company-owned financial records.
