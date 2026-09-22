# Release 1 remediation — Claude re-review candidate

Date: September 22, 2026 Pacific. Branch: `codex/release-1-remediation`.
Starting commit: `4b7310c45b33063544569730a175b56400472afc`. `git merge-base --is-ancestor a4deb7c 4b7310c` passed. The worktree was clean before changes. Review source: the independent result in `/Users/Antho/.codex/worktrees/2d1f/veltexai_SaaS/docs/product/release-1/CLAUDE_INDEPENDENT_REVIEW_RESULT.md`. The master plan, review packet, migration checklist and operating ledger were read. No AGENTS.md exists in this checkout; the main-checkout continuity rules were found and read.

**Verdict: local remediation candidate; NOT RELEASE READY. Next gate: Claude re-review, not deployment.** No hosted database connection, migration execution, authenticated staging, operator rate validation, founder acceptance, deployment, publication, external message or paid API call occurred. No credentials were created or changed.

## Verification and exact artifacts

- Full Jest suite: `quality/service-catalog-remediation/test-results.log` (54 suites, 476 tests and 5 snapshots passed).
- TypeScript: `quality/service-catalog-remediation/typecheck-results.log` (empty output means successful `tsc --noEmit`).
- Production build: `quality/service-catalog-remediation/build-results.log`; local placeholder Supabase URL/key. Existing build lint exclusion remains in place; this is not a lint-clean claim.
- Non-demo static SSR layout: `quality/service-catalog-remediation/artifacts/*-390.png`, `*-1440.png`, `layout-results.json`. These are local fixtures, **not authenticated application or real-device evidence**. Eight captures, no horizontal overflow. Recurring mobile/desktop workbench and recurring mobile/turnover desktop document images were visually inspected.
- Synthetic customer HTML/JSON and two browser-generated PDFs: same artifact directory. No email was sent. Full PDF pagination, all three export paths and hosted Chromium are still staging checks.
- Artifact integrity manifest: `quality/service-catalog-remediation/SHA256SUMS.json`.
- Five customer-copy snapshots: `features/service-catalog/__tests__/__snapshots__/remediation.test.ts.snap`.
- Actual base-commit golden inputs/results: `quality/service-catalog-remediation/legacy-golden.json`; reproducible with `legacy-baseline.cjs`. Covers five legacy pricing engines with fixed synthetic settings and all 15 scope definitions. **Not production customer fixtures or legacy PDF comparisons.**
- Version retention contract and code: `features/service-catalog/versions/README.md`, `versions/v1/`, `versions/v2/`. Current catalog is `2026-09-22.2`; old `2026-09-22.1` dispatch remains.
- Database candidate: `supabase/migrations/20260922010000_catalog_remediation.sql`. `quality/service-catalog-remediation/staging-check.sh` refuses non-loopback targets. It was NOT executed: neither psql nor Docker was available. Static tests do not prove RLS enforcement.

## Finding map

“FIXED” below means implemented and locally verified to the described extent; it is not staging or release approval.

