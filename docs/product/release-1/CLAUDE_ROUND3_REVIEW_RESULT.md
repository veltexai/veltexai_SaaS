# Veltex AI Release 1: round-3 review by Claude

**Candidate:** `9df4073ef3844177323e7da3eaee98bd0b329fec`. Previous candidate `5d9fa9d`; v1 baseline `4b7310c`.
**Date:** 2026-09-22 (Pacific).
**Inputs:**
- The round-3 ZIP: 93 committed files plus START_HERE and MANIFEST. **All 93 hashes match.**
- `ROUND_3_REMEDIATION.md` and my round-2 report.
- Read-only copies of the `4b7310c` migrations from the worktree already shared with this session. No new folder access was requested.

**Boundaries kept:** I made no repository writes and touched no hosted system. Nothing was deployed, published or sent, and nothing was spent.

---

## 0. What I ran vs. what was reported

| Evidence | Source | Result |
|---|---|---|
| Manifest integrity | **Ran** | 93/93 SHA-256 match |
| Frozen v1 `catalog.ts` and `pricing.ts` | **Ran** | Byte-identical to `4b7310c` (`1ed936f8…`, `c8519ca3…`) |
| Bundled base migrations (001, 005, 022, 023, 026, 041) | **Ran** | Identical to the `4b7310c` copies |
| Pricing, composition and normalization (R2-1, R2-2, R2-3, R2-8, R2-13, R2-14) | **Ran** | See section 3 |
| **Database execution** | **Ran, local only** | Postgres 16 in my isolated sandbox. A Supabase-like setup script I wrote approximated `anon`/`authenticated`/`service_role`, `auth.uid()` and default EXECUTE grants. On top of that I applied **all 43 repository migrations** from `4b7310c`, then the release-1 migration, then the round-3 remediation migration. I then ran Codex's `owner-matrix.sql` and my own additional checks, with synthetic users only. |
| 57 suites / 500 tests / 5 snapshots, typecheck, build | Reported by Codex | Not re-run: the bundle has no dependencies |
| 8 layouts at 390/1440 px and 2 PDFs | Reported; I inspected 2 captures and 1 PDF | Recurring workbench (390) and recurring proposal (390, tail) inspected; recurring PDF text extracted |

**Limits of my database run:** it is not Supabase and not staging. My setup script only approximates Supabase's auth schema and grants, and production policies may have drifted from the repo. It is **not** a substitute for the isolated-clone and staging gates. It does prove two things about the SQL as written: it **does not apply against the repository schema**, and once patched, its security logic behaves as designed.

**Correction to my round-2 report:** R2-5 wrongly said "Allow anonymous tracking updates" existed in no repository migration. It is at `023_proposal_tracking.sql:66`, `FOR UPDATE USING (true)`, with no `TO` clause, so it applies to PUBLIC. My error does not change the security need. Before remediation, **any role that holds UPDATE rights, including any signed-in user, could update any tracking row.** Round 3 removes that, and I confirmed it by execution.

---

## 1. Verdicts

### Local remediation verdict: **CONDITIONAL PASS**

The application-code fixes for R2-1 to R2-4 and R2-8 to R2-15 are verified.

- **Ordinary wording keeps prices:** all 13 prose and company-name inputs that failed in round 2 now keep a price.
- **v1 dispatch is real:** old v1 proposals are validated and priced by their own v1 rules.
- **v1 money semantics hold:** edited v1 proposals keep their original amounts.
- **The public turnover card is fixed:** the contradictory Service Details card is gone.

The new owner-policy design also works as intended when executed:

- Restrictive owner gates block cross-owner access.
- A permissive policy injected before migration makes the migration abort and roll back.
- Anonymous raw reads and writes are denied.
- Counters were exact under 40 concurrent calls.

**Condition:** the migration chain does not apply as written against the repository schema. Two independent SQL errors, both confirmed by execution, stop it (R3-1 and R3-2). One new medium pricing defect (R3-4) should be fixed at the same time. None of these needs redesign.

### Release verdict: **FAIL (not approved)**

Release is blocked by:

- R3-1 and R3-2;
- the pre-existing security-definer exposure in R3-3, which must at least be in the infrastructure handoff and decided before release;
- all external gates, which are unperformed: hosted or isolated-clone execution against the real target inventory, authenticated staging including email and hosted PDF, operator validation, and founder acceptance.

