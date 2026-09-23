# Veltex AI Release 1: round-4 review by Claude

**Candidate:** `dde3c0c2488c50c16f8c6841f2ea8ac8899ea418` (previous candidate `9df4073`; v1 baseline `4b7310c`)
**Date:** 2026-09-23 (Pacific)
**Inputs:** the round-4 ZIP. It contains 148 committed files plus START_HERE and MANIFEST, and **all 148 SHA-256 hashes match**.
**Boundaries kept:** isolated scratch copies only. There were no repository writes and no new folder access. I did not touch any hosted system, deploy, publish, send external messages or use paid APIs.

---

## 1. Verdicts

| Verdict | Result | Basis |
|---|---|---|
| **Local remediation: migrations and behaviour** | **PASS** | The committed migration chain applies **without scratch patches**. Codex's derived harness passes everything short of the definer gate: owner matrix, all assertions including the new statistics and service_role checks, injection, dirty data, re-run, and 40 concurrent views. R3-1, R3-2, R3-4, R3-6, the key-order issue, the statistics RPC, and R3-9, R3-10 and R3-11 are verified. One new medium item (R4-1) should be fixed but does not block this verdict. |
| **Mandatory definer-function gate (R3-3)** | **FAIL, as expected** | Ten pre-existing SECURITY DEFINER functions are still executable by `anon` and `authenticated` (list in section 3). `definer-inventory.sql` also raises `RELEASE BLOCKED`. The statistics helper is no longer on the list. |
| **Release** | **FAIL (not approved)** | R3-3 is unresolved and has no waiver. External gates are still unperformed: target inventory, a real Supabase clone, authenticated staging including email and hosted PDFs, operator validation and founder acceptance. |

A behavioural pass here is **not** a release pass. No regulated or biohazard service is approved.

---

## 2. What I executed vs. what was reported

