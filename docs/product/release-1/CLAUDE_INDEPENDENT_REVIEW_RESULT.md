# Release 1: Claude's independent review result

Reviewer: Claude (independent product, UX, conversion and release-safety review)
Date: 2026-09-22 Pacific
Scope: Veltex AI Release 1, all-cleaning-services expansion. Covers the residential and turnover packs, the catalog foundation, the migration and the evidence packet.
Worktree reviewed: `/Users/Antho/.codex/worktrees/2d1f/veltexai_SaaS` (branch claimed: `codex/all-cleaning-release-1`, commit claimed: `4b7310c`, base claimed: `a4deb7c`)
Mode: read-only. The only file written is this one.

### What was and was not independently verified

| Claim | Status | How |
|---|---|---|
| Implementation commit `4b7310c` and base `a4deb7c` | **Not verified** | The worktree's `.git` points to `/Users/Antho/Documents/GitHub/veltexai_SaaS/.git/worktrees/veltexai_SaaS2`, which is outside the folder granted to this review. I could not run `git log` or `git diff`. The branch contents I reviewed are the files on disk. |
| 418 tests / 51 suites passed | **The log agrees; I did not re-run the suite** | `quality/service-catalog-release-1/test-results.log` shows 51/51 suites and 418/418 tests. My own `jest` run could not start: the `node_modules` directory holds macOS SWC binaries only, and the Linux review VM has none. |
| TypeScript and production build | **The logs agree; I did not re-run them** | `typecheck-results.log` and `build-results.log` |
| Evidence file integrity | **Verified** | All 29 entries in `SHA256SUMS.json` match the files on disk. |
| Pricing math | **Independently executed** | I transpiled `schema.ts`, `catalog.ts` and `pricing.ts` into a scratch directory outside the repo and ran scenario probes (results below). |
| Layout: 8 captures, no horizontal overflow | **Verified as described, but the evidence is weak** | All 8 captures are `demo=1` static SSR fixtures with `access` pre-filled (`render.cjs:34`). None shows the real, non-demo state (see F1). |
| Migration and RLS safety | **Not executable here** | Reviewed by reading only. It has not been run against any Postgres, as the packet itself says. |

---

## 1. Verdict: **FAIL** (for release)

The architecture is sound and worth keeping. It has a separate segment and job type, a versioned snapshot, server-side recomposition, deterministic no-AI pricing, a hazard literal, internal-cost stripping in the public view, and an additive migration with owner-only RLS. The compatibility boundary is careful.

It is not releasable as-is, for four reasons:

1. The primary first-value path is broken for every real user. The workbench shows no suggested price on load for any of the five packs (F1).
2. The customer-facing proposal tells the homeowner or host that the price is only a "suggested price" pending "operator review", and that Veltex does not guarantee it. This undercuts the operator at the moment of sale. It also exposes access details, such as lockbox arrangements, on a shareable tracked link and in the PDF (F2, F3).
3. Airbnb/turnover is modeled and presented as a "One-time service" of an "occupied" property. A host buys a per-turn service agreement, so this is wrong (F4).
4. The packet's own blockers remain open: the migration and RLS have not been executed, there is no signed-in staging acceptance, and no operator has validated the rates.

Once the blockers in section 5 are closed, this can move to CONDITIONAL PASS without re-architecture. Most fixes are small copy or default changes.

No regulated or biohazard service is approved by this review. Scope was not expanded.

---

## 2. Severity-ranked findings

Severity scale: **Critical** blocks release. **High** must be fixed before marketing or before the first real customer proposal. **Medium** should be fixed in Release 1.x. **Low** is polish.

### Critical

