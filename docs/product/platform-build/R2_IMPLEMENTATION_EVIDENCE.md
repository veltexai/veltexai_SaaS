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

## Known boundary

Subscriptions, usage, billing history and user template preferences remain user-scoped in R2. They represent personal/legacy entitlement state and require an explicit seat-billing decision before organization migration. They must not be silently reclassified as company-owned financial records.