No regulated or biohazard service is approved.

---

## 2. New findings (round 3), ranked

### High (release blockers)

**R3-1: The release-1 migration fails. Its view references a column that doesn't exist.**
- `20260922000000_service_catalog_release_1.sql` (the `4b7310c` copy; this file is **not in the round-3 bundle**, so I assume it is unchanged in `9df4073`), line 67: `date_trunc('day', e.created_at …)`.
- `marketing_funnel_events` has `occurred_at`, not `created_at` (`037_marketing_attribution.sql:12–21`). No later migration adds the column.
- **Executed:** `ERROR: column e.created_at does not exist` at line 76. The whole transaction rolls back, so the catalog tables, the version guard and the v1 registry row never exist, and the round-3 migration cannot run after it.
- The original checklist asked to "confirm prior migrations supply … created_at", and nobody resolved it.
- Fix: forward-fix to `occurred_at` (a new migration if any environment already has a partial state). Add an executed migration smoke test to CI.

**R3-2: The round-3 remediation migration fails. The token RPC selects columns that don't exist.**
- `20260922010000_catalog_remediation.sql:69` projects `c.primary_color, c.secondary_color` from `company_profiles`. The repository `company_profiles` table has neither column. Brand colours live in the branding and settings tables (`018`, `022`, `027`).
- SQL functions are validated when they are created. **Executed:** `ERROR: column c.primary_color does not exist` at line 75. The whole migration rolls back.
- `tracking-boundary.test.ts` passed anyway, which is exactly why static SQL string tests are not evidence.
- The pre-existing public page (`company_profiles!inner(… primary_color …)`) likely had the same latent mismatch against the repo schema. Confirm the live schema.
- Fix: project colours from the real branding source, or omit them. Add execution to CI.

**R3-3: Pre-existing anonymous-callable security-definer functions bypass the new owner gates.** This was not introduced by Release 1, but it is release-relevant.
- On the executed clone, with Supabase-style default EXECUTE grants, `anon` can run these `SECURITY DEFINER` functions against **any** user or proposal id:
  - `increment_user_usage(user_uuid)`: it updates or inserts usage rows for trial users, so an anonymous caller can **burn another user's proposal quota**;
  - `get_user_usage_info(user_uuid)`, `get_user_current_usage`, `can_user_create_proposal`: they disclose another user's plan, status and usage;
  - `get_proposal_tracking_stats(proposal_uuid)`: it returns cross-owner view statistics. **Executed:** the "other" user and `anon` both got a result for the owner's proposal. Public tracked links expose proposal ids.
  - There are several others (`is_admin`, `update_template_usage`, `record_*funnel_event`, …).
- The restrictive table gates cannot stop definer functions. `revoke … from public` also does not remove grants made directly to `anon` or `authenticated`, so it needs an explicit `revoke … from anon, authenticated`.
- Fix: inventory every `prosecdef` function. Revoke `anon`/`authenticated` EXECUTE unless the function is intentionally public. Make the rest bind to `auth.uid()` rather than a caller-supplied id. This belongs in the infrastructure handoff with a decision recorded before release.

### Medium

**R3-4: A labour-hours override on a recurring job makes the initial clean cost the same as a regular visit.**
- `proposal.ts:20` and `workbench.tsx` (initial-price block) reuse `job.costs.laborHours` when pricing the initial detailed clean.
- **Executed:** with `laborHours: 3`, the ongoing visit is $205 and the initial clean is also $205. The document still promises baseboards, cabinet fronts, sills, blinds and vents.
- A price override is correctly ignored ($150 ongoing, $310 initial). The hours override is not.
- Fix: drop `laborHours` when pricing the initial clean, or add a separate initial-hours input. Test both.

**R3-5: `owner-matrix.sql` does not cover what it needs to.**
- Missing:
  - another signed-in user inserting or updating tracking rows (the old `USING (true)` path);
  - `anon` or `authenticated` inserting `proposal_views` rows;
  - a full-payload leak scan (it checks only top-level keys, not `generated_content` or cost values);
  - legacy `track_…` tokens;
  - the permissive-policy injection;
  - concurrency;
  - the definer-function inventory (R3-3);
  - `service_role`;
  - an owner positive-write and version-guard check.
