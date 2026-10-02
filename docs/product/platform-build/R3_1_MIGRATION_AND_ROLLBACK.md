# R3-1 CRM migration and rollback

Status: local candidate procedure. Do not run against a hosted target until the
exact migration, application commit and evidence bundle pass independent review
and receive the target-specific approval required by the operating ledger.

## Forward procedure

1. Bind the target project identity and exact accepted R2 migration-history set.
2. Capture hashes-only counts and orphan checks for organizations, memberships,
   proposals and the existing proposal content/pricing fields. R3-1 must not
   rewrite those records.
3. Apply `20261001000000_r3_1_crm_foundation.sql` to an isolated preview through
   the normal migration mechanism. Never insert its history row manually.
4. Verify all CRM tables exist, have RLS enabled, deny `anon`, and use explicit
   `organization_id` foreign keys. Verify stage-history and command-receipt
   tables have no authenticated direct mutation grants.
5. Verify both starter pipelines, all eleven canonical categories and the
   editable default loss reasons were created exactly once for every existing
   organization. Create a new synthetic organization and prove bootstrap gives
   it the same configuration.
6. Run the two-organization/four-role matrix. Owner/admin may manage the tenant;
   estimators see and mutate only assigned/created work; viewers receive only
   the redacted board projection; every cross-tenant read/write/count/RPC probe
   must fail closed.
7. Run command-behavior proofs for quick-add, duplicate choice, atomic lead
   conversion, stage moves, manual won/lost/disqualified gates, task commands,
   walkthrough overlap, assignment, reactivation and pipeline configuration.
   Repeat every externally callable command with the same idempotency key and
   prove no duplicate business row, stage-history row, audit event or outbox
   event is created.
8. Verify proposing/negotiating require an existing linked sent proposal, manual
   won requires owner/admin plus reason, and handed-off remains blocked pending
   R3-6. Existing proposal bytes, pricing, tracking and public links must remain
   byte-for-byte unchanged.
9. Run migration atomicity/refusal mutations, full Jest, TypeScript, production
   build, accessibility checks at 390 px and desktop, keyboard/list-view board
   parity, and representative query plans.
10. Deploy the reviewed application commit to an isolated preview, execute the
    operator acceptance checklist, capture logs, and perform a final read-only
    drift check before requesting any production authorization.

## Application-first rollback

R3-1 is additive. After CRM data exists, the safe rollback is application-first:

1. Disable CRM navigation and all CRM command endpoints while leaving the
   existing proposal product available.
2. Roll the application back to the recorded R2 production deployment.
3. Preserve CRM tables, stage history, command receipts, organization audit rows
   and outbox rows for diagnosis and a forward fix.
4. Do not remove the nullable CRM link columns from `proposals`; they do not
   alter proposal content and may be referenced by preserved CRM records.
5. Do not drop or rewrite CRM data in production. A destructive reversal is
   allowed only in a disposable preview with no customer data.

If a migration transaction fails, PostgreSQL must roll it back atomically and
the migration-history row must remain absent. If post-deploy access expands,
proposal behavior regresses, or tenant isolation fails, block traffic to CRM and
perform the application-first rollback. Database restore is reserved for proven
corruption and requires a separately reviewed recovery decision.

## Mandatory fail-closed checks

The hosted evidence bundle must prove zero rows for each condition:

```sql
-- No tenantless CRM rows.
select table_name
from information_schema.columns
where table_schema = 'public' and table_name like 'crm\_%' escape '\\'
group by table_name
having count(*) filter (where column_name = 'organization_id') = 0;

-- Every opportunity references a stage in its own pipeline and organization.
select o.id
from public.crm_opportunities o
left join public.crm_pipeline_stages s
  on s.organization_id = o.organization_id
 and s.pipeline_id = o.pipeline_id
 and s.id = o.stage_id
where s.id is null;

-- Conversion links stay in one tenant.
select l.id
from public.crm_leads l
left join public.crm_customers c
  on c.organization_id = l.organization_id and c.id = l.converted_customer_id
left join public.crm_opportunities o
  on o.organization_id = l.organization_id and o.id = l.converted_opportunity_id
where l.status = 'converted' and (c.id is null or o.id is null);

-- Stage-history tenant and transition targets remain valid.
select h.id
from public.crm_opportunity_stage_history h
left join public.crm_opportunities o
  on o.organization_id = h.organization_id and o.id = h.opportunity_id
left join public.crm_pipeline_stages s
  on s.organization_id = h.organization_id and s.id = h.to_stage_id
where o.id is null or s.id is null;

-- R3-1 must never materialize handed-off opportunities.
select o.id
from public.crm_opportunities o
join public.crm_pipeline_stages s
  on s.organization_id = o.organization_id and s.id = o.stage_id
where s.category = 'handed_off';
```

## Preservation evidence

Before and after hashes must cover proposal generated content, pricing data,
service-specific data, status, tracking identifiers and public-delivery state.
Record counts and hashes for organizations/memberships/audit/outbox must also be
captured so CRM bootstrap cannot be mistaken for an R2 ownership mutation.

## Performance evidence required before release

Capture `EXPLAIN (ANALYZE, BUFFERS)` on representative preview volumes for:

- the board projection by organization and assignment;
- lead duplicate candidates by normalized email and phone;
- opportunity stage/history reads;
- open tasks ordered by due date;
- estimator walkthrough overlap windows;
- idempotency receipt lookup under concurrent retries.

Index definitions are candidates, not proof of hosted performance.
