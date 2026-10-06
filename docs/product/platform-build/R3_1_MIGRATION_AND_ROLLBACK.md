# R3-1 CRM migration and rollback

Status: accepted procedure; rollback-only production proof independently
reviewed. No production execution, migration, deployment, environment change or
feature enable is authorized by this document.

## Frozen release identities

- Accepted application commit:
  `0d765d7a9ae33c43f95e2721c661b651e7dbf76f`.
- Migration `20261001000000` SHA-256:
  `526b56f0bd32c542f77b89e61df79eed18304e7cccd4b06d5c458fa3273ea795`.
- Migration `20261002000000` SHA-256:
  `85fac17469510408ab777a04101c585850fd5774874e0fb01c663c8fddd3cf18`.
- Fresh read-only Production capture SHA-256:
  `d22b04c72c863cde6b2eaa04a61f0f322df11493968f4478afdacf5d7a97aa11`.
- Independently reviewed rollback-only proof:
  `/private/tmp/veltex-r3-1-production-rollback-proof-v2.sql`, 701,235
  bytes, SHA-256
  `2b81526cb8bb3db8ec5c5825ec900684ecc5e706a7b4fa38da65b097c152ddc1`.
- Deterministic post-proof cleanup query:
  `/private/tmp/veltex-r3-1-production-rollback-cleanup.sql`, 12,325
  bytes, SHA-256
  `3458a39249e7e4a49321feab315de6df21e9d32bacbd4efea92914d0a438f2c8`.

Claude and Cursor both returned `PASS` for the exact proof packet. Those
verdicts advance only the proof-execution gate; they do not authorize any
hosted action.

## Gate separation — do not collapse

Execute each row only after its own prerequisite and action-specific approval.
A later approval never retroactively approves an earlier row.

| Gate | Exact action | Required evidence before advancing |
|---|---|---|
| P0 | Re-read project `iwoaaljitifloolszxlu` identity and recompute proof hash | Correct Production target; exact proof SHA |
| P1 | Run the entire rollback-only proof once in one dedicated non-pooler `postgres` session during a low-traffic window | Complete prefixed `R3_1_ROLLBACK_PROOF:` `P0001`; no client continuation after error |
| P2 | Close/roll back the aborted proof session; run the exact cleanup query in a new session | `cleanup_pass=true`, history `64`, planned history `0`, CRM relations `0` |
| P3 | Independently reconcile P1/P2 evidence | Hashes and counts match; no persistence or unexplained drift |
| E1 | Set Production-only server variable to exact lowercase `CRM_WORKSPACE_ENABLED=false`, read it back, redeploy | Exact literal confirmed; current Production remains CRM-disabled |
| D1 | Generate and independently review a commit-capable atomic migration bundle from the fresh post-proof state | Exact bytes/hash, refusal checks and rollback procedure |
| D2 | Apply the separately approved migration bundle | Both versions present and complete postflight passes |
| A1 | Deploy exact application commit `0d765d7` while CRM remains disabled | Alias/commit identity, baseline proposal smoke checks and uniform CRM 404 |
| F1 | Enable CRM with a separately approved Production setting change and redeploy | Authenticated synthetic smoke tests, monitoring and immediate disable path |

Never deploy the integration branch for this release: it contains accepted
later R3 work that is outside the R3-1 production artifact.

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

1. Set the Production-scoped, server-only environment variable to the exact,
   case-sensitive literal `CRM_WORKSPACE_ENABLED=false`, read it back from the
   provider, and redeploy. In the accepted R3-1 bytes, only lowercase `false`
   disables CRM; unset, blank, `False`, `FALSE`, `0`, `true`, and typos enable
   it. Verify the production alias points to the redeployment, CRM navigation is
   absent, `/dashboard/crm` redirects to `/dashboard`, and CRM API context
   resolution returns a uniform 404 while the proposal product remains
   available. This flag is an application kill switch, not a schema rollback.
2. Promote the primary accepted R2 application rollback target: Vercel
   deployment `DEMzfxMLbYsrpiTYDQ4hSmQYsiDp`, commit
   `b144df3b270370edf0b7af4927a16a0d9cca30c4`, immutable URL
   `https://veltex-services-veliz-ltjurh1ks-veltex-ai.vercel.app`. If the
   retained deployment record is unavailable, rebuild and deploy that exact
   commit from a clean checkout with the reviewed Production environment, then
   verify the production alias and smoke checks.
3. Use deployment `6557542919`, commit
   `a4deb7c0d0f50ae03dfd1ff1981833fa5f996cd1`, immutable URL
   `https://veltex-services-veliz-3068c22ex-veltex-ai.vercel.app`, only as the
   disaster fallback when the primary R2 target is unavailable or invalid and
   after a separate release decision.
4. Preserve CRM tables, stage history, command receipts, organization audit rows
   and outbox rows for diagnosis and a forward fix.
5. Do not remove the nullable CRM link columns from `proposals`; they do not
   alter proposal content and may be referenced by preserved CRM records.
6. Do not drop or rewrite CRM data in production. A destructive reversal is
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
