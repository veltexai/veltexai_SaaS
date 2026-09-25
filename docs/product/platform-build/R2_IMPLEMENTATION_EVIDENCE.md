# R2 organization/tenancy implementation evidence

Status: **LOCAL IMPLEMENTATION CANDIDATE — HOSTED VERIFICATION PENDING**

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

## Known boundary

Subscriptions, usage, billing history and user template preferences remain user-scoped in R2. They represent personal/legacy entitlement state and require an explicit seat-billing decision before organization migration. They must not be silently reclassified as company-owned financial records.