- I executed all of these on the local clone. Results are in section 4. Fold them into the matrix so the staging run is complete.

### Low

- **R3-6:** The migration cannot be re-run. **Executed:** the second application fails at `create policy catalog_owner_guard` (already exists). This is acceptable given the "new forward migration per target" rule in the round-3 notes, but add `drop policy if exists`, or document it prominently.
- **R3-7:** A policy that is equivalent but written differently (for example `user_id = auth.uid()` instead of `auth.uid() = user_id`) makes the migration abort. **Executed.** Failing closed is the intended behaviour, but the production inventory must expect it.
- **R3-8:** View history is now written without a viewer IP, so the owner analytics field `unique_viewers` (from `get_proposal_tracking_stats`, based on `viewer_ip`) will always read 0. Relabel the metric or document it.
- **R3-9:** The advisory entry-code check (it only warns and never blocks, which is correct) misses a number *before* the keyword ("Use 4821 on the keypad") and falsely warns on "access 1500 sq ft". **Executed.**
- **R3-10:** Public page metadata still says "View proposal for residential services at <address>" (`app/view/[trackingId]/page.tsx:114`). The RPC payload still carries `service_frequency: one-time`, although it is no longer rendered.
- **R3-11:** When only the company name loads (no saved costs), the workbench still says "Loaded your business cost assumptions."
- **R3-12:** The monthly budget is unrounded ($530.83) next to rounded per-visit prices. This is cosmetic.

---

## 3. Round-2 findings: status after round 3 (challenged)

| ID | Codex claim | Claude status | Evidence |
|---|---|---|---|
| R2-1 prose/company validator | Fixed | **FIXED (executed)** | All 13 inputs rejected in round 2 now price and compose ("Keystone/Pinnacle/Gateway/Door to Door/Turnkey/Spotless Access", "sweeping and mopping", "interior doors", "accessible homes", "keys with concierge"). Advisory warns on combo, opener, `#NNNN` and "Door code 4821". See R3-9 for advisory gaps. |
| R2-2 v1 schema dispatch | Fixed | **FIXED (executed)** | Root `schema.ts` routes `2026-09-22.1` to the frozen v1 schema plus only 6 presentation fields. A v1 job with notes "close the door… Mopping… Key under mat" prices at **$207.68, equal to the frozen v1 result**. Analytics are present (`catalog_version 2026-09-22.1`, `price_basis monthly`). v1 plus `initialClean`, `levels`, `roundingIncrement`, `nextDay` or `expectedTurns` is rejected. |
| R2-3 v1 money semantics | Fixed | **FIXED (executed)** | v1 recurring edit: `price_range` stays at the monthly **$449.97**, `priceBasis: monthly`. v1 turnover edit: "One-time service", "$255.59 per visit… one-time job total", no expected turns, no per-turn terms. Status-only saves keep historical bytes and $449.97. |
| R2-4 public metadata | Fixed | **FIXED (code plus Codex test); minor R3-10** | `public-proposal-view.tsx:173–201` hides the legacy card for catalog documents; the empty email row is gone (`:155–158`). |
| R2-5 ownership policies | Fixed (static) | **Design FIXED and verified on the local clone; blocked by R3-1, R3-2 and R3-3** | Details in section 4 |
| R2-6 deploy/rollback order | Documented | **ACCEPTED as documentation** | Needs execution in staging |
| R2-7 funnel constraint and continuity | Fixed | **FIXED (executed)** | The `NOT VALID` constraint preserved an unknown historical event and rejected a new unknown write. `growth_funnel_daily` keeps the 041 column shape and adds `catalog_previewed`. |
| R2-8 initial clean structured | Fixed | **FIXED, with new defect R3-4** | `pricingLineItems` [$245 per visit, $310 initial]; pricing table line; sticky summary shows it (390 capture). |
| R2-9 company signature | Fixed | **FIXED (code, capture)** | "Example Cleaning Company signature" in the 390 proposal. Minor copy issue R3-11. |
| R2-10 tracking | Partial | **Counters FIXED (executed); R3-8** | 40 concurrent anonymous views gave proposal count 40, tracking count 40 and 40 history rows. Time capped at 86,400 s. Disabled tracking is a no-op (owner matrix). |
| R2-11 tests/evidence | Improved | **IMPROVED; R3-5** | Golden JSON and base schema now included |
| R2-12 turnover units / numeric clearing | Fixed | **FIXED (code)** | |
| R2-13 422 errors | Fixed | **FIXED (executed)** | Demo and version change now throw `ZodError` |
| R2-14 formatting | Fixed | **FIXED (executed)** | "$1,120.00"; "We propose the following service: …" |
| R2-15 context preservation | Fixed | **FIXED (code)** | `catalogPath` keeps source, demo and design. The category page restores `QualificationCard` and accessible `templateId`. |
| R2-16 legacy HTML | Noted | **Still out of scope; carry to handoff** | |

