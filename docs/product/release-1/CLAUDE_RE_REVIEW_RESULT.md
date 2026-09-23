# Release 1 remediation re-review (round 2): Claude's result

Reviewer: Claude, independent review
Date: 2026-09-22 Pacific
Candidate: `5d9fa9d498fd28f88f4701fbb5910398a7a4890e` on `codex/release-1-remediation`, base `4b7310c`
Inputs:
- The narrow ZIP bundle (65 files). All 65 `MANIFEST.json` SHA-256 hashes match.
- My round-1 review (F1–F24).
- The master plan, `REMEDIATION_EVIDENCE.md` and the `MIGRATION_AND_STAGING.md` addendum.
- The previously reviewed `4b7310c` worktree, used read-only as base context.

Mode: read-only. No repository writes and no new folder access. No hosted Supabase, deployment, publication, external messages, paid APIs or spend.

## What I verified independently vs. what is only reported

| Item | Status |
|---|---|
| Bundle integrity | **Verified.** 65/65 manifest hashes match. |
| `versions/v1/catalog.ts` and `versions/v1/pricing.ts` are the frozen `4b7310c` code | **Verified.** Byte-identical, same SHA-256 as the base files. `v1/schema.ts` differs only by relaxing `access` to allow an empty value, as the README declares. |
| Pricing, composition, normalization and document behavior | **Executed independently.** I transpiled the candidate's `features/service-catalog/**` modules and the unchanged base `features/proposals/schemas/proposal.ts` in an isolated scratch directory (zod 3.25.76, the same version as the lockfile), then ran probes. Results are cited below as "probe". |
| 54 suites / 476 tests / 5 snapshots, typecheck and build | **As reported only.** The bundle has no dependencies or logs, and I did not run Jest. |
| `legacy-golden.json` captured from `a4deb7c` | **As reported only.** The file is not in the bundle. |
| RLS, grants, RPC and trigger behavior | **Static reading only.** Nothing was executed. `tracking-boundary.test.ts` is a string match against the SQL text, not execution evidence. |
| 390/1440 visuals | **Inspected.** Recurring workbench at 390, turnover proposal at 390, and turnover PDF text. They are static non-demo fixtures, not authenticated, and not taken on a real device. |

---

## 1. Verdicts

### Local remediation verdict: **CONDITIONAL PASS**

The candidate fixes the round-1 critical problems in the right way:

- A real first load now prices every pack. Probe: recurring $245, standard $245, deep $310, move $300, turnover $280/turn.
- Internal access notes are never written into new customer documents.
- Customer copy is clean: per-visit headline, rounded prices, company signature line, and no Veltex or "operator" caveats in the probed documents.
- The turnover document is a per-turn agreement, with next-day and equal-clock check-in supported.
- Bed and bath counts now move price. Probe at 1,500 sq ft: 1/1 = $205, 3/1 = $225, 3/2 = $245, 3/3 = $270, 5/4 = $315.
- v1 pricing is frozen and dispatched separately. Probe: a v1 turnover prices at $255.59 both through the frozen v1 module and through the v2 dispatch.
- A status-only save keeps the stored text and price. Probe: a stored $999 text survived; forged `generated_content` in an unchanged-job body is ignored.
- Public reads are designed around a token-scoped allowlist RPC.

The pass is conditional because five local defects must be fixed in the next candidate (**R2-1 to R2-5**). One of them (R2-1) reintroduces the round-1 F1 failure, where the price disappears, and blocks real businesses from producing proposals. None of the five needs re-architecture.

### Release verdict: **FAIL (NOT READY)**

On top of R2-1 to R2-5, the external gates are all still open: database, RLS and grant execution; authenticated staging, including email with a test transport and hosted Chromium; operator rate validation; and founder acceptance.

No regulated or biohazard service is approved. Scope was not expanded.

---

## 2. Severity-ranked findings (round 2)

### High

**R2-1: The entry-detail validator matches substrings. It blocks ordinary cleaning language and company names, hides the price, and still lets real codes through.**
- Code: `versions/v2/schema.ts:86–90`. The pattern `/(?:lockbox|gate|alarm|entry|door|access|key|pin|code)/i` has no word boundaries. It runs on `scheduling`, `operatorNotes`, `scopeAdditions`, `coverLetter` and `companyName`.
- Because the check lives in `jobSchema.superRefine`, `estimateJob` throws (`v2/pricing.ts:128`). The sticky price is then replaced by "Review your inputs: Job details: Keep access…" (`workbench.tsx:45, 91`). **Typing a normal word removes the price.** This is the F1 failure mode back again.
- Probe, **rejected**:
  - Company names: "Keystone Cleaning", "Pinnacle Maids", "Gateway Home Care", "Door to Door Cleaning", "Turnkey Cleaning Co", "Spotless Access Cleaning".
  - Scope: "Sweeping and mopping the garage", "Wiping inside kitchen cabinets", "Clean interior doors", "Outdoor patio sweep".
  - Cover letter: "We specialize in accessible homes".
