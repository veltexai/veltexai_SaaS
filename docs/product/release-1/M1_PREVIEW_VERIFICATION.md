# M-1 Supabase preview verification

Date: 2026-09-24 Pacific. Candidate: `07624c4`, branch `codex/r0-privilege-hardening`.
Preview: `m1-r0-verification-20260924`, project `wcnfhriosemgchmtwgof`.
Production and the separate 100D environment are excluded.

## Verified continuity

Claude's latest response in [Veltex AI Release 1 independent review](https://claude.ai/cowork/cse_015J3LbDmLeVEV7Qt2Bkcoz9), message 47, independently verified the M1 correction from git objects: **M1 PASS / LOCAL PASS / RELEASE FAIL**. It executed the normalization helpers in scratch space and confirmed preservation of the five stored operational settings, blank-password omission and the 29-column allowlist. No migration changed after its executed R0 review. The existing 46-migration, definer-gate, seven-wrapper role matrix and rollback evidence is retained, not rerun or represented as hosted evidence.

The authoritative main-checkout ledger records Gmail rotation and delivery **COMPLETE / VERIFIED** at 2:47 PM Pacific. Authentication uses `veltexclean@gmail.com`; branded From stays `noreply@send.veltexai.com`. This supersedes earlier pending-rotation checkpoints and Claude's older rotation blocker. No secret was read or changed during this continuation.

## Hosted observations

A metadata-only SQL query in the preview confirmed:

| Object | Present |
|---|---|
| marketing_funnel_events | yes |
| profiles.is_internal | yes |
| service_catalog_versions | yes |
| read_tracked_proposal(text) | no |
| r0_assert_self_or_service(uuid) | no |

This agrees with the earlier checkpoint: the first catalog migration and prerequisite repair were applied, but catalog remediation and R0 remain pending. The first catalog attempt previously failed transactionally because the production-derived preview lacked marketing events and the internal-profile flag. The earlier prerequisite patch is not proof that complete migrations 037/041 are deployed.

## Drift reconciliation and deployment order

1. Inventory the actual target's migration history, columns/types, policies, grants, functions and triggers without selecting secrets or customer records. Run `quality/service-catalog-round4/target-prerequisites.sql`; it fails before catalog DDL when required fields are absent or incompatible. Correct timestamp column: `occurred_at`, not `created_at`.
2. Reconcile `037_marketing_attribution.sql`: both tables, indexes, owner RLS and the first-proposal trigger are dependencies. Do not recreate an existing permissive policy or overwrite unknown target state. Inventory every existing object before approving a target-specific repair.
3. Reconcile `041_growth_qualification_and_funnel.sql`: the boolean column alone is not full qualification/classification deployment. Inventory its profile classifier trigger and classification backfill before treating internal-user exclusion as verified. Do not silently replay its old event constraint over newer event names; retain the candidate's NOT VALID constraint and inventory historical names first. Qualification columns/backfill beyond the catalog prerequisite require their own reviewed plan.
4. Apply catalog release `20260922000000`, catalog remediation `20260922010000`, then R0 `20260924000000`, each transactionally. Stop at any unreviewed-policy or missing-object exception; retain evidence and correct the plan rather than disabling the guard.
5. Execute owner/other-user/anonymous/service-role and forged-claim assertions with synthetic fixtures on the preview, rolling back fixture transactions. Check profile-policy recursion, per-wrapper access, raw table denial and token payload privacy. SQL SET ROLE checks do not substitute for authenticated PostgREST sessions; report them separately.
6. Complete authenticated application staging and email/PDF checks separately. The working production SMTP transport does not establish candidate-app staging correctness.

Rollback: before catalog data exists use the reviewed catalog recovery procedure; otherwise preserve versioned data and roll forward. Use the existing R0 rollback rehearsal, which intentionally does not restore secret-table grants. Prerequisite objects are retained; no automatic table removal or data deletion. Production rollout remains unauthorized.

## Current execution boundary

The earlier approval block was resolved after renewed explicit authorization. Catalog remediation executed successfully on the named preview. R0 failed transactionally on a missing template-access implementation; original function names remain and the R0 helper is absent. See the execution update below.

The existing preview has a $1 cap. No additional project was created, no branch was promoted/deleted, and no purchase was made. Usage-based compute continues under its prior authorization; exact accrued billing has not been independently checked here.

Release remains blocked by completion of M-1, authenticated staging, operator validation, founder acceptance and separate production deployment authorization.

## Execution update: actual release blockers

- Catalog migration: SUCCESS. SQL statements from the candidate were submitted through the editor with comments/formatting condensed.
- Catalog synthetic SQL role probes: PASS for owner reads, other-user proposal/tracking read and update denial, anonymous raw reads denied, token resolution without private sentinels, and one view increment. All fixtures were rolled back. These are not authenticated HTTP/PostgREST or application staging tests.
- R0: FAILED with SQLSTATE 42883, missing `_r0_can_user_access_template_impl(uuid,uuid)`. Metadata afterwards confirms original usage function remains, renamed implementation absent, R0 helper absent: transaction rolled back.
- Production read-only existence checks prove the preview is not a faithful current production schema: `proposal_templates`, `can_user_access_template(uuid,uuid)` and `get_user_accessible_templates(uuid)` exist in production but not the preview. Earlier assertions that the preview was a complete production copy are superseded.
- `start_user_trial(uuid,text)` is absent in both production and preview. The reviewed R0 migration unconditionally alters it, so even a faithful preview would expose another migration failure. Reconcile this target-specific missing optional routine without installing obsolete trial behavior or weakening caller gates, then independently test/review the change.
- Added `r0-target-prerequisites.sql` to fail before any R0 DDL for this exact candidate. No app/migration source was changed and no false hosted PASS is claimed. Structured evidence: `quality/service-catalog-round4/m1-preview-results.json`.

Required next step: reconstruct a schema-faithful disposable target from current production metadata/schema (without customer data or credentials), reconcile the missing trial-routine assumption, then execute R0 and the full role matrix. Authenticated staging and operator validation remain separate. Deployment was authorized only after blockers clear; it has not occurred. Preview deletion is likewise conditional on completion of its evidence and is not yet eligible.

## b341e50 continuation

Candidate `b341e50` makes only the obsolete trial routine conditional; the template dependencies remain required. Its targeted R0 Jest suite was reported 7/7 PASS by the implementing task. The read-only R0 preflight now matches that boundary.

Restoration scope identified from reviewed migration 029 and the current entitlement migration: `proposal_templates`, `template_tier_access`, associated constraints/indexes/RLS/grants/triggers, and the two template-access functions. Use `template-prerequisite-inventory.sql` to compare exact production definitions before restoring only absent preview objects. Do not replay all of 029, seed real data, substitute old entitlement logic, or treat a minimal function-execution fixture as a faithful production clone.

Execution is blocked by browser access: existing-tab state and browser tab enumeration timed out, resetting the session; documented recovery and a direct known-preview selection also timed out. No restore, R0 execution, production deployment or deletion occurred in this continuation. Hosted evidence remains at the prior catalog PASS/R0 rollback checkpoint. Restore the Chrome connection before resuming.