**F1: A real (non-demo) job shows no suggested price, scenarios or cost breakdown until the operator types into "Access", and the UI never says so.**
- `features/service-catalog/catalog.ts:39`: `defaultJob()` sets `access: ''`.
- `features/service-catalog/schema.ts:50`: `access: z.string().trim().min(1)`.
- `features/service-catalog/pricing.ts:7`: `estimateJob` runs `jobSchema.parse`, so it throws on the empty access field.
- `features/service-catalog/components/workbench.tsx:41` swallows the error (`catch { /* Field validation is surfaced when preparing the draft. */ }`). Line 98 then hides the whole price panel (`{estimate && !hazard && …}`).
- Reproduced: `estimateJob(defaultJob(id))` throws `access: String must contain at least 1 character(s)` for all five packs.
- **This is hidden by the evidence.** Every test and fixture injects access: `catalog.test.ts:9` (`valid()`), `preview.test.ts` (`input()`), `render.cjs:34`, and all five workbench tests render `<CatalogWorkbench demo />`, which pre-fills access at `workbench.tsx:23`. No test renders the non-demo workbench.
- The same silent hiding happens for any transiently invalid value. Clearing a number field becomes `0` because of `Number('')` at `workbench.tsx:67` and `cost-fields.tsx:12`, and the price panel then disappears with no inline message.
- Impact: this is the "aha" moment in the product promise (see and defend the price). A new operator opens the workbench from Quick Proposal and sees a form with no number. Before touching Access, the override checkbox pre-fills $120 (`workbench.tsx:105`, fallback `?? 120`).

**F2: The customer-facing proposal undermines the operator's price and brand.**
- Evidence: `recurring_standard-proposal.pdf` and `airbnb_turnover-proposal.pdf` (extracted text), plus `proposal.ts:32, 58–59, 61, 66–68` and `catalog.ts:16`.
- The customer reads:
  - "This scope and **suggested price are subject to operator review**" (cover letter).
  - "**Suggested price**: $207.68 per visit".
  - "**No price is guaranteed by Veltex AI**".
  - Terms opening with "Suggested price requires operator review".
  - "**Operator** signature".
  - "Operator notes: No additional terms specified."
  - Footer (`components/catalog-document.tsx:14`): "Prepared with Veltex AI · **Suggested pricing requires operator review**". This shows on the public tracked view too, because `public-proposal-view.tsx:213` does not pass `showPoweredBy`.
- The "not a guaranteed bid" rule in the master plan protects the *operator*, inside the workbench. It is not text for the *end customer*. A homeowner seeing "subject to operator review" and "not guaranteed" will read it as a draft, or as a price open to haggling. The word "operator" also means nothing to a homeowner.
- Fix: keep all disclaimers in the workbench and the pre-save review. In the saved customer document, say "Price" or "Your price", "[Company] signature", and drop the Veltex disclaimer. Only print "Operator notes" when notes exist, under a customer-friendly heading.

### High

**F3: Access and entry details go into the customer document, the PDF and the shareable tracked link.**
- `proposal.ts:40` (`Access: ${plain(job.access)}.`). The field label, "Access, parking, stairs and scheduling" (`workbench.tsx:86`), invites entry details. The demo text is "Host provides lockbox access". Operators routinely type lockbox, gate or alarm codes in fields like this.
- The public view strips `service_specific_data` (`app/view/[trackingId]/page.tsx:79–85`), but the access text survives inside `generated_content`. Anyone the link or PDF is forwarded to can see it.
- Also a small bug: the text renders with a double period, "parking beside entrance.." (PDF line 22).
- Fix: split the field into "Internal access notes (never shown to customer)" and optional customer-facing scheduling text. Warn when the text looks like a code (for example, 3–8 digits near "code", "lockbox", "gate" or "alarm").

**F4: Turnover is modeled as a one-time job for an occupied home.**
- `catalog.ts:24` sets `frequencies: ['one-time']`. `schema.ts:74–75` forces one-time for every non-recurring pack. `catalog.ts:38` defaults occupancy to `occupied` for turnover.
- The Airbnb PDF shows "— One-time service" on every scope line, "occupied, normal condition", "This is a one-time job total" and "No automatic renewal for one-time jobs".
- A turnover proposal is a **per-turn rate agreement** covering expected turns per month, same-day turn handling, linen par levels, reporting and damage timelines. The current document reads like a single house clean. It will not persuade a host or property manager, and it misstates the relationship.
- Also, check-in must be later than checkout on the same day (`schema.ts:72–73`). A next-day check-in, or checkout and check-in at the same time, is rejected outright ("Check-in must follow checkout on the same day"). Those are common cases.