- Probe, **accepted** (codes that get through): "Side entrance combo 4821#", "Garage opener 7391", "Enter via back, #2291".
- The code-detection hint in `workbench.tsx:108` checks only the internal field, where codes belong anyway.
- Fix:
  - Rely on the structural fix. Access is already never composed, so the validator is not needed to protect it.
  - Remove the hard validation from `jobSchema`, and in particular from the `estimateJob` path.
  - At most, show a **non-blocking** customer-prose warning using word boundaries and digit proximity (for example `\b(code|combo|lockbox|gate|alarm|keypad|opener)\b.{0,20}\d{3,8}`).
  - Never validate `companyName`.
  - Add false-positive tests.

**R2-2: v1 jobs are validated by the v2 schema, which breaks the version-retention contract.**
- Code: `versions/v2/schema.ts:39` accepts both version IDs. v2 `superRefine` (including R2-1) therefore applies to v1 jobs through `estimateJob` (`v2/pricing.ts:128`) and `composeCatalogProposal` (`proposal.ts:15`).
- The README says v1 keeps its own schema. In practice only v1 *pricing* is retained. v1 *validation* is now whatever v2 enforces.
- Probe: a v1 job whose `operatorNotes` read "Please close the door on exit" or "Mopping included" is **rejected**. In v1 that field was labelled "Customer-facing scope notes and agreed terms", so ordinary historical proposals will fail in several ways:
  - on reopen, with no price shown;
  - on any input edit, with a 422 error;
  - in `catalogAnalytics`, which returns `{}`.
- Status-only saves still work, because they don't re-parse the job.
- Fix: parse with the schema that matches the stored version (the v1 schema plus the declared access relaxation), then add only version-neutral presentation fields. Add a test that loads real-shaped v1 rows with non-empty notes.

**R2-3: Recomposing a v1 turnover produces a document whose numbers don't agree.**
- Code: `proposal.ts:45, 62, 67` combined with the v1 dispatch in `v2/pricing.ts:129–134` (v1 `visitsPerMonth` = 1).
- Probe: editing any input on a v1 turnover prints all of these together:
  - "Expected turns per month: 4" (default `?? 4`);
  - "Estimated monthly budget: $255.59", which is 1 turn, not 4;
  - "This is a per-turn service agreement".
- The original v1 quote was a single job.
- The same path moves a v1 recurring proposal's `price_range` from the monthly $449.97 to the per-visit $207.68, so dashboard or pipeline totals for historical proposals change on edit.
- Fix: use a composer per version, or suppress v2-only turnover lines and per-turn terms for v1. Test v1 turnover and recurring edits end to end.

**R2-4: The public tracked view still tells the customer the agreement is "one-time" and "residential".**
- Code: `features/proposals/components/public-proposal-view.tsx:173–197`. The Service Details card prints the raw `service_type` and `service_frequency` that the RPC returns (`migration 20260922010000:28–29`). For turnover, the persisted discriminator is `one-time`.
- The migration addendum lists "STR discriminator must not leak one-time", but no test covers the public view component.
- Also, the Client Information card renders an empty email row (`:155–158`), because the RPC deliberately omits `client_email`.
- Fix: for catalog documents, hide or relabel the card (for example "Per turn", "Vacation rental turnover"), and drop empty rows. Add a component test.

**R2-5: The migration hardens `anon` only. Policies for `authenticated` and PUBLIC on `proposals` and `proposal_tracking` are not audited or asserted.**
- Code: `20260922010000_catalog_remediation.sql:13–20`. It drops a policy named "Allow anonymous tracking updates", which exists in **no** repository migration. That is evidence that production policies have drifted from the repo.
- Any free signup gets the `authenticated` role. A leftover permissive policy scoped `TO public` or `authenticated` (for example `USING (true)`) would still expose `service_specific_data`: wages, override reason and access notes.
- Fix: add a `DO` block to the migration that raises an error if any policy on these tables grants SELECT or UPDATE beyond the owner. Add a staging check that a second authenticated user cannot read or update another user's rows directly.

### Medium

**R2-6: Deployment and rollback are now coupled, and neither order is documented.**
- After this migration, the `4b7310c` and production app's public page and tracking routes (anonymous table reads and writes) stop working.
- Rolling the app back without the migration breaks public links. Restoring the anon grants reopens the exposure.
- The addendum covers verification but not ordered deploy or rollback steps for `20260922010000`.