| Item | Source | Result |
|---|---|---|
| Manifest integrity | **Ran** | 148/148 match |
| Base migrations | **Ran** | The 43 non-catalog migrations are byte-identical to `4b7310c` |
| Release-1 migration | **Ran (diff)** | The only change from `4b7310c` is `e.created_at` → `e.occurred_at` (line 67) |
| Remediation migration | **Ran (diff)** | Changes from `9df4073`: `drop policy if exists` before each guard; `get_proposal_tracking_stats` rewritten as a SQL SECURITY INVOKER function with a pinned search path, anon/PUBLIC revoked, and authenticated/service_role granted; colour columns removed from the token projection |
| Frozen v1 | **Ran** | `versions/**` unchanged from round 3. v1 catalog and pricing still match `4b7310c` byte for byte |
| Derived harness | **Ran (diff)** | The shim, fixtures and owner matrix are byte-identical to my round-3 harness (Codex's recorded archive hash `b84fed0e…` matches the file I delivered). The added safety guards and assertions are all reviewed. |
| **Unpatched migration chain and derived harness** | **Ran** | Local PostgreSQL 16.13 in my sandbox, using the fresh dedicated cluster `/tmp/veltex-catalog-claude-r4-1790185160` (Unix socket only, no TCP). Results in section 3. |
| My original round-3 harness against the same migrations | **Ran** | Independent cross-check, no patches: all green (same results) |
| Harness safety guards | **Ran** | Section 4 |
| Application probes | **Ran** | Transpiled scratch copies of `features/service-catalog/**` with the base proposal schema. Section 5. |
| 505 tests, 57 suites, 5 snapshots; typecheck; build; 8 layouts; 2 PDFs | **Reported only** | No dependencies are bundled, so I did not re-run them |
| GitHub CI workflow | **Reviewed only** | Not executed. I have no GitHub access and none was requested. |

**Limits:** this is repository schema under an approximate Supabase shim. It is not the target database, not Supabase, and not staging.

---

## 3. Database results (committed candidate, no scratch patches)

**Commands** (run as a non-root OS user from a scratch copy of the bundle):

```sh
export HARNESS_PGDATA=/tmp/veltex-catalog-claude-r4-1790185160 PG_BIN=/usr/lib/postgresql/16/bin PATH=/usr/lib/postgresql/16/bin:$PATH
for f in quality/service-catalog-round4/db-harness/*.sh; do bash -n "$f"; done           # all pass
quality/service-catalog-round4/db-harness/start_cluster.sh
MIGRATIONS_DIR=$PWD/supabase/migrations quality/service-catalog-round4/db-harness/run_all.sh
CHECK_DEFINERS=1 MIGRATIONS_DIR=$PWD/supabase/migrations quality/service-catalog-round4/db-harness/run_all.sh
PGHOST=$HARNESS_PGDATA PGPORT=55432 psql -X -v ON_ERROR_STOP=1 -d veltex_harness -f quality/service-catalog-round4/definer-inventory.sql
quality/service-catalog-round4/db-harness/start_cluster.sh stop
```

**Behavioural run (`run_all.sh`):**
```
ALL MIGRATIONS APPLIED to veltex_harness              (45 files, no patches)
OWNER MATRIX PASSED
ALL ASSERTIONS PASSED                                  (A–G, plus new G3–G8 stats/service_role)
inject: PASS (aborted, nothing committed)
equiv: aborted (fail-closed; expected with current candidate, see R3-7)
dirty: PASS (historical kept, new rejected)            (now also asserts the old row survives)
rerun: applied twice (idempotent)                      (R3-6 fixed; now a required pass)
proposal views +40, tracking views +40, history rows +40, time_spent=86400 (N=40)
CONCURRENCY PASSED
HARNESS COMPLETE
```

**Release gate (`CHECK_DEFINERS=1`), exit code 3, as expected:**
```
H1 client-executable definer functions not on allowlist: is_admin(), get_user_current_usage(uuid),
can_user_create_proposal(uuid), get_user_usage_info(uuid), update_template_usage(uuid),
handle_subscription_expiration(), user_has_active_access(uuid), get_user_accessible_templates(uuid),
increment_user_usage(uuid), can_user_access_template(uuid,uuid)
```
`get_proposal_tracking_stats` has dropped off the list compared with round 3.

**`definer-inventory.sql`, exit code 3, as expected:**
- It lists 20 SECURITY DEFINER routines with their ACLs and settings.
- It then raises `RELEASE BLOCKED: anonymous legacy identity RPCs: …` for `increment_user_usage`, `get_user_usage_info`, `get_user_current_usage` and `can_user_create_proposal`.

**Additional statistics checks I ran:**

| Check | Result |
|---|---|
| Function properties | `prosecdef = f`; anon EXECUTE **f**; authenticated **t**; service_role **t** |
| Owner, identity-bearing rows only (3 synthetic legacy rows, 2 distinct IPs, durations 30/60/90) | total 3, unique 2, average 60. Metrics are computed when identity is available. |
| Owner, mixed rows (adds one token-resolved identity-free view) | total 4, unique **NULL**, average **NULL**. Unavailable metrics are NULL, not a made-up 0. |
| Other signed-in user asking for the owner's proposal | total 0, unique 0, average 0 (RLS-scoped; no leak) |
| Proposal with no views | 0 / 0 / NULL / 0 |

**Cross-check with my original round-3 harness** against the same unpatched migrations (`DB=veltex_orig`): all migrations applied, owner matrix passed, all assertions passed, inject passed, equiv aborted, dirty passed, rerun idempotent, concurrency passed.

---

## 4. Safety of the derived harness (executed)

| Attempt | Result |
|---|---|
| `HARNESS_PGDATA=/tmp/other` | Refused: "Refusing non-harness directory" (exit 2) |
| An unmarked `/tmp/veltex-catalog-fake` | Refused (exit 1), **with no message** (R4-2) |
| A marked directory whose socket is a symlink to a different running cluster | Refused: "Connected server is not the disposable harness" (exit 2). The `data_directory` check works. |
| `--scratch-patches` | Refused: "Scratch patches forbidden for candidate checks" (exit 2) |
| `start_cluster.sh` on an existing directory | Refused: "Choose a fresh harness directory" (exit 2) |

The CI workflow (`.github/workflows/catalog-migrations.yml`) was reviewed only. It grants read-only `contents`, uses no secrets, and runs a socket-only cluster at `/tmp/veltex-catalog-ci` on port 55432, so it does not clash with the runner's system Postgres on 5432. The behavioural step runs before the gate step, and the gate step is expected to fail. It is sound as written, but **it has not been executed on GitHub**.

---

## 5. Application-code probes (executed on scratch copies)

| Item | Result |
|---|---|
| **R3-4** initial clean decoupled from overrides | Base: $245 ongoing / $310 initial. Labour hours 3: **$205 / $310**. Price override $150: **$150 / $310**. Heavy condition: $340 / $435. Minimum $400: $400 / $400. v1 recurring and `initialClean: false` give no initial clean. **Fixed.** See R4-1 for the reverse case. |
| **Key-order preservation** | With every nested key of `catalogJob` and `global_inputs` reversed and forged content and price in the body, **the stored bytes and $999 are preserved** and status becomes `sent`. Reordering an array (`scopeOmissions`) is treated as a change and recomposes. A real value change recomposes. A type change (`bedrooms: "3"`) is rejected by the schema. **Fixed.** |
| **R3-9** advisory | Now warns on "Use 4821 on the keypad" and no longer warns on "access 1500 sq ft" or "access to 2,400 square feet". Still warns on combo, opener, `#NNNN` and "Door code 4821". It stays advisory-only. Residual gaps are listed under R4-5. |
| **R3-10** metadata | Catalog links now describe themselves as "Review your cleaning service proposal and agreement." (`app/view/[trackingId]/page.tsx:115`). **Fixed.** |
| **R3-11** profile notice | The message is now conditional on costs loading successfully (`workbench.tsx:41`). **Fixed.** |
| **R3-12** cents in monthly budget | The rationale (rounded visit price × average visits per month) is accepted. |

---

## 6. Round-3 findings: status

| ID | Status in `dde3c0c` |
|---|---|
| R3-1 funnel view column | **FIXED (executed, no patch)** |
| R3-2 token projection columns | **FIXED (executed, no patch).** Colours are omitted; branding-source parity is an external acceptance item. |
| R3-3 anonymous-callable definer functions | **OPEN, RELEASE BLOCKER.** Only the statistics helper is fixed. There is no waiver, which matches Codex's own disposition. |
| R3-4 initial clean vs. overrides | **FIXED (executed)**, with the new R4-1 |
| R3-5 owner-matrix coverage | **FIXED** in the harness (my assertions plus G3–G8) |
| R3-6 re-run | **FIXED (executed)** |
| R3-7 equivalent policy text aborts | **Unchanged by design (fails closed).** The target inventory must adjudicate. |
| R3-8 unique viewers always 0 | **FIXED (executed):** NULL when unavailable |
| R3-9, R3-10, R3-11 | **FIXED** |
| R3-12 | **Accepted as designed** |
| Key-order preservation (Codex follow-up) | **FIXED (executed)** |

Earlier deferrals are unchanged: F10, F13, F15, F16, F17 and F19 accepted; F8 and F24 open.

---

## 7. New findings (round 4)

**R4-1 (Medium): the initial clean can now be priced below the ongoing visit.**
- Because `estimateInitialClean` ignores ongoing labour-hour overrides, an operator who records a high recurring workload gets an inverted quote.
- Probe: labour hours 12 gives an ongoing visit of **$635** and an initial detailed clean of **$310**. The document still describes the initial clean as more detailed.
- Fix: add a warning (for example "Initial clean is priced below the ongoing visit; review initial-clean hours") and/or an optional initial-clean hours override. Test both directions.

**R4-2 (Low): harness guard ergonomics.**
- The unmarked-directory refusal is silent (the bare `test -f` exits 1).
- `guard_local.sh` relies on the caller's `set -e`. If it is sourced from a shell without `-e`, the marker test failure does not stop execution. The `data_directory` check still exits explicitly.
- Fix: use `test -f … || { echo …; exit 2; }`.

**R4-3 (Low): inventory noise.**
- `guard_proposal_catalog_version()` and `update_proposal_view_count()` still show anon EXECUTE, because Supabase-style default grants go to `anon` directly and `revoke … from public` doesn't remove them.
- They are trigger functions and cannot be called directly, so this is harmless.
- Add `revoke … from anon, authenticated` so the target inventory reads cleanly.

**R4-4 (Low):** a non-owner asking for statistics gets 0/0/0, which looks the same as "no views". That is acceptable because nothing leaks. Document it for the owner analytics UI.

**R4-5 (Low, advisory only):**
- "Arrive 0930, alarm panel by door" warns (a benign false positive).
- "Key under mat" does not warn, because there are no digits.
- The advisory is not a redaction boundary and must not be presented as one.

**R4-6 (Info):** the CI workflow will stay red until R3-3 closes, which is intended. Keep the behavioural step and the gate step visibly separate in required checks, so a behavioural regression is never hidden behind the known gate failure.

---

## 8. Remaining gates (release)

1. R3-3: a dedicated audit and hardening of the 10 listed definer functions. Map legitimate callers, then revoke client EXECUTE or bind each function to `auth.uid()`. Execute this on a disposable target clone and pass `CHECK_DEFINERS=1` **without** allowlisting functions just to turn CI green.
2. Live target inventory: grants, column grants, policies (R3-7 normalisation), role membership and BYPASSRLS, definer ACLs, event names and default ACLs.
3. An actual Supabase clone run of this harness, then authenticated staging: create, edit, reopen and status changes for v1 and v2; print; all PDF paths; email with a test transport; hosted Chromium; public link and download; real devices at 390 px and desktop.
4. Operator validation (3–5 residential and 2–3 turnover operators) and founder acceptance, followed by a separately authorised maintenance-window deployment.

## 9. Confirmation

No deployment, publication, hosted-system access or change, external messages, paid APIs or spend occurred. No file in the user's repository was modified, and no new folder access was requested. All execution used synthetic data in a sandbox-local Postgres cluster that has now been stopped. This report is delivered in chat only.