**F5: The recurring proposal headlines a monthly "planning" total that the customer will read as the price, and it uses unrounded amounts with statistical wording.**
- `recurring_standard-proposal.pdf`: the bold "**Total before any applicable tax: $449.97**" is the monthly planning figure. The per-visit price, $207.68, appears only in a later sentence with "based on 2.167 average visits per month".
- The pricing table's field is `pricePerMonth` even for one-time jobs (`proposal.ts:30`).
- Residential customers buy per visit. Odd-cent prices ($449.97, $207.68) look machine-generated.
- Terms print "No automatic renewal for one-time jobs" on a recurring proposal (`catalog.ts:16`). There is no recurring cancellation, notice, skip, reschedule or lockout policy.
- Fix: headline the per-visit price. Show the monthly estimate as secondary text. Round to an operator-chosen increment (for example $5). Use frequency-specific terms.

**F6: Bedrooms and bathrooms barely affect price, so the operator cannot defend quotes the way residential customers compare them.**
- `pricing.ts:14`: hours are the greater of sq ft ÷ production rate or 0.25 h per bedroom + 0.6 h per bathroom. With the 450–500 sq ft per person-hour defaults, area almost always wins.
- Probe: a 1,500 sq ft standard clean is **$216.29 whether it is 1 bed/1 bath or 3 bed/2 bath**. 5 bed/4 bath only reaches $231.63.
- Many homeowners do not know their square footage. The industry sells by bed/bath, plus levels, kitchens and flooring. A 1-bathroom and a 2-bathroom quote coming out identical will be questioned immediately.
- Also missing: levels/stairs, kitchen count, flooring mix, clutter (distinct from soil level), time since last professional clean, number of occupants or kids, and number or shedding level of pets. Pets are a flat 0.25 h (`pricing.ts:12`).

**F7: Normalizing on save reprices and rewrites stored documents, and bumping the catalog version will make every existing catalog proposal uneditable.**
- `proposal.ts:95–99` (`normalizeCatalogProposal`) fully recomposes content and price from the *current* code on every POST or PUT. `app/api/proposals/[id]/route.ts:125–129` applies it to any update of a catalog proposal, including status-only changes.
- The pricing strategy is not version-bound to the code: `residential_labor_v1` is a label, not a frozen function. So the first bug fix to `pricing.ts` will silently change the amount on an already-sent proposal the next time the operator touches it. This contradicts the comment at `proposal.ts:109` ("Never recalculate historical documents").
- Conversely, `schema.ts:38` (`catalogVersion: z.literal(CATALOG_VERSION)`) plus the DB guard (`migration:48–51`, "Catalog version changes require a new proposal") mean that the day `CATALOG_VERSION` is bumped, every v1 proposal fails with 422 on edit, status change or reopen.
- Fix: dispatch by version (keep the v1 schema and strategy frozen side by side), and skip recomposition when job inputs are unchanged. This must be fixed before the first post-release pricing change. Design it now.

**F8: The migration trigger will reject any update to a catalog proposal made from an anon (non-authenticated) context, and RLS on `proposals` for public viewing is unverified.**
- `guard_proposal_catalog_version()` (`migration:41–61`) is `SECURITY INVOKER`. It checks `exists (select 1 from service_catalog_versions …)`. The only read policy on that table is `to authenticated` (`migration:16–17`).
- Any anon-role update to a catalog proposal therefore raises "Invalid catalog snapshot". The public page already runs such updates: `app/view/[trackingId]/page.tsx:118–131` bumps `view_count`, and `app/api/tracking/view/[trackingId]/route.ts:66–78` does the same.
- Today that update is either blocked by owner-only RLS (so view counts silently never increment), or, if production has an anon policy on `proposals` not present in the repo migrations, it is rejected by the trigger. Either way view tracking for catalog proposals is broken or untested.
- If such an anon SELECT policy exists in production, then the page-level stripping of wages and override reasons is cosmetic, because the anon key can read `service_specific_data` directly through PostgREST.
- Fix: make the guard `SECURITY DEFINER` with a pinned `search_path`, or skip the check when only counters change. Verify the actual production policies on `proposals` before release.