**R2-7: Two analytics problems.**
- *Risky constraint rewrite.* `20260922010000:68–72` drops and re-creates the event-name check against a hard-coded list. If production contains any event name outside that list (the separate 100d-pilot deployment suggests drift is possible), the migration fails. Add the constraint `NOT VALID` or derive it from live data first.
- *Catalog users drop out of the growth funnel.* Previews now emit `catalog_previewed` (`preview/route.ts:26–27`) instead of `proposal_generate_succeeded`. The existing growth funnel counts generators only from `proposal_generate_succeeded` (`041_growth_qualification_and_funnel.sql:54`), so catalog users vanish from that stage. This is part of F15.

**R2-8: The initial clean is not structured data.**
- Its price exists only as a sentence (`proposal.ts:18, 63`). It is absent from:
  - the pricing table and the "Total" line (`:32`);
  - `pricing_data` and `estimateSnapshot`;
  - the sticky summary (`workbench.tsx:91`);
  - analytics and dashboards.
- The customer's first invoice ($310 in the probe) is invisible everywhere except the prose. Persist it in the snapshot and show it as a separate line item.

**R2-9: The signature line ignores the company profile.**
- `companyName` defaults to empty and is not seeded from `company_profiles` (`workbench.tsx:122`). The document therefore signs as "Cleaning company signature" (`proposal.ts:73`) while its header shows the real company name (print path and public view).
- Combined with R2-1, a company named "Keystone" cannot enter its own name.

**R2-10: Changes to tracking behaviour.**
- `record_tracked_view` no longer writes `proposal_views` rows (IP, user agent, referrer, session), so per-view history for owners stops. This is privacy-positive but an unannounced analytics regression. Confirm the owner analytics pages.
- `record_tracking_metric('time')` caps each call at 86,400 s but can be repeated without limit by anyone holding the token.
- Legacy `track_<ms>_<Math.random 9 chars>` tokens (about 29 characters, from a non-cryptographic generator) still satisfy `length>=20` and never expire. Consider an expiry policy or rotation for links sent before this release.

**R2-11: Evidence gaps.**
- The tracking-boundary tests are static string checks.
- The legacy golden input is not in the bundle.
- No test covers the v1 rows that R2-2 and R2-3 break, or false positives from R2-1.

### Low

- **R2-12:** Turnover labels in the workbench still say "Working price … / visit", "Operator price per visit" and "Planning scenarios per visit" (`workbench.tsx:131–136`). Clearing a turnover number field becomes `0` and shows a generic "Job details" error (`:116`, and `fieldLabels` at `:44` lacks the turnover keys). The Clutter select is unstyled (`:111`).
- **R2-13:** A version change or a demo save throws a plain `Error` (`proposal.ts:104, 107`), so the routes return 500 "Internal server error" instead of 422 with a readable message.
- **R2-14:** Money is formatted without thousands separators ("$1120.00", `proposal.ts:12`). The default cover letter lacks an article ("We propose vacation rental turnover service agreement for…").
- **R2-15:** The residential redirect from Quick (`app/dashboard/proposals/quick/page.tsx:63–64`, `quick-proposal-flow.tsx:716–717`) drops `source`, `demoType` and `designTemplateType`, so signup-origin users lose the qualification card and demo context. This relates to F13.
- **R2-16:** Pre-existing and out of scope, noted for the infrastructure handoff: legacy `generated_content` is rendered with `dangerouslySetInnerHTML` on the public page (`public-proposal-view.tsx:215`).

---

## 3. F1–F24 dispositions (challenged)

