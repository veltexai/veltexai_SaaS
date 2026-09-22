# Release 1 migration and staging checklist

Status: NOT EXECUTED. This is a reviewable procedure, not authorization to deploy.

## Before applying

1. Verify the deployment target is an isolated staging project and take a restorable backup. Confirm current production still descends from `a4deb7c` and compare any newer changes before release.
2. Confirm prior migrations supply `profiles`, `proposals.service_specific_data` (jsonb), `marketing_funnel_events.properties/created_at`, and `profiles.is_internal`. Review actual grants and RLS in the target rather than assuming local migrations match production.
3. Apply `20260922000000_service_catalog_release_1.sql` transactionally with the usual migration runner. It does not modify legacy proposal rows, service-type checks, Stripe state or frequency constraints. Re-running its statements recreates named policies/trigger and upserts the version row without changing approval.
4. Verify profile reads/writes as two separate authenticated users. A cannot select, update or insert B's row; anonymous cannot read either table. Authenticated users can read registry metadata but cannot approve/publish versions.
5. Verify version guard: catalog job insertion requires a registered matching snapshot version and residential legacy type; deleting catalog metadata or changing a saved version fails. Every old service type still inserts and edits normally.
6. Verify service-role reporting returns only non-internal profiles and historical event taxonomy. End-user sessions cannot select the reporting view.

## Required signed-in acceptance

- Use synthetic users and a test email transport. Do not use live recipients or real charges.
- For all five legacy service types: load, edit, calculate, regenerate, save and export; compare totals to the production baseline fixtures.
- New packs: low/normal/high condition, 0-bedroom studio, half bath, large home, pets, customer supplies, appliance interiors, minimum charge, 0 wage warning, labor override and below-cost price override.
- Recurring: weekly/biweekly/monthly average periods are distinct from per-visit prices. Deep/standard/move/turnover stay one-time. Vacant-only move-in/out validates.
- Turnover: checkout/check-in validation, impossible high-scenario window, laundry machine-time warning, clean-linen exclusion when no laundry, restocking from host inventory, inspection and visible damage documentation.
- Add optional markets/services profile, reload, load defaults into a new job, then edit assumptions; historical jobs retain their own snapshots. Simulate profile API failure and confirm no overwrite is possible from the failed-load settings screen.
- Prepare -> edit inputs -> save disabled until regeneration. Save -> reopen -> revise client/size/frequency/cost -> regenerate -> save. Compare flattened columns, JSON snapshots, customer document and displayed amount.
- Unauthorized, other-owner, quota-exhausted, entitlement failure, database outage and network retry cases. Existing owner regeneration at quota must not create a new proposal.
- Validate print/download/export/send-email attachment and send attachment with test transport. Verify paid-plan gates are unchanged and a missing print session never attaches “Not authorized” as a PDF.
- Validate tracked recipient view/download with actual RLS. The new work did not loosen public permissions. Check browser payload contains no internal override reason or cost snapshot.
- Verify first-party generated/saved/first/repeat events contain taxonomy and no customer details. Verify internal users are excluded. Test upgrade/checkout using existing instrumentation and explicitly document attribution gaps.
- Inspect 390px and desktop layouts in the authenticated application and every PDF page. Static fixture evidence is supplemental.

## Recovery / rollback

Preferred recovery: disable new-workbench entry links and roll forward while retaining the catalog renderer and version-aware edit boundary. Rolling all application code back to pre-catalog code while catalog proposals exist is unsafe: old forms do not understand the new job data. Preserve data and repair forward.

If **no catalog proposals or business profiles have been created**, app rollback to the pre-release commit is possible. After a backup and explicit operator approval, remove only these new objects in a transaction: `service_catalog_funnel_daily`; trigger `proposal_catalog_version_guard` on `proposals`; function `guard_proposal_catalog_version()`; `business_service_profiles`; `service_catalog_versions`. No destructive rollback SQL is executed or automatically shipped.

If records exist, retain the additive tables and snapshots. Export/version them before any removal. Never mass-rewrite `service_type` or delete existing proposal JSON to force compatibility.

## Bounded Mohamed handoff (after Claude findings resolved)

Report READY / NOT READY with exact evidence for production ancestry, migration/RLS execution, old and new proposal workflows, unchanged Stripe entitlements, required env/grants, build/tests, staging smoke and rollback readiness. No new environment variable is required by this release. Anthony separately authorizes deployment; this checklist grants no release permission.

## Remediation addendum (September 22, 2026; NOT EXECUTED)

The remediation candidate adds `20260922010000_catalog_remediation.sql` after the original migration. Read `REMEDIATION_EVIDENCE.md` before using this checklist; it supersedes the original claims about first-load access requirements, recurring headlines and STR one-time customer language.

- New catalog ID: `2026-09-22.2`; retain `2026-09-22.1`. Keep both application implementations and registry rows.
- Use `quality/service-catalog-remediation/staging-check.sh` only against a disposable loopback clone with synthetic users and the prior migrations already installed. It deliberately refuses hosted URLs. Neither psql nor Docker was available during remediation, so no execution is claimed.
- Inventory existing table/column grants, RLS policies and SECURITY DEFINER functions first. The candidate revokes anonymous raw proposal/tracking privileges and introduces narrow token functions. Verify no other view/function bypass exposes private columns.
- As anon, direct PostgREST `select=service_specific_data` and raw writes must fail. A valid synthetic token must return only the customer allowlist; an unknown token must return nothing. Search the complete response for wages, access sentinel, override reason and client email.
- Exercise catalog and legacy counters as anon, owner, other user and service_role. Run concurrent increments and check none are lost. Test view/open/time/scroll functions, tracking disabled flags, invalid metrics and unknown tokens. Confirm the trigger does not reject legitimate counter changes.
- Check historical v1 status-only PUT leaves stored content/price/snapshots unchanged. Explicit edits use its v1 strategy. Version replacement in-place fails; new proposals use v2.
- Verify STR's persisted legacy discriminator does not leak “one-time” into the agreement: same-day and next-day (including equal-clock next-day), per-turn price, expected-turn budget, linen/restock/report policy. Recurring initial clean is separately priced and replaces the first standard visit.
- Use synthetic test transport for email. No real recipients or paid calls. Confirm all PDF/export/public download paths, raw payload privacy, branding/footer entitlement, and hosted Chromium availability.
- Run authenticated 390/1440 and real-device offline/403/422 checks. The local static screenshots and component tests do not satisfy this gate.

Next gate is Claude re-review. Database execution, operator validation and founder acceptance remain required; this addendum grants no deployment permission.
