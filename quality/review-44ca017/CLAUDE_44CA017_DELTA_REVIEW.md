# Claude Independent Delta Review — `b7e9ba6..44ca017`

- **Reviewer:** Claude (independent)
- **Date:** 2026-09-24
- **Branch:** `codex/r0-privilege-hardening`
- **Commit:** `44ca017` "fix: complete authenticated preview proposal flow". It is a single commit: 7 files, +82/−11.
- **Scope:** the seven changed files only, plus the unchanged context needed to judge them. I did not repeat the M-1 restoration, the R0 role matrix or the legacy-view verification.

## Verdicts

| | Verdict |
|---|---|
| **Delta `b7e9ba6..44ca017`** | **PASS.** No Critical, High or Medium findings. Both migrations are safe and correct, and I executed them. The React key fixes the sample-to-real defect, which I reproduced. The route change stops a missing-configuration error from turning a saved proposal into an HTTP 500, which I also reproduced. One new Low finding: the regression tests are static string checks and do not exercise the failures they name. |
| **Release gate** | **FAIL / NOT APPROVED.** These gates are still open: paid-entitlement PDF, send and tracked-link evidence; responsive acceptance; operator validation; founder acceptance; and separate deployment authorization. No waiver. |

---

## 1. Method and integrity

- **How I read the commits:** through the shared Git objects in the connected repository, read-only (`git show` / `git diff`). I read the `/private/tmp` worktree path the same way, as I did for `07624c4`.
- **Scratch database tree:** I copied my verified `f115c43` tree and brought it forward to `44ca017`. `git diff --stat f115c43 44ca017 -- supabase` shows only four migration changes, which I applied:
  - the R0 `start_user_trial` existence guard;
  - `20260924010000_restrict_legacy_proposal_view.sql`;
  - the two new migrations.
- **Hash check:** SHA-256 of all four files matches `git show 44ca017:<path>`:
  - `545aa3a7…34ae`
  - `c0262926…f31b`
  - `b004453e…4479`
  - `53ac5434…c4b8`
- **Result:** the migration directory is identical to `44ca017`, with 49 files.
- **Environment:** local PostgreSQL 16 in a disposable cluster, run as the unprivileged `postgres` OS user through the candidate harness and its Supabase shim. I stopped and deleted the cluster afterwards.
- **App probes:** `@supabase/supabase-js@2.55.0` (the version `package.json` pins) and the same React/RTL runner as in earlier rounds, all in scratch directories.
- **Nothing else touched:** no repository writes, hosted access, deployment, preview deletion, credentials, spend or external messages.

## 2. Executed results

| Check | Result |
|---|---|
| 49-migration chain plus `run_all.sh` with `CHECK_DEFINERS=1` (owner matrix, A–H assertions, injection, dirty data, rerun, 40-way concurrency) | **PASS, exit 0.** Output: ALL ASSERTIONS PASSED, CONCURRENCY PASSED, HARNESS COMPLETE. |
| Resulting `profiles` policies | "Admins can view all profiles": `SELECT TO authenticated USING (is_admin())`. The other five policies are unchanged. RLS is on; FORCE RLS is off. |
| `is_admin()` | SECURITY DEFINER, owned by `postgres` (the same owner as `profiles`), `search_path = pg_catalog, public`. EXECUTE granted to authenticated, not to anon. Takes no parameters and checks only `auth.uid()`. |
| **Before the delta** (old self-select policy restored in a rolled-back transaction) | Owner `SELECT profiles` → **42P17**. Owner `UPDATE profiles.logo_url` → **42P17**. Owner `UPDATE proposals.template_id` to a new template (entitlement trigger) → **42P17**. |
| **After the delta** | Owner sees own row: 1. Owner sees another user's row: **0**. Owner updates own `logo_url`: OK. Owner updates another user's `logo_url`: 0 rows. Owner self-escalates `role='admin'`: blocked with "Entitlements are managed by billing." Admin sees all rows: 2. anon: 0 rows. Authenticated with no `sub`: 0 rows. |
| Owner `template_id` change after the delta | The trigger now reaches the business rule ("Your plan does not include this proposal design.") instead of 42P17. |
| `logo_url` column | `text`, nullable, no default. |
| Reapplying both new migrations | exit 0 each time; the policy, column and RLS fingerprints are identical before and after. **Idempotent.** |
| Drifted target (`logo_url varchar(10) not null` already present) | The migration skips and leaves the drifted definition in place. This is expected for `IF NOT EXISTS` (see I2). |
| `createServiceClientRaw(undefined, …)` on supabase-js 2.55.0 | Throws synchronously ("supabaseUrl is required." / "supabaseKey is required."). |
| Route-shaped simulation with configuration missing | Old placement → outer catch → **500**. New placement → caught inside the fire-and-forget block → **200**, with 0 unhandled rejections. |
| Sample → real rerender **without** the key (pre-delta behavior) | Client stays "Sample customer". Save stays **disabled** (hidden `job.demo`). The sample banner is **gone**, so the user sees no reason why. Nothing is POSTed. |
| Sample → real rerender **with** the `44ca017` key | Fresh state: blank client, profile defaults loaded ("Real Co"). Save is enabled; the POST is sent with no `demo` flag; the page redirects to `/dashboard/proposals/<id>`. |
| Same key rerender / job-type change in the URL | Same key keeps typed input. A job-type change in the URL remounts with fresh state. The workbench never writes the job type to the URL, so choosing a market on the page does not remount. |
| Two changed Jest suites (30 tests); full run of 517 tests, typecheck, build | **Codex-reported**. I did not re-run them. |