| ID | Codex status | Claude round-2 status | Basis |
|---|---|---|---|
| F1 first-load price | FIXED | **PARTIAL (regressed by R2-1)** | Defaults price on load (probe). Common words in customer text or company name still hide the price. |
| F2 customer caveats | FIXED | **FIXED, residual R2-9** | Probed documents contain no operator, suggested or Veltex caveats. Signature line is generic. |
| F3 entry privacy | FIXED | **FIXED structurally; validator defective (R2-1)** | `access` is never composed. v1 `Access:` lines are stripped in `document.ts:5` and the RPC (`:30`). Anon enforcement is still unexecuted (F8). |
| F4 turnover agreement | FIXED | **PARTIAL (R2-3, R2-4)** | v2 document is correct. The public card says "one-time". v1 recomposition is inconsistent. |
| F5 headline, rounding, terms | FIXED | **FIXED, residual R2-8, R2-14** | Per-visit headline, rounding and recurring terms verified. |
| F6 price drivers | FIXED | **FIXED locally; operator gate open** | Bath and bed sensitivity probed. Coefficients unvalidated. |
| F7 version drift | FIXED | **PARTIAL (R2-2, R2-3)** | Pricing is frozen and status-only saves are preserved (probe). v1 validation and composition drift. |
| F8 anon, RLS, trigger | STILL BLOCKED | **STILL BLOCKED; add R2-5, R2-6** | Definer guard, allowlist RPC and atomic counters look sound on reading. `authenticated` not audited. Nothing executed. |
| F9 editable language | FIXED | **PARTIAL (R2-1)** | Fields exist. Ordinary wording is rejected. |
| F10 scope completeness | DEFERRED | **DEFERRED (accepted)** | Needs a policy model and operator input. Block paid acquisition until done. |
| F11 initial clean | FIXED | **FIXED, residual R2-8** | Separate $310 vs $245 (probe). Not structured. |
| F12 competing paths | FIXED | **FIXED, residual R2-15** | All 4 residential slugs redirect. |
| F13 segment onboarding | DEFERRED | **DEFERRED (accepted)** | Must land before residential/STR paid acquisition. |
| F14 mobile, errors | FIXED | **PARTIAL (R2-1, R2-12)** | Sticky price and collapsed costs verified in the 390 capture. |
| F15 analytics | DEFERRED | **DEFERRED; add R2-7** | Demo exclusion and regeneration split are good. Legacy funnel continuity is broken. |
| F16 profile behavior | DEFERRED | **DEFERRED (accepted)** | |
| F17 paid design | DEFERRED | **DEFERRED (accepted); R2-9** | Branding and contact restored. Premium parity not done. |
| F18 duration, minimum warnings | FIXED | **FIXED** | Verified in code (`v2/pricing.ts:160–161`) and test. |
| F19 hazard audit | DEFERRED | **DEFERRED (accepted)** | Broader prompt and server literal. No persisted attestation. |
| F20 condition wording | FIXED | **FIXED** | |
| F21 turnover naming | FIXED | **FIXED** | v1 labels retained. |
| F22 repetition, signature | FIXED | **FIXED** | 390 capture and PDF text. |
| F23 malformed fences | FIXED | **FIXED** | Guarded parse (`document.ts:4`). |
| F24 email, hosted Chromium | STILL BLOCKED | **STILL BLOCKED** | |

---

## 4. Missing tests (add to the next candidate)

1. False-positive corpus for customer prose and company name: sweeping, mopping, wiping, doors, outdoor, accessible, keypad, keys, turnkey, Keystone, Pinnacle, Gateway. These must pass, and the price must stay visible. Also a false-negative corpus: combo, opener, `#NNNN`.
2. Real-shaped v1 rows with non-empty `operatorNotes` (for example "close the door"). They must reopen with a price, edit, recompose with v1 pricing, and appear in analytics.
3. v1 turnover edit: no "Expected turns per month" or per-turn terms unless v1 semantics support them, and the monthly budget must match the turns shown. v1 recurring edit: define and test `price_range` semantics.
4. Public view component test for a catalog turnover: no "one-time", no raw `residential`, no empty email row.
5. Migration assertion test (executed on the staging clone): no non-owner policies on `proposals` or `proposal_tracking` for `authenticated` or PUBLIC. A second authenticated user cannot read another user's `service_specific_data`.
6. `record_tracked_view` and metrics tested against real legacy `track_…` tokens, with tracking disabled, with concurrent calls, and with repeated time inflation.
7. Initial clean persisted in the snapshot and rendered as a line item. Dashboard value semantics defined.
8. Company-name seeding from `company_profiles`. Signature matches the header.
9. Funnel continuity: the catalog path is still counted by the 041 growth view, or that view is updated. Constraint migration tested against a data set containing unexpected names.
10. Version-change and demo saves return 422 with a readable message.
11. Carried over from round 1, still unexecuted: tests 3.2, 3.8–3.9, 3.17 and 3.18 (authenticated staging, the RLS matrix, operator validation, real-device checks).

## 5. External gates (unperformed; required before release)

1. Run both migrations on an isolated synthetic clone, with the full anon, owner, other-user and service_role matrix, the R2-5 assertion, and concurrent counters.
2. Inventory live production grants, policies, definer functions and funnel event names before writing the final migration.
3. Authenticated staging: create, edit, reopen and status changes for v1 and v2; print; all three PDF paths; email with a test transport; hosted Chromium; public link and download; 390 px and desktop on real devices.
4. Operator validation: 3–5 residential and 2–3 turnover operators, pricing low, normal and high jobs, compared with their real bids. The founder must approve the acceptance rule.
5. Founder acceptance, then a separately authorized deployment with an ordered deploy and rollback plan (R2-6).
6. Mohamed's bounded handoff only after R2-1 to R2-5 close.

## 6. Confirmation

No deployment, publication, hosted Supabase or other live-system access or change, external messages, paid APIs or spend occurred. The implementation was read-only. The ZIP was extracted only into an isolated review workspace. Probes ran on transpiled copies in scratch space. The unchanged base proposal schema file was copied read-only from the previously granted worktree for execution context. Nothing was written to the user's repository in this round. This file is delivered in chat only.
