# R2 organization migration and rollback

Status: candidate procedure; do not run on production before isolated-preview evidence and approval.

## Forward procedure

1. Snapshot row counts and foreign-key/orphan checks for profiles, proposals and business service profiles.
2. Apply migrations through `20260925002000_r2_organization_tenancy.sql` to an isolated Supabase branch.
3. Verify every profile has at least one membership and a valid active organization.
4. Verify every organization has at least one owner.
5. Verify every proposal and business service profile has an organization matching its historical `user_id` membership.
6. Run the role matrix with two organizations and owner/admin/estimator/viewer users. Cross-tenant reads and writes must return no rows or authorization errors.
7. Verify audit rows and exactly one unique outbox event are created in the same transaction for membership and proposal mutations.
8. Verify existing owner proposal create/edit/send/download/tracked-link behavior remains unchanged.
9. Verify empty-user deletion succeeds, while deletion of an organization owner with tenant-owned work fails closed.
10. Verify all membership mutation is denied outside new-profile bootstrap and that viewers cannot read raw proposal cost fields.
11. Run `CHECK_DEFINERS=1` against the exact migration chain and retain the output with the candidate evidence.

## Rollback strategy

The safe rollback is application-first, not destructive SQL:

1. Disable organization/team UI and writes.
2. Return the application to creator-only behavior using retained `user_id` attribution.
3. Preserve organization, membership, audit and event tables for diagnosis and forward recovery.
4. Do **not** drop `organization_id`, organization tables or audit/event records after team members have created data. That would destroy ownership and compliance evidence.

A destructive schema reversal is permitted only on an isolated disposable preview. It must first prove that every organization has exactly one owner/member and every organization-owned record maps unambiguously to its retained legacy `user_id`. Production reversal requires a separately reviewed data migration, backup and founder authorization.

## Fail-closed checks

```sql
select count(*) from public.profiles where active_organization_id is null;
select count(*) from public.proposals where organization_id is null;
select organization_id from public.organization_memberships
group by organization_id having count(*) filter (where role = 'owner') = 0;
select p.id from public.proposals p
left join public.organization_memberships m
  on m.organization_id = p.organization_id and m.user_id = p.user_id
where m.user_id is null;
```

Every query must return zero rows/count zero before application traffic is enabled.

## Performance evidence required before release

Capture `EXPLAIN (ANALYZE, BUFFERS)` for organization-scoped proposal reads, dependent export/add-on checks and pending-outbox ordering on representative preview volumes. The source indexes are candidates, not proof of acceptable hosted performance.
