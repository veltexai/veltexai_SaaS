# Release 1 independent review packet

Status: IMPLEMENTED / LOCAL VERIFICATION COMPLETE; NOT APPROVED FOR RELEASE.

Date: 2026-09-22 Pacific. Branch: `codex/all-cleaning-release-1`.

This packet is the bounded handoff requested in `../ALL_CLEANING_SERVICES_REVIEW_ASSIGNMENTS.md`. No Claude review has been performed or represented as complete. Do not deploy, publish, spend money, send messages, change credentials or update live marketing while reviewing.

## Objective and production base

Review the shared catalog foundation and residential/turnover packs as a cleaning-operator workflow, conversion experience and product-safety change. Preserve all five legacy service types and commercial pricing.

Base: `a4deb7c0d0f50ae03dfd1ff1981833fa5f996cd1`, identical to refreshed `origin/codex/onboarding-friction-release`. Refreshed `origin/master` is `e02213e6cb8e3d5035cb03db8744d37b01f753a7`, an ancestor 15 commits behind. Required onboarding fixes `999f37c`, `3310b1d`, `a2bc8fd`, `5b25c23`, `3a93988` and analytics fix `ba92ce4` are ancestors of the base.

GitHub deployment `6557542919`, environment **Production – veltex-services-veliz**, binds `a4deb7c` to a successful deployment on 2026-09-20 at 20:49:26 UTC. Its status reports “Deployment has completed” and URL `https://veltex-services-veliz-3068c22ex-veltex-ai.vercel.app`. Read-only evidence came from `gh api repos/veltexai/veltexai_SaaS/deployments` and the deployment's `/statuses` endpoint. The newer `7fbeb6b` production deployment belongs to **veltex-ai-100d-pilot**, a separate environment; its app deployment is labeled Preview. No Vercel alias was changed or inspected in this task. Reconfirm the live alias at release time.

The authoritative main checkout remains on old `deploy/100d-pilot` at `0521613` with extensive unrelated modifications. It was read for operating instructions, not used as an implementation base. Do not merge that dirty checkout wholesale.

## Compatibility map

| Surface | Existing behavior | Release 1 treatment |
| --- | --- | --- |
| Database service types | residential, commercial, carpet, window, floor | Unchanged. New packs persist as residential plus versioned job data. |
| Existing proposal rows | JSON inputs and saved pricing | No backfill or repricing. `normalizeCatalogProposal` returns legacy data unchanged. |
| Quick scope templates | 15 existing scope slugs, including medical and specialty scope text | All preserved. Compatibility adapter retains the original slug and legacy strategy. No regulated strategy added. |
| Roadmap taxonomy | `features/proposals/constants/service-expansion-catalog.ts` | Preserved as roadmap inventory. New executable catalog separately splits residential from short-term rental. Roadmap rollout waves are not release approval flags. |
| Advanced builder and pricing engine | Five service types, current commercial frequency factors | Preserved. Legacy regression tests still execute. |
| Onboarding | Optional qualification after signup; existing signup/verification routes | Preserved. Quick route adds optional market/workbench and business-profile links; no new signup requirement. |
| New intake | None | Authenticated `/dashboard/proposals/category`, separate market/job fields, conditional turnover questions. |
| Business settings | Existing company and branding settings | Adds optional markets, offered packs, equipment inventory and cost defaults. Defaults do not rewrite existing jobs. |
| Generation | Legacy OpenAI route | Unchanged for legacy jobs. New packs use deterministic composition in `/api/service-catalog/preview`; no paid AI calls. |
| Create/edit/reopen | Existing proposal endpoints and quotas | New snapshots are recalculated server-side; update also synchronizes flattened client/area/frequency columns. Old editors route catalog jobs to their workbench. |
| Saved versions | Previously no service catalog identity | Catalog definition, job assumptions, estimate and override reason persist in existing JSON. Migration prevents removing/changing a catalog version on an existing catalog job. |
| Design entitlement | Existing template checks | Preserved. New packs render through a complete catalog document layout, not each legacy premium design. Legacy document designs remain unchanged. |
| Print/download/export | Protected print page and jsPDF routes | Catalog-specific complete document rendering and fenced-table text conversion. Email PDF helper now forwards caller session cookies and refuses an authorization-error PDF. |
| Public tracked view | Existing access/tracking system | Catalog content renders safely as Markdown; internal catalog costs and override reason are removed from the client payload. Public access itself requires staging verification. |
| Analytics | First-party generation/save/first/repeat events | Adds segment/family/job/version/override flag to new proposal generation and save events. No client identity, scope notes, wages or reason enters these properties. |
| Admin | Existing admin catalogs | No new admin publishing UI. Version registry is authenticated-read/service-role-write; executable pack edits remain code reviewed. |
| Marketing | Existing public pages and campaigns | Unchanged. Sample entry points live behind the dashboard; no broadened live claims. |

## Implementation guide