| Finding | Status | Change / exact evidence / remaining scope |
|---|---|---|
| F1 real first-load price | FIXED | Access optional, first-screen sticky price, visible numeric validation. `workbench.test.tsx`: five non-demo first-load cases, transient validation; `remediation.test.ts`: all default jobs price without access/contact. |
| F2 customer caveats/operator wording | FIXED | Customer Price/Your price, company signature, empty notes omitted; internal warnings before preparation/save. Five snapshots and document sanitizer; common renderer covers print/export text. Legacy stored bytes are preserved on status-only saves, with safety/copy normalization at rendering. |
| F3 entry privacy | FIXED | Internal access never composed; separate scheduling; entry-term validation on editable customer prose and restock list, code-pattern warning. Snapshot sentinel checks (`4821`, etc.). RPC exposes an explicit projection and strips historical Access lines. Actual anon enforcement remains F8. |
| F4 turnover agreement | FIXED | Vacant default, per-turn agreement, expected turns, beds/linen par/restock list/reporting deadline; same-day and next-day including identical-clock next-day checks. `remediation.test.ts` turnover case; turnover artifacts. Bed size, dishwasher/patio/hot-tub scope remain possible custom scope, not modeled price drivers. |
| F5 recurring headline/rounding/terms | FIXED | Per-visit persisted quote, secondary monthly budget, configurable upward rounding increment; recurring cancellation/skip/reschedule/access terms. Snapshot and rounding test. The persisted legacy frequency discriminator for STR remains one-time for DB compatibility; customer language and catalog estimates use per-turn. |
| F6 price drivers | FIXED | V2 adds area AND room workload, levels, flooring share, distinct clutter/soil, elapsed months and occupants; pets/appliances remain visible labor additions. Bathroom sensitivity test requires at least $20 at fixed area. Workbench explains coefficients. These coefficients are unvalidated planning assumptions: operator acceptance remains mandatory. |
| F7 version drift | FIXED | Retained v1 and v2 schema/catalog/pricing modules; v1 projected to its frozen pricing contract. No version switch in-place. Unchanged job/client/design returns stored content and pricing; real status-only PUT test verifies historical $173.21 and text survive. Explicit input edits use saved version. Shared safety/copy corrections are intentional; see retention contract. |
| F8 anon/RLS/trigger | STILL BLOCKED | Candidate pinned-search-path definer guard; revoke anonymous raw table AND column grants; allowlisted token read and atomic token-resolved counters. View endpoint ignores caller-supplied proposal ID. New send tokens use crypto UUID. Static `tracking-boundary.test.ts` passes. No database execution or actual hosted-policy confirmation; cannot claim anon REST is proven private until staging matrix passes. |
| F9 editable customer language | FIXED | Cover letter, scheduling, company signature, scope additions, included-scope toggles and terms are controlled job inputs. Unknown omitted scope rejected; edits preserve server pricing and version binding. `remediation.test.ts`: scope edits cannot forge quote. Scope omission explicitly does not auto-reduce price. |
| F10 scope/document completeness | DEFERRED WITH RATIONALE | Deep scope expanded; turnover inputs and responsibilities expanded; branding contact block added. Full proposal number/date/validity, license/insurance, re-clean/payment policies and move-out appliance defaults require a cohesive company policy model and operator validation; not invented as guarantees. No claim of full F10 closure. |
| F11 initial clean | FIXED | New recurring jobs default to separate initial detailed clean, computed by the same-version deep-clean strategy and current costs. Explicitly replaces first standard visit; monthly budget describes ongoing visits only. Test and recurring snapshot. |
| F12 competing quick paths | FIXED | Legacy residential quick-template entry and selections route through adapter to catalog workbench. Existing legacy records/pricing untouched. Five-engine/15-template base golden tests plus existing quick API persistence tests. Advanced legacy builder remains for existing service compatibility. |
| F13 segment onboarding | DEFERRED WITH RATIONALE | Qualification/profile seeding and STR onboarding option not changed in this remediation. Needs coordinated qualification constraint/reporting and navigation tests. Required before residential/turnover paid acquisition. |
| F14 first value/mobile/errors | FIXED | First-screen price; collapsed costs and customer contact; preserved common inputs when changing service; readable frequencies; validation/403/422/offline tests. Static screenshots supplement tests; signed-in/mobile-device acceptance still pending. |
| F15 analytics | DEFERRED WITH RATIONALE | Preview/regeneration distinguished from activation, demo preview excluded from first-party activation and demo save blocked; taxonomy-only workbench/estimate/validation events plus profile-save event. Tests in workbench and preview suites. Cross-funnel checkout segment attribution and mixed-unit historical dashboard aggregation still need reporting work; not claimed fixed. |
| F16 business profile behavior | DEFERRED WITH RATIONALE | Cost defaults remain functional. Services/markets/equipment filtering is not implemented; equipment dollars remain explicit. Needs deliberate “show all services” behavior and existing-user onboarding migration, not silently hiding capabilities. |
| F17 paid design | DEFERRED WITH RATIONALE | Company logo/name/contact and existing powered-by entitlement restored/preserved on catalog document/print paths; customer public header uses company branding. UI explicitly identifies standard complete-scope layout. Premium-layout-specific design parity remains unimplemented; all template/action entitlement checks retained. |
| F18 duration/minimum warnings | FIXED | >8-hour crew-day warning and override-below-minimum warning. `remediation.test.ts`. |
| F19 hazard prompts/audit | DEFERRED WITH RATIONALE | Explicit hoarding/mold/fluids/sharps/pests prompt added, client stops and server literal rejects hazards. Persisted audited capability attestation remains future work; no regulated work is approved. |
| F20 condition wording | FIXED | Internal condition not printed in customer property summary; snapshots verify resulting copy. |
| F21 turnover naming | FIXED | New version uses Vacation rental turnover service agreement. Historical v1 labels preserved with its version. |
| F22 repeated frequency/signature | FIXED | One scope schedule line, scope bullets without repetitive suffix; acceptance signatures and instruction separated. Customer snapshots and turnover visual. |
| F23 malformed fences | FIXED | Guarded JSON parsing with graceful malformed-block fallback; explicit invalid/null block tests. |
| F24 email hosted Chromium | STILL BLOCKED | Existing cookie-forwarding tests remain passing. No authenticated test-transport send, serverless Chromium validation or hosted end-to-end execution. |