**F9: Customer-facing text cannot be edited.**
- The only customer-facing free text is `operatorNotes`, printed as one line under Terms. `plain()` strips newlines at `proposal.ts:13`. Saving always regenerates `generated_content` (see F7), and the old editors redirect catalog jobs to the workbench (`proposal-actions.tsx:104,114`).
- The master plan requires "editable customer-facing language". Operators cannot reword the cover letter, remove a scope line, or add a custom inclusion or add-on price.

### Medium

**F10: Scope content is thin and not specific to each pack.**
- `catalog.ts:13, 18–24`. Move-in/out excludes appliance interiors unless selected, and defaults to 0 appliances. Most move-out customers and landlords expect oven and fridge interiors.
- Deep clean lacks the standard industry items: light switches and door frames, window sills and tracks, blinds, vent covers, hand-wiping cabinet fronts, and baseboards throughout.
- Turnover lacks common items: bed count and sizes, linen par, consumables restock list, trash/recycling removal, dishwasher cycle, hot tub or patio, photo report to host, lost-and-found, and a damage-report deadline aligned to platform claim windows.
- Documents have no proposal date, valid-until date, proposal number, company phone, email, license or insurance, payment timing, re-clean or satisfaction policy, or lockout/cancellation fee.

**F11: Recurring has no initial-clean pathway.**
- `recurring_standard` prices every visit from normal condition × recurrence. Operators almost always price the first recurring visit as a deep or initial clean.
- Without this, a new recurring customer's first visit is under-priced by roughly 30–50% (compare the probe: $207.68 recurring vs $313.57 first/deep for the same home).
- The recurring discount is also small: weekly $200.48 vs one-time standard $216.29, about 7%. This needs operator validation.

**F12: Two competing residential pricing paths.**
- Quick Proposal still offers the legacy residential templates (`residential_recurring`, `residential_deep_clean`, `move_out_turnover`) on legacy pricing. The new workbench is only a small underlined link card (`quick-proposal-flow.tsx:464–467`).
- The same home can get two different prices depending on which link the operator clicks.
- `adaptLegacy` (`catalog.ts:46`) maps those templates to catalog job types, but it is **never called in application code**. It is referenced only by tests, so the "backward-compatible mapping" deliverable is test-only.

**F13: Onboarding is not segment-aware.**
- `qualification-card.tsx:51` already captures Business type (Residential / Commercial / Both / Specialty). It neither routes residential operators to the workbench nor seeds `business_service_profiles.markets`. There is no "short-term rental" option.
- The master plan lists "segment-aware onboarding and quick proposal routes" in Release 1. Only static links were added.

**F14: Mobile path to value.**
- `recurring_standard-workbench-390.png` (3572 px tall): the price sits roughly 7 screens down, below 11 cost inputs. The only price summary is at the bottom.
- Validation errors appear as raw Zod paths, e.g. `job.access: String must contain at least 1 character(s)` (`workbench.tsx:48`).
- Save failures show only "Invalid catalog or proposal inputs" (`app/api/proposals/route.ts:399`). The `details` are discarded (`workbench.tsx:62`).
- Changing job type resets size, rooms and access (`workbench.tsx:77`). This is easy to do by accident when moving from standard to deep.
- Frequency options show raw values ("bi-weekly", "1x-month"; `workbench.tsx:82`).

