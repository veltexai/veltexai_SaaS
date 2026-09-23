# Round 3 candidate — not approved for release

Input: CLAUDE_RE_REVIEW_RESULT.md (independent round 2). This document describes local changes, not an authorization to deploy. Nothing here establishes executed database security or operator acceptance.

| Finding | Candidate change | Evidence / remaining gate |
|---|---|---|
| R2-1 | Removed customer-prose and company-name hard validator. Advisory entry-code detection uses word boundaries and digit proximity, including combo, opener and #NNNN. Internal access is still structurally excluded. | Corpus tests plus visible workbench-price test. Advisory is not a security boundary; customer text must be reviewed before sharing. |
| R2-2 | Root dispatcher selects frozen v1 validation before pricing; only explicitly validated presentation additions are accepted for v1. V2 schema accepts only v2. | Nonempty v1 notes, analytics, edited quotes and v1-only constraints tested. V1-specific UI hides unsupported new drivers. |
| R2-3 | V1 turnover remains a single job without inferred turns, monthly budget or per-turn agreement. V1 recurring dashboard price_range retains periodPrice. | Edited realistic v1 recurring and turnover tests; frozen golden cases unchanged. |
| R2-4 | Public catalog documents use their own version-specific schedule; legacy Service Details card is omitted. Missing email row is omitted. | Public component test. |
| R2-5 | Restrictive PUBLIC owner gates on proposals/tracking/history; migration aborts if proposal/tracking policy expressions differ from the canonical owner expression, including policies aimed at authenticated. | Static inspection only. owner-matrix.sql is supplied but UNEXECUTED. Unexpected legitimate policy expressions also block deployment until reviewed. Live schema inventory and second-user execution remain mandatory. |
| R2-6 | Ordered maintenance deployment and compatible rollback procedure below. | Operational execution not authorized or performed. |
| R2-7 | Event constraint uses NOT VALID so unknown historical events do not abort the transaction; new writes are constrained. growth_funnel_daily counts catalog_previewed together with legacy generation success using distinct users. Regeneration remains excluded. | SQL contract inspection; dirty historical dataset execution remains open. |
| R2-8 | Separate initial-clean pricingLineItems persisted in service_specific_data and printed in the quote; sticky workbench displays it. | Snapshot and structured-data tests. Dashboard amount is ongoing per-visit for v2 recurring; initial replaces first visit and is never silently added to ongoing monthly estimate. priceBasis stores basis; analytics records basis and initial-clean flag. |
| R2-9 | Profile API reads company_profiles.company_name; new workbench seeds the editable signature even without saved business costs. | UI test for Keystone Cleaning. Existing accepted documents are not rewritten. Operator can intentionally customize the signature. |
| R2-10 | Token-resolved view inserts restore proposal_views history; existing trigger is sole proposal counter writer, now null-safe and search-path pinned. Repeated time additions cap the lifetime tracking total at 86400 seconds. | SQL candidate only; real counters/concurrency/disabled-token tests remain open. Time is untrusted engagement telemetry, not billable/audited duration. Legacy tokens retained; expiry/rotation policy needs a separate migration and owner communication. |
| R2-11 | Added prose, v1, public, initial-clean, company seeding and API 422 tests. Next review bundle includes legacy-golden.json. | No claim that static SQL assertions prove RLS. |
| R2-12 | Turnover price/scenario/override units say turn; clearing numeric turnover fields preserves empty invalid input with named field errors; clutter styled. | Typecheck and UI suite. |
| R2-13 | Version-change and sample-save errors are Zod validation errors. | Actual API create/update tests require 422 and readable messages. |
| R2-14 | USD formatting groups thousands. Cover letter introduces the service with a complete phrase. | Snapshots. |
| R2-15 | Quick redirects preserve source/demo/design context; category restores signup qualification and accessible design selection. Demo origin remains attribution; only explicit sample mode disables saving. | Local routing helper and typecheck. |
| R2-16 | Preexisting legacy generated_content HTML handling noted for infrastructure follow-up. | Out of this candidate's scope; catalog uses Markdown renderer. |

## Policy history correction

The policy `Allow anonymous tracking updates` is present at supabase/migrations/023_proposal_tracking.sql:66 and is PUBLIC by default despite its name. Therefore the missing-policy premise in round 2 is incorrect. Actual live drift remains unknown. The candidate checks policy expressions rather than trusting names, and adds restrictive gates so a permissive OR policy cannot bypass ownership. A policy inventory, role membership/BYPASSRLS inventory, grants, definer functions and full owner/other-user/anon/service-role matrix are still required on the isolated clone.

## Deploy and rollback order (future, separately authorized)

1. Inventory the target schema, all grants including column grants, RLS policies, role inheritance and definer functions. Inventory event_name counts; unknown historical names must be mapped or accepted before later VALIDATE CONSTRAINT. Do not run these files unchanged if any version was already applied: produce a new forward migration for that target.
2. On a disposable synthetic clone, apply both catalog migrations with ON_ERROR_STOP; capture the owner matrix, wrong/missing/legacy tokens, disabled tracking, trigger exactly-once and concurrent counters, client API/PDF/email paths. Inject a permissive USING(true) policy into a fresh pre-migration clone and verify the second migration aborts atomically. Verify an unknown existing funnel event survives the NOT VALID change while an unknown new write fails. No production data in the review bundle.
3. Build and stage the matching app artifact. Run authenticated app tests and operator/founder gates. Approve a compatible rollback app artifact that uses the capability RPCs; an older raw-table public-view app is NOT compatible.
4. For an authorized production window, enable externally managed maintenance/read-only traffic gating for proposal creation, edits and public links. Drain old requests/instances. Apply database migrations first in transactions, verify grants and capability RPCs, then switch all app instances to the tested artifact. Smoke owner, other-user and public token paths before reopening traffic. No mixed old-client interval is assumed safe.
5. On failure, keep maintenance on. If the database transaction failed, it rolled back: restore the prior app only after reassessing its known security limitations. If the database committed, retain revocations and owner gates and deploy the approved RPC-compatible rollback build, or fix forward. Never restore anonymous table/column grants to make an old app work. Persisted v2 rows require a v2-capable app. Do not delete snapshots or downgrade version IDs. Reopen only after the same smoke tests pass.

## Still required

Disposable database execution is blocked locally: psql and Docker are unavailable. Authenticated staging, real email/test transport and hosted Chromium PDF paths, operator rate validation, founder acceptance and deployment approval remain open. F10/F13/F15/F16/F17/F19 accepted deferrals remain unchanged. F8 and F24 remain blocked. Mohamed's external handoff has not been sent.

## Local validation for this candidate

- Jest: 57 suites, 500 tests, 5 snapshots pass.
- TypeScript: `tsc --noEmit` passes.
- Next.js production build passes using loopback Supabase placeholders; no hosted service configuration.
- Synthetic recurring and turnover workbench/document captures at 390 and 1440 pixels: 8/8 without horizontal overflow. Two local Chrome PDFs generated. These are static fixtures, not authenticated end-to-end or hosted PDF evidence.
- Frozen v1 catalog/pricing compared to their original paths at 4b7310c: byte-identical. See `quality/service-catalog-round3/frozen-v1-check.json`.
- Logs and local synthetic artifacts are under `quality/service-catalog-round3/`. The external review bundle includes a concise validation summary and synthetic evidence, not raw run logs or unrelated workspace files.