Earlier deferrals are unchanged: F10, F13, F15 (segment checkout attribution), F16, F17 and F19 accepted; F8 and F24 open.

---

## 4. Security execution detail (local clone; synthetic users)

Setup: 43 base migrations applied cleanly. The release-1 migration and the remediation migration each needed **one scratch-only patch** to get past R3-1 and R3-2 (`e.created_at` → `e.occurred_at`; colours → `null`). Everything below ran on that patched chain.

- **Policy inventory after migration:**
  - The existing owner policies for `proposals` and `proposal_tracking` deparse to exactly the guard expression, so the check loop passed.
  - Restrictive `catalog_owner_guard` exists on `proposals`, `proposal_tracking` and `proposal_views`.
  - The anonymous tracking and view-insert policies are dropped.
- **Injection test:** I added `create policy leak … for select to authenticated using (true)` before migration. The migration aborted with "Unreviewed policy proposals.leak". **Nothing committed**: 0 guard policies and no v2 registry row.
- **Codex `owner-matrix.sql`:** **passed** end to end (owner read, cross-owner read and update blocked, anonymous raw select denied, token read, unknown token, enabled view, 86,400 s cap, disabled tracking).
- **My additional checks:**
  - **anon:** SELECT/UPDATE on `proposal_tracking`, INSERT/SELECT on `proposal_views`, and SELECT on `proposals` are all denied. A short token returns NULL. A legacy `track_<ms>_<rand>` token resolves.
  - **anon payload leak scan:** the full RPC JSON contains no access sentinel, wage, client email, cost, `estimateSnapshot` or `catalogJob`. The stored `Access:` line is removed from `generated_content`.
  - **Another signed-in user:** updating tracking changes **0 rows** (the old `USING (true)` hole is closed). Inserting tracking for the owner's proposal violates RLS. Inserting a view is denied. Deleting the owner's proposal changes 0 rows.
  - **Owner:** a status update succeeds. A catalog version change is rejected by the definer guard.
  - **Definer bypass (R3-3):** `get_proposal_tracking_stats` returned rows to the other user and to `anon`. `increment_user_usage` and `get_user_usage_info` executed as `anon`.

---

## 5. Missing tests and gates for the next candidate

1. **CI migration smoke test:** apply all migrations in order against a clean Postgres with a Supabase auth setup. This would have caught R3-1 and R3-2. Run `owner-matrix.sql` in the same job.
2. Extend `owner-matrix.sql` with every item listed in R3-5 and section 4, plus a definer-function allowlist assertion (R3-3).
3. Initial clean under a labour-hours override (R3-4). Initial clean with heavy condition. Initial clean never included in the monthly budget.
4. An owner-analytics expectation for `unique_viewers`/`viewer_ip` (R3-8).
5. A negative-direction entry-code corpus for the advisory (R3-9). Advisory only.
6. Carried forward and still unexecuted: live target inventory (grants, column grants, policies, role membership/BYPASSRLS, definer functions, event names); isolated Supabase clone; authenticated staging for create, edit, reopen, status, print, the three PDF paths, email with test transport and hosted Chromium; real-device 390 px; operator validation (3–5 residential, 2–3 turnover); founder acceptance; separately authorized maintenance-window deployment.

## 6. Confirmation

I did not deploy, publish, send external messages, use paid APIs, spend money, or access or change any hosted system. The Postgres instance was local to my isolated sandbox, used synthetic data only, and has been stopped. No file in the user's repository was modified. The only local-device actions were read-only staging copies of existing `4b7310c` migrations from the worktree already shared with this session. This report is delivered in chat only.