**F15: Analytics can't separate qualified activation from noise.**
- `preview/route.ts:26–27` emits `proposal_generate_succeeded` with a random ID on every "Prepare / regenerate" click, including regeneration of existing proposals.
- Demo jobs (`demo=1`, "Sample customer") are neither flagged nor blocked from saving. They count as `first_proposal`/`proposal_saved` and use up quota.
- There is no `workbench_viewed`, `estimate_visible`, `validation_failed`, `profile_saved` or `demo_started` event. So F1-type drop-off would be invisible.
- Checkout and qualification carry no segment. `dashboard/page.tsx:92` sums `price_range.high`, which mixes monthly recurring amounts with one-time job totals.

**F16: Business profile choices are informational only.** Selected services don't filter the workbench job list. The equipment list feeds nothing. Default markets are `['residential']` even for a commercial operator (`business-profile.tsx:10`). Operators will expect these settings to do something.

**F17: Plain document for paid-design users.** Catalog proposals ignore the selected premium template and render one Arial layout (`template-renderer.tsx:31`, `print/proposals/[id]/page.tsx:29–31`). There is no logo, and no company contact block beyond the name. Users entitled to premium designs get a visible downgrade on exactly the new, marketed vertical.

**F18: No elapsed-time sanity check outside turnover.** A 4,500 sq ft heavy deep clean with pets comes to 24.4 person-hours and 12.2 elapsed hours for a 2-person crew, with no multi-day or crew-size warning. Heavy condition is a flat ×1.5. An override below the minimum charge raises no warning (`pricing.ts:33` only compares against cost).

### Low

- **F19:** The hazard checkbox is client-only (`workbench.tsx:28,87`). The server always requires `regulatedHazards:false`, and the attestation is neither persisted nor audited. That is acceptable for Release 1, but there are no prompts for hoarding, mold, bodily fluids or pests beyond the exclusion text.
- **F20:** The customer document prints condition ("heavy condition"). Some homeowners will find that off-putting. Consider "detailed first visit" wording.
- **F21:** "Airbnb" is used in product labels and the document title. Nominative use is usually fine, but "Vacation rental / Airbnb-style turnover" reduces trademark exposure in marketing.
- **F22:** Every scope row repeats its frequency ("— Every two weeks"). The acceptance block renders as a run-on line ("Date: __________ Confirm the scope…", PDF p.1–2).
- **F23:** `catalogDocumentText` calls `JSON.parse` without a guard (`document.ts`). A malformed stored fenced block would crash print, public view and export. The content is server-composed, so the risk is low.
- **F24:** Email PDF helper: the session-cookie forwarding fix is sound in unit tests. On Vercel serverless, Playwright/Chromium availability is not evidenced (pre-existing), and the email path was not exercised end-to-end.

### Confirmed strengths (checked, keep)