- `features/service-catalog/schema.ts`: strict versioned schemas, separate segment and job type, validated cost assumptions, hazard rejection.
- `catalog.ts`: five code-versioned records: recurring standard, one-time standard, first/deep, move-in/out, Airbnb/turnover. Property types, production ranges, questions, scope, exclusions, responsibilities and terms are explicit records. Approval remains `operator_review_required`.
- `pricing.ts`: area/room-driven person-hours, condition and recurrence factors, pet/appliance labor, conditional turnover labor. Burdened wages + supplies + equipment + travel = direct costs; overhead applies to direct costs; target margin divides total modeled cost by `(1 − margin)`. Minimum applies after margin. Crew size changes duration, not person-hours. Low/base/high varies labor by explicit uncertainty; it is not a statistical confidence interval.
- `proposal.ts`: canonical server composition. Existing `price_range.low/high` both contain the selected period total, so old midpoint renderers cannot turn uncertainty into a different quote. Scenarios are separately retained in `estimateSnapshot`.
- `components/workbench.tsx`: editable assumptions, override reason, live cost explanation, stale-preview protection, conditional questions, error/retry behavior, prepare/save.
- `components/catalog-document.tsx`: full content without legacy section truncation, natural print pagination. Internal cost estimates are not inserted into customer prose.
- Migration: `supabase/migrations/20260922000000_service_catalog_release_1.sql`. Additive profile/version tables, owner RLS, catalog-version guard and service-role reporting view.

New proposals use the new workbench explicitly. Selecting an old residential quick template does not silently opt an existing workflow into new pricing. This is intentional compatibility behavior; review whether migration guidance should be clearer before launch.

## Local evidence and reproduction

- 51 Jest suites, **418 tests passed**, including 5-pack/3-condition fixtures, all legacy types and quick templates, commercial frequency regression, quota/ownership/template checks, canonical save/edit/reopen, invalid inputs, override, privacy, mobile-flow interactions and print-session forwarding.
- TypeScript: `./node_modules/.bin/tsc --noEmit`, exit 0.
- Production build uses placeholder local Supabase/app values; no production credentials. See `quality/service-catalog-release-1/build-results.log`.
- `git diff --check`, exit 0.
- Local SSR fixtures and headless Chrome captures at 390 and 1440 pixels: all eight combinations report no horizontal overflow. These are static render fixtures, not a claim of signed-in browser end-to-end testing. Interactive state transitions are tested in jsdom.
- Actual screenshot inspection covered desktop turnover workbench and mobile residential document. PDF pages were rendered and inspected separately. See artifacts and visual review notes.
- Artifacts: `quality/service-catalog-release-1/artifacts/`: five complete JSON proposals, two PDF examples, desktop/mobile screenshots and `layout-results.json`.

Run from repository root:

```sh
pnpm install --frozen-lockfile --ignore-scripts
./node_modules/.bin/jest --runInBand
./node_modules/.bin/tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=local-build-placeholder NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build
node quality/service-catalog-release-1/render.cjs
node quality/service-catalog-release-1/capture.cjs
```

Chrome must be installed for the capture command. Render uses built CSS. Browser resource requests are blocked except local fixture files. PDF fixtures contain synthetic customer data.

## Release blockers and limits

1. **Database/staging verification pending:** migration has not been executed against local Postgres or hosted Supabase. No Postgres/Docker executable was available. SQL/RLS behavior, prior migration compatibility and actual signed-in persistence must pass on an isolated staging database. Do not treat mock API tests as RLS execution evidence.
2. **Domain validation pending:** production rates, room minima, condition factors, add-on labor and example dollar assumptions are explicitly unvalidated planning defaults. Experienced residential/turnover operators must review low/normal/high jobs, laundry cycle capacity and inclusion usefulness.
3. **Full staging acceptance pending:** verify create/edit/regenerate, quota errors, print, all three PDF export paths, email attachment with a test transport, tracked recipient access and upgrade intent. No emails were sent here. Existing public tracking/RLS and active-only subscription policies were not redesigned.
4. **Claude challenge review and founder acceptance pending.** No marketing or deployment approval follows from a passing build.
5. Taxes and cancellation/payment terms require operator confirmation. No jurisdiction-specific legal/compliance claims are introduced.
6. Business equipment inventory is informational; equipment dollar allowance remains explicit. Access/urgency require the operator to adjust labor/travel; there is no opaque automatic surcharge. Laundry factors represent hands-on work, not machine cycle elapsed time.
7. Catalog v1 is deliberately code-managed. A future admin publishing workflow must preserve historical version definitions and strategies. Do not edit an already published version in place.
8. Segment analytics currently identifies generation and saved-value milestones. Qualification and checkout can be joined to the user's business profile in analysis, but this release does not invent historical proposal-segment attribution for those events. `legacy_unspecified` is explicit in the reporting view.
9. Public vertical marketing pages are intentionally not added. Authenticated residential and turnover examples are available from Quick Proposal; public launch assets remain gated by the requested no-live-marketing constraint.

## Independent reviewer assignment

Read this packet, the parent master plan and assignment document, then inspect the source and artifacts independently. Challenge missing residential/turnover types, irrelevant or missing questions, access/condition/travel/minimum assumptions, price defensibility, inclusions/exclusions, signup-to-value friction, mobile error/override behavior, qualified activation/upgrade analytics and marketing alignment. Pay special attention to the new complete-document rendering and legacy save boundaries.

Return exactly:

- Verdict: PASS / CONDITIONAL PASS / FAIL.
- Severity-ranked findings with exact file/line or screenshot evidence.
- Missing acceptance tests.
- Conversion and positioning recommendations.
- Explicit release blockers.
- Confirmation that no deployment, publication or spend occurred.

Do not silently expand scope or approve regulated services. Mohamed's bounded handoff comes only after this review is resolved; use `MIGRATION_AND_STAGING.md` for the remaining infrastructure checks.