## Claude acceptance tests 3.1–3.18

| Section | Evidence / gap |
|---|---|
| 3.1 | Five non-demo UI tests plus inline invalid-input test. |
| 3.2 | NOT EXECUTED: authenticated staging/time-to-save/mobile device. |
| 3.3 | Five full customer-copy snapshots and forbidden-string assertions. |
| 3.4 | Sentinel never in generated content/common rendered text; all export/email/public end-to-end remains staging. |
| 3.5 | Next-day/equal clock, vacant, per-turn, linen/bed defaults tests and artifacts. |
| 3.6 | Actual v1 remains viewable/composable/editable after v2 registration; v1 strategy equality test. A future v3 must extend explicit dispatch, not replace retained modules. |
| 3.7 | Actual status-only PUT retains artificial historical price/text despite current model. |
| 3.8–3.9 | Static privilege/projection/counter tests only. Full anon/owner/other/service-role matrix NOT EXECUTED. |
| 3.10 | Five legacy price and 15 scope goldens captured from a4deb7c; legacy production PDF/generate/export fixtures still absent. |
| 3.11 | Fixed-area room sensitivity test plus printed labor formula. |
| 3.12 | Initial/deep and ongoing recurring prices separately asserted. |
| 3.13 | Demo save UI and server normalization rejection; demo analytics excluded/tagged. |
| 3.14 | Preview/regeneration distinction, profile event, client first-value taxonomy assertions; checkout-segment join not implemented. |
| 3.15 | Below-minimum warning; existing API reopen/override persistence and privacy assertions. |
| 3.16 | >8-hour duration warning tested. |
| 3.17 | NOT EXECUTED: 3–5 residential and 2–3 turnover operators; low/normal/high jobs; record actual bids and accept/reject. Suggested decision rule: median deviation within ±15% after entering real business costs, plus no unsafe underestimates; founder/operator must approve rule. |
| 3.18 | Offline/403/422 input-retention and readable alert component tests; real-device testing NOT EXECUTED. |

## Reproduction and remaining gate

Run `./node_modules/.bin/jest --runInBand`, `./node_modules/.bin/tsc --noEmit`, and the build command in the original packet (local placeholders). Then `node quality/service-catalog-remediation/render.cjs` and `node quality/service-catalog-remediation/capture.cjs`. Capture blocks all non-file network requests.

The proposed migration must be reviewed with current target grants/functions and executed on an isolated synthetic clone before any live-system authorization. Confirm raw `anon` SELECT of `service_specific_data` fails, unknown tokens return no data, valid token reads exclude costs/entry details, counters increment atomically, owners/other users preserve isolation, version changes fail and all legacy service types still work. Verify time/scroll/open metrics after revoking raw tracking grants. Confirm public download routing and all export/email paths separately.

Failure history: first Git branch write hit shared-metadata sandbox restrictions and succeeded on an authorized retry; first build could not resolve Google Fonts and succeeded with network access; sandbox Chrome crashed and succeeded with local-only capture under the appropriate process permissions. Initial baseline script omitted required synthetic pricing settings; corrected before recording goldens. Test updates reflect intentional per-visit headlines, new warning labels and analytics events; no assertions were disabled. Local dependencies are reused from the reviewed worktree through an ignored node_modules symlink.

No release, deployment, marketing or founder-acceptance claim follows from this packet. Claude should re-review the candidate and specifically challenge F3/F7/F8 and the deferred findings before a bounded infrastructure handoff.