- Segment is kept separate from job type, with a server-validated pairing (`schema.ts:68–69`).
- Client quotes are never trusted: the server recomposes, and a tampering test covers it (`catalog.test.ts`, "server normalization replaces forged…").
- The math is correct as described: burden → direct → overhead on direct → price = cost ÷ (1 − margin) → minimum floor. Crew size changes duration only. The test at `catalog.test.ts` checks $200 from $150 cost at 25%.
- `price_range.low == high` stops legacy midpoint renderers from inventing a different quote.
- The public view strips wages, scenarios and the override reason (subject to F8's RLS caveat).
- Analytics carry taxonomy without PII (test asserts it).
- No paid AI call for new packs.
- The migration is additive, with owner-only RLS on profiles and a reporting view revoked from anon/authenticated.
- The packet is candid about its own blockers and about the static nature of the fixtures.

---

## 3. Missing acceptance tests

Add these to the existing staging checklist in `MIGRATION_AND_STAGING.md`.

1. **Non-demo workbench renders a price on first load** for each of the five packs, with no access text (currently fails, F1). Test that a transiently invalid field shows an inline reason instead of hiding the panel.
2. Signed-in end-to-end on staging, at 390 px and on desktop, **without `demo=1`**: from Quick Proposal link through first save, then time-to-first-price and taps-to-first-save.
3. Customer-document copy snapshot: assert that the saved document contains none of "operator review", "Suggested price", "not guaranteed", "Operator notes: No additional", "2.167", and has no double punctuation.
4. Access privacy: a test code such as "lockbox 4821" never appears in `generated_content`, the print page, jsPDF export, email attachment or public view HTML.
5. Turnover: next-day check-in, identical checkout/check-in times, `occupancy` default = vacant, per-turn/monthly-turn presentation, linen par/bed count, and a same-day-turn flag.
6. Version upgrade: register a hypothetical `2026-10-01.1` catalog in a test, then confirm a v1 proposal still opens, changes status, prints and saves without repricing (F7).
7. Pricing-code drift: change a pricing constant, then do a status-only PUT on an existing proposal; the stored price and content must stay unchanged.
8. Anon view path on staging RLS: open the tracked link while signed out and confirm the document renders, `view_count` and `last_viewed_at` update without trigger errors, and the anon key cannot select `proposals.service_specific_data` through REST.
9. Trigger under each role: anon, authenticated owner, other user, and service_role.
10. Legacy golden baselines: the five legacy service types and 15 quick templates. Render and export the PDF and compare totals and content to production fixtures captured from `a4deb7c`. Currently there is **no legacy render or PDF artifact** in the evidence, and the `adaptLegacy` tests do not exercise runtime paths.
11. Bed/bath sensitivity: going from 1 to 2 bathrooms at a fixed area changes hours or price (after F6 is fixed), and the change is explained in the breakdown.
12. Recurring initial visit priced separately from ongoing visits (after F11).
13. Demo safety: saving a demo placeholder is blocked or flagged, and demo events are tagged and excluded from activation metrics.
14. Analytics: exactly one generation event per new proposal (or a distinct `proposal_regenerated`); workbench-view, validation-failed and profile-saved events; checkout joined to segment.
15. Override below the minimum charge warns, and the override persists across reopen without leaking to the customer.
16. Multi-day or excessive elapsed-hours warning for large or heavy jobs.
17. Real-user usability pass: 3–5 residential operators and 2–3 turnover operators each price a low, normal and high job, with the result compared to their actual bids. This is the packet's domain-validation blocker; make it a measurable accept/reject rule, for example median deviation ≤ ±15% after profile costs are entered.
18. Mobile error states on a real device: the offline banner, 403 quota and 422 validation messages must be readable and positioned near the action.

---

## 4. Conversion and positioning recommendations

1. **Lead with the number.** On mobile, put a compact sticky price summary (working price, margin and the top two drivers) at the top of the workbench. Collapse the 11 cost fields under "Your costs (from business profile)". The aha moment is "here's my price and why", and it should be visible within about 10 seconds, before any client details.
2. **Separate getting a price from making a proposal.** Allow pricing without client name, email or phone. Ask for customer details only at "Prepare proposal". Today `globalInputsSchema` requires email and phone before any draft.
3. **Price the way customers ask.** Make bed/bath (plus levels and condition) the primary input and square footage optional or validating. Show "why this price" in plain words: "3 bed / 2 bath, normal condition, 2 cleaners ≈ 1.6 hours on site".
4. **Speak as the operator's company, not as software.** The customer document should read like a proposal from "[Company]": a price, what's included, what's not, what the customer needs to do, how to book, and valid-until. Keep every Veltex caveat operator-side.
5. **Reposition turnover** as "Turnover service agreement": a per-turn rate, expected turns per month, same-day turn policy, linen and consumables handling, photo and damage reporting. Property managers and hosts are a B2B buyer who responds to reliability and reporting, not square footage.
6. **Route by segment at signup.** Use the existing Business-type answer to send residential and short-term-rental operators straight to the workbench (demo pre-filled, clearly labeled) and to pre-seed the business profile markets. Add a "Vacation rental / Airbnb" option.
7. **One residential path.** Retire or redirect the legacy residential quick templates to the workbench so price is consistent, and keep legacy records read-only-compatible. Communicate the change in the UI ("Residential jobs now use the new price workbench").
8. **Add "Initial clean + recurring" as a two-price proposal** (the most common residential sale). It raises first-visit revenue and matches how operators sell.
9. **Offer add-ons as priced checkboxes** (inside oven, fridge, interior windows, blinds, baseboards, laundry and fold, cabinets). These are high-margin, easy upsells for residential operators and make the proposal feel complete.
10. **Missing job types to evaluate** (not added by this review; keep behind Release 1.x or 2 gating): hourly or "time-block" maid service; post-party/event clean; apartment make-ready and unit turns for property managers (volume B2B); vacation-rental mid-stay refresh; pre-listing / real-estate showing clean; add-on-only visits; light post-renovation dust (distinct from Release 2 post-construction). Hoarding and biohazard stay excluded until Release 4.
11. **Marketing truthfulness.** Keep public pages unchanged, as the packet does. No live claim about residential or turnover support until F1–F6 are fixed and operator validation passes. When launched, say "residential and vacation-rental turnover proposals with transparent suggested pricing", not "all cleaning services". Release 2–4 verticals are not yet supported and must not appear in ads.
12. **Protect the upgrade story.** Either give catalog proposals the premium design, logo and branding that paid users already pay for, or clearly mark the catalog layout as the new standard. Don't let the new vertical look like a downgrade to paying users.

---

## 5. Explicit release blockers

Release (including a staging "go" for founder acceptance) should not proceed until all of these are closed.

1. **F1:** the non-demo workbench shows the price on load, with inline validation. Test added.
2. **F2:** "suggested", "operator review", "not guaranteed", the Veltex caveat and the "Operator" wording are removed from all customer-facing surfaces: document, print, jsPDF, email attachment and public view.
3. **F3:** access and entry details are no longer written into the customer document. There is a separate internal field.
4. **F4:** turnover is presented per turn, not as a one-time service. Occupancy defaults to vacant for turnover, and next-day or equal-time check-in is supported or explicitly handled.
5. **F5:** the per-visit price is the headline figure. Recurring terms no longer say "No automatic renewal for one-time jobs". Prices are rounded.
6. **F7:** there is a version- and strategy-frozen normalization plan, and status-only updates do not recompose. At minimum, test #7 in section 3 must pass before the first pricing change after release; the design decision is required before launch.
7. **F8 and packet blocker 1:** the migration has run on isolated staging, with the RLS and trigger matrix (tests 8–9) passing, anon view-count behaviour resolved, and production `proposals` policies confirmed.
8. **Packet blocker 3:** full signed-in staging acceptance in `MIGRATION_AND_STAGING.md`, plus legacy golden baselines (test 10).
9. **Packet blocker 2 and F6:** residential and turnover operator validation of rates, bed/bath sensitivity and inclusions, with a recorded accept/reject result (test 17).
10. **Commit and base verification:** `4b7310c` on `codex/all-cleaning-release-1` and its ancestry from `a4deb7c` must be confirmed by Mohamed or Codex. This review could not access the git metadata.
11. Founder acceptance (Anthony) and the separate deployment authorization.

**Can follow after release** (tracked, not blocking): F9–F18 and F19–F24. F9 (editable text), F11 (initial clean), F12 (single residential path) and F13 (segment routing) should land before any paid acquisition for the residential or turnover segments.

---

## 6. Confirmation of no deployment, publication, spend or live mutation

- No deployment, Vercel alias change, Supabase migration or database connection was performed.
- Nothing was published, marketed or sent (no email or messages). No Stripe, OpenAI or other paid API calls, and no spend.
- No implementation file was modified. The only file written in the worktree is `docs/product/release-1/CLAUDE_INDEPENDENT_REVIEW_RESULT.md`.
- Pricing probes ran on transpiled copies in a scratch directory outside the repository. An attempted local `jest` run failed at startup (missing Linux SWC binary) before executing any tests. It wrote no repository files. It may have tried to fetch a compiler binary into a user-level cache outside the repo, and that fetch failed.