## 3. Findings (severity-ranked)

### Newly introduced by the delta

**L1 — LOW (test quality): the new regression tests do not exercise the failures they name**

- **Where:**
  - `features/service-catalog/__tests__/workbench.test.tsx:68-71`
  - `features/service-catalog/__tests__/r0-privilege-hardening.test.ts:52-65` and `81-95` (tests start at lines 52, 61 and 81)
- **What they do:** all four new tests read source files and compare strings.
  - The workbench test checks that `page.tsx` contains the exact key literal.
  - The route test checks that `createServiceClientRaw(` appears after the first `try {` between two comment markers.
  - The migration tests check SQL text.
- **Passes on broken code:** each of these would still pass, by inspection.
  - `isDemo` computed wrongly (for example `params.demo === 'true'`).
  - The key literal placed on the wrong element.
  - A migration that parses but fails at apply time.
- **Fails on correct code:** a harmless reformat of the key expression.
- **What I executed:** the behaviors themselves (section 2). The tests do not.
- **Fix (not a blocker for this delta):**
  - (a) An RTL test that renders the sample element, rerenders the real element exactly as `page.tsx` builds it, and asserts a blank client, an enabled save and a POST. My probe `zz-key-probe.test.tsx` does this in about 40 lines.
  - (b) A route unit test that mocks `@supabase/supabase-js` `createClient` to throw and expects 200 with the proposal body.
  - (c) Harness assertions in `30_assertions.sql`:
    - owner own-profile select/update succeeds with no 42P17;
    - cross-profile select returns 0;
    - an admin fixture sees all rows;
    - an owner `template_id` change reaches the entitlement error.

**I1 — INFO: the recreated admin policy is redundant and evaluates `is_admin()` per row**

- **Where:** `supabase/migrations/20260924010500_fix_profiles_policy_recursion.sql:6-10`
- "Users can view own profile" already reads `is_admin() OR id = auth.uid()`, so the new policy adds no access. It is harmless.
- `is_admin()` is VOLATILE and is called bare, so Postgres evaluates it for every row rather than once per query.
- The move from PUBLIC to `TO authenticated` is a correct narrowing.
- **Later cleanup:** mark `is_admin()` STABLE, use `(select public.is_admin())` in policies, or drop the duplicate policy.
- **Safety condition:** avoiding recursion depends on `is_admin()` being owned by the `profiles` owner with FORCE RLS off. That holds in the harness. Keep it in the real-target inventory.

**I2 — INFO: `add column if not exists` does not reconcile a drifted column**

- **Where:** `supabase/migrations/20260924011000_align_profiles_branding_columns.sql:4-5`
- If a target already has `logo_url` with a different type or nullability, the migration skips silently. I demonstrated this.
- This is acceptable given the ledger's statement that production is nullable `text` with no default. I did not verify that statement; it is Codex-reported and hosted.
- The single statement needs no explicit transaction.

**I3 — INFO: when configuration is missing, lifecycle emails are skipped silently**

- **Where:** `app/api/proposals/route.ts:212-217` and `258-263`
- The new behavior is correct. The side effect is that a missing Supabase URL or service key now only logs "First proposal email error" / "Trial proposals-exhausted email error". Confirm production has both variables; this is already an operator check.
- Non-null assertions (`!`) remain, but the throw is now contained.
- I checked the other awaited post-insert calls: `sendFirstProposalEvent` → `sendCAPIEvent` and `recordFunnelEvents` both catch internally.

### Pre-existing (not caused by this delta)

**L2 — LOW (pre-existing): the edit branch of the same route is not keyed**

- **Where:** `app/dashboard/proposals/category/page.tsx:21`
- `useState` initializers (`workbench.tsx:28-29`) ignore later prop changes. So a client-side navigation from `/category?id=A` to `/category?id=B` would keep A's inputs while `proposalId` is B. "Save revised proposal" would then PUT A's content into B.
- This was inferred from code; I did not execute it.
- Reachability is limited, because the workbench has no link to another proposal. Back/forward history could still produce it.
- **Fix:** `key={params.id}` on that element.
- The delta's key covers only the new-job branch. Navigating between the edit branch and the new-job branch already remounts, because the keys differ.

**L3 — LOW (pre-existing): proposal creation is not atomic or idempotent**

- **Where:** `app/api/proposals/route.ts`, from the insert at line 120 through the usage increment at line 159 to the response.
- Any unexpected error after the insert returns 500 even though the proposal is saved and usage is counted. A retry then creates a duplicate proposal and double-counts usage. The ledger records this happened on preview.
- The delta removes the known trigger. The remaining awaited calls catch their own errors, so the residual risk is only unexpected exceptions.
- Lifecycle emails use `void (async …)()` instead of `after()`, so they may be cut off on serverless.
- **Fix later:** an idempotency key on POST, and `after()` for the email blocks.

**Resolved pre-existing issue:** the recursive "Admins can view all profiles" policy (my earlier C4/M3). It came from `20250901194222_add_user_roles.sql:22-30`, which sorts after `020_fix_profiles_rls_recursion.sql` and so reintroduced the self-select. It is **fixed by this delta**, and I verified that locally (section 2).

## 4. Demo-to-real and save/edit behavior

- **Sample → real:** fixed, as executed in section 2. Real jobs load business defaults, can be saved, carry no `demo` flag and redirect to the saved proposal.
- **Save guard** (`workbench.tsx:81`): still blocks both `demo` and `job.demo`, so sample jobs cannot be saved.
- **Edit/reopen:** unaffected by the delta. Reopening uses the unkeyed `id` branch, which still carries L2.
- **Codex-reported:** preview save/reopen with the full catalog document.

## 5. Ledger (`docs/OPERATING_STATE_AND_DECISION_LEDGER.md:269-278`)

Accurate against the diff, and consistent with my results on every locally checkable claim.

Hosted and not verified by me:

- preview execution;
- production `logo_url` metadata;
- the 517/tsc/build results;
- the trial blocking PDF/send.

The status line correctly keeps release BLOCKED.

**Suggested entry** (I did not write it):

> Claude independent delta review `b7e9ba6..44ca017`: **PASS** (local). 49-migration chain plus `CHECK_DEFINERS=1` pass. Profiles recursion reproduced before the delta and gone after it (own select/update, `template_id` trigger). Cross-profile isolation, admin visibility, self-escalation block and idempotency verified. Key remount and lifecycle-email containment reproduced and fixed. Low: static-only regression tests (L1); pre-existing unkeyed edit branch (L2) and non-idempotent POST (L3). Release remains BLOCKED on paid PDF/send/tracked-link, responsive, operator and founder gates.

## 6. Release gate

**FAIL / NOT APPROVED.** Remaining gates:

1. Paid-entitlement PDF download, send and tracked link, using an authorized entitlement and a test transport.
2. Responsive acceptance.
3. Operator validation.
4. Founder acceptance.
5. Separate deployment authorization.

Recommended, not blocking: L1 behavioral tests, the L2 key and the L3 idempotency.

Gmail rotation and delivery, M-1, the R0 matrix and legacy-view verification were closed earlier and were not repeated.

## 7. Constraints honored

- Read-only access to the repository objects.
- Probes only on scratch copies in the cloud workspace.
- The local cluster was deleted.
- No repository writes, hosted access, deployments, preview deletion, credential inspection, spend or external human messages.
