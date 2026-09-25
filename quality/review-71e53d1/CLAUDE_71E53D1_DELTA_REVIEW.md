# Claude Independent Delta Review — `9a81c5c..71e53d1`

- **Reviewer:** Claude (independent)
- **Date:** 2026-09-24
- **Branch:** `codex/r0-privilege-hardening`
- **Commit:** `71e53d1` "fix: verify paid proposal delivery flow". It is a single commit: 15 files, +1011/−118.
- **Scope:**
  - paid PDF/print authorization and branding;
  - public tracked-link confidentiality and entitlement;
  - delivery-method migration;
  - tracking RPC atomicity, grants and legacy counters;
  - the send URL and enabling online/both delivery;
  - the committed `quality/paid-entitlement-acceptance-20260924` evidence.
- **Not repeated:** the 44ca017 review, M-1 restoration and the hosted role matrix.

## Verdicts

| | Verdict |
|---|---|
| **Delta `9a81c5c..71e53d1`** | **FAIL — fix required, and small.** The unchanged mandatory definer gate (`CHECK_DEFINERS=1`) now **fails with exit 3 at H1**. Three new SECURITY DEFINER functions that client roles can execute are not on the reviewed allowlist (H1 below). I reviewed the functions themselves and executed them: they are safe, atomic and token-scoped. Two Medium issues also need fixing before customer use: the tracked-link PDF prints raw JSON blocks (M1), and a send can email a dead link (M2). |
| **Release gate** | **FAIL / NOT APPROVED.** Open items: H1, M1, M2, one real test email with PDF and tracked link, operator pricing validation, founder acceptance and deployment authorization. No waiver. |

---

## 1. Method and integrity

- **How I read the commits:** through the shared Git objects in the connected repository, read-only.
  - `44ca017..9a81c5c` is documentation and review files only.
  - `44ca017..71e53d1` changes only two files under `supabase/` and none under the harness.
- **Scratch migration tree:** my verified `44ca017` tree plus the two new migrations. SHA-256 matches `git show 71e53d1:<path>`:
  - `20260924012000_align_tracking_delivery_methods.sql` → `e0fe4938…550f`
  - `20260924013000_sync_tracked_engagement_fields.sql` → `fbf64f24…9319`
- **Result:** 51 migrations, identical to `71e53d1`.
- **Database environment:** local PostgreSQL 16 in a disposable cluster, run as the unprivileged `postgres` OS user through the candidate harness and its Supabase shim. I stopped and deleted the cluster.
- **Evidence files:** read from Git objects only.
  - PDF text was extracted locally.
  - PNG headers were checked.
  - I did not view the screenshots: they exist only as Git objects, and extracting them would have meant writing into the repository.
- **Nothing else touched:** no repository writes, hosted access, email, deployment, preview deletion, spend, credential operations or messages.

## 2. Executed results

| Check | Result |
|---|---|
| 51-migration chain (no patches) | ALL MIGRATIONS APPLIED; OWNER MATRIX PASSED |
| **Unchanged `30_assertions.sql` with `CHECK_DEFINERS=1`** | **FAIL, exit 3** — `30_assertions.sql:201: H1 client-executable definer functions not on allowlist: record_tracked_download(text), record_tracking_click(text,text,text,text), tracked_proposal_has_paid_access(text)` |
| Same assertions on a **scratch copy** with only those three signatures added to the allowlist (diagnostic only; not a pass of the unchanged gate) | ALL ASSERTIONS PASSED (H2–H6, service role, forged claim). Injection, dirty data, rerun and 40-way concurrency passed. `definer-inventory.sql` exit 0. |
| Function metadata | All four functions: SECURITY DEFINER, owned by `postgres`, `search_path = pg_catalog, public`. ACL: `postgres`, `anon`, `authenticated`, `service_role` (no PUBLIC). The paid check is STABLE; the recorders are VOLATILE. |
| Legacy and enhanced columns referenced by the RPCs | All 11 exist (`viewed*`, `proposal_viewed*`, `downloaded*`, `proposal_downloaded*`, `view_count`, `download_count`, `last_viewed_at`) |
| anon `record_tracked_view` ×2, `record_tracked_download`, `record_tracking_click` | All true. Tracking `view_count` rose by exactly the number of calls. Both view flags and both download flags were set; first-seen timestamps are kept by `coalesce`. `proposals.view_count` rose by one per successful view (the existing trigger). One `proposal_downloads` row per download. |
| Click truncation | `element_text` capped at 255 and `element_id` at 100. An `element_type` over 100 returns false. |
| **Evidence token `release1-qa-20260924`** | **Length 20, exactly the minimum.** View, download, click and `read_tracked_proposal` all work. A 19-character variant returns false/null on every RPC. The paid check returned false in the harness only because the fixture owner has no active `subscriptions` row. |
| Unknown token, NULL token, `track_opens`/`track_downloads` off | All recorders return false. `read_tracked_proposal` still returns the proposal when tracking is off (correct). |
| **Atomicity** (forced `proposal_downloads` insert failure inside a subtransaction) | `download_count` unchanged. The tracking update rolled back with the failed insert. |
| **Concurrency** (30 parallel anon download + click calls) | Counter +30, download rows +30, click rows +30. No lost updates. |
| Paid-access matrix | Active `subscriptions` row → tracked **true**, owner `active`. No row but profile `active` → tracked **false**, owner **active** (divergence L1). Active row with period ended → both true (existing status-driven semantics). |
| Self-grant attempt (authenticated inserts own active subscription) | Blocked: "Subscriptions are managed by billing." |
| anon direct writes | Insert into `proposal_click_tracking` or `proposal_downloads`: denied. Update or select `proposal_tracking`: permission denied. The only public write path is the token RPCs. |
| Delivery-method upgrade (023 constraint plus legacy `pdf`/`online` rows → migration) | Applies. `pdf`, `online`, `pdf_only`, `online_only` and `both` are accepted; `email` is rejected. Before the migration, `pdf_only` was rejected, which confirms the defect. |
| Drifted targets | (a) A legacy constraint under **another name** stays in place, so `pdf_only` is still rejected after the migration. (b) A nonconforming row: `ADD CONSTRAINT` fails. See I1. |
| Reapplying both migrations twice | exit 0; function and constraint fingerprints identical. **Idempotent.** |
| Tracked-link PDF evidence (`tracked-link-download-final.pdf`, 12,732 B, `4ec8804b…0565`, jsPDF 3.0.1) | Synthetic preview data only. No client email, costs, wages or access notes. **Raw ```` ```veliz_scope_table ```` and ```` ```veliz_pricing_table ```` JSON blocks are printed on pages 1–2** (M1). |
| Screenshots | Valid PNGs: 1440×2501 and 390×3766, matching the stated viewports. No emails, tokens or keys in the embedded strings. |
| Two changed Jest suites; full suite of 521 tests; build | **Codex / implementer-reported.** I did not re-run them. |

## 3. Findings (severity-ranked)

### Introduced by the delta

**H1 — HIGH (release-control regression): the unchanged mandatory definer gate fails**

- **Where:**
  - `supabase/migrations/20260924013000_sync_tracked_engagement_fields.sql:23-80`
  - allowlist at `quality/service-catalog-round4/db-harness/sql/30_assertions.sql:190-199` (unchanged)
- **What happens:** the migration adds three new client-executable SECURITY DEFINER functions. The R3-3/R0 gate requires every such function to be on an explicit, reviewed allowlist, so it now exits 3.
- **Evidence gap:** neither the ledger nor the README reports running `CHECK_DEFINERS=1`.
- **Fix:** in the same change, do both of the following, then re-run the unmodified-plus-allowlist gate:
  - (a) Add `record_tracked_download(text)`, `record_tracking_click(text,text,text,text)` and `tracked_proposal_has_paid_access(text)` to the allowlist, each with a one-line justification ("token-only capability, no row IDs").
  - (b) Add behavioral assertions for:
    - a token under 20 characters is refused;
    - an unknown or NULL token is refused;
    - opting out of opens or downloads is respected;
    - anon has no direct table write;
    - counters stay atomic.
- **Why HIGH:** it breaks a mandatory release gate. I found no exploitable issue in the functions themselves.

**M1 — MEDIUM (customer-facing; the renderer defect is pre-existing, but this delta newly exposes it): the tracked-link PDF prints raw JSON blocks**

- **Where:**
  - `app/api/proposals/[id]/download/route.ts:68` → `features/proposals/services/pdf/generator.ts` → `export-jspdf`, which has no `veliz_*` handling;
  - the only renderer that handles these blocks is `components/ui/markdown-renderer.tsx:261-330`.
- **What the evidence shows:** the committed evidence PDF shows the fenced JSON verbatim under "Scope of service" and "Service Quote & Pricing".
- **Why the customer sees two different PDFs:**
  - The owner/email attachment uses the Playwright print route; that is the "two-page A4" the ledger says was inspected.
  - The customer's "Download PDF" on the tracked link produces a different, three-page jsPDF document.
- **Ledger accuracy:** "downloaded tracked PDF completed successfully" is accurate. The PASS wording should not be read as visual acceptance of that PDF.
- **Fix:** either
  - render tracked downloads through the same print renderer using token-scoped data, or
  - make `export-jspdf` render or strip `veliz_*` blocks.
- **Test:** assert the extracted PDF text contains no ```` ```veliz_ ````.

**M2 — MEDIUM (made reachable by enabling online/both; the code is pre-existing): a send can email a dead link**

- **Where:** `app/api/proposals/[id]/send/route.ts:129-148`
- **What happens:** if the `proposal_tracking` insert fails, the route logs "Continue without tracking" and still emails `/view/<token>`. That page returns 404 because no row exists. The proposal is then marked `sent`, and the owner sees success.
- **This delta's migration fixes the known cause** (the `pdf_only` constraint). A target with a differently named constraint (I1a) or any other insert error still produces the silent dead link.
- **Fix:** when `delivery_method` is `online_only` or `both`, fail closed (return an error before sending) if the tracking insert fails. Insert tracking before PDF generation.

**L1 — LOW: the tracked paid check and the owner paid check use different entitlement sources**

- **Where:**
  - `20260924013000…sql:66-77` (tracked check: requires a `subscriptions.status='active'` row);
  - `lib/billing/proposal-entitlements.ts` (owner check: `get_user_usage_info`, which falls back to `profiles.subscription_status` when no subscription row exists).
- **Executed:** with profile `active` and no subscription row, the owner can print and send, but the customer's tracked download returns 403. The public view reports it only as "Failed to download".
- **Fix:** inside the tracked function, derive the answer from `_r0_get_user_usage_info_impl(p.user_id)` so there is a single source of truth.

**L2 — LOW: public engagement writes are unbounded per token**

- **What happens:** each click or download RPC call inserts a row; 30 parallel calls gave 30 rows each. There is no rate limit or de-duplication window.
- **Also:** `record_tracking_click` accepts a NULL `element_type` when called directly. The route rejects it.
- **Impact:** a token holder can inflate metrics and grow tables. The view RPC already had the same behavior.
- **Fix:** add a per-token rate limit or time-bucket de-duplication. Require a non-null `element_type` in SQL.

**L3 — LOW: the new regression tests are static source-string checks again**

- **Where:** `features/service-catalog/__tests__/r0-privilege-hardening.test.ts` (+63 lines)
- None of the new tests executes the SQL, the routes or the PDF output.
- The existing executable gate would have caught H1 had it been run.
- **Fix:** add the H1(b) harness assertions and a route test with the tracked-download RPCs mocked.

**L4 — LOW (evidence hygiene): the committed evidence token is human-readable and exactly at the length minimum**

- **Where:** `quality/paid-entitlement-acceptance-20260924/README.md`
- `release1-qa-20260924` satisfies the RPC rule (length 20, verified). It is guessable, it is published in the repository and it is live on the preview until the preview is deleted.
- Production tokens come from `crypto.randomUUID()` (36 characters) and are fine.
- **Fix:**
  - Revoke that tracking row or delete the preview when evidence is complete.
  - Optionally require a UUID format or at least 32 characters in the RPCs.

**I1 — INFO: robustness of the delivery-method migration**

- **Where:** `20260924012000…sql:4-9`
- (a) It drops only the constraint named `proposal_tracking_delivery_method_check`. A differently named legacy constraint stays in force (demonstrated).
- (b) It is not wrapped in `begin/commit`. If a target has a nonconforming row, `ADD` fails after `DROP`. Unless the migration runner wraps the file in a transaction, the column is left unconstrained.
- **Fix:** wrap it in a transaction. Before applying to the target, check `pg_constraint` for check constraints on `delivery_method` and the distinct stored values.

**I2 — INFO**

- `tracked_proposal_has_paid_access` gives anon a token-gated yes/no about the owner's billing state. The exposure is low. A single token-scoped download RPC that returns the payload only when entitled would remove it.
- The click route now returns 500 for an unknown token or when opens are off. That is harmless, but it creates console noise on the public page.
- `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` applies only when `NODE_ENV` is not production, so the production print path is unchanged.

### Pre-existing (not caused by this delta)

- `pdf_only` emails carry an `X-Proposal-Tracking-ID` header, so a recipient could open `/view/<token>`. This is acceptable: the same recipient already has the PDF.
- `NEXT_PUBLIC_APP_URL` falls back to `http://localhost:3000` in the send and print routes. Verify the production environment.
- Paid access is status-driven. Neither check looks at `current_period_end`; that relies on billing webhooks.

### Verified improvements (positive)

- **Tracked downloads no longer use the service-role client.** Token↔proposal binding is enforced (`payload.tracking.proposal_id !== id` → 404). The PDF is built from the allowlisted `read_tracked_proposal` payload: no `service_specific_data`, client email or costs, and `Access:` lines are stripped. The evidence PDF confirms this.
- **Print data now uses the authenticated caller** (RLS) instead of the service client. The page checks the paid entitlement before fetching. Branding prefers `company_profiles`.
- **Engagement writes moved from racy read-modify-write service-role code into atomic token RPCs.** Legacy and enhanced flags are synchronized. There is no public table write, and no service key in the public routes.
- **The send URL now targets the real `/view/[trackingId]` route** with a 36-character random token. Online/both delivery is enabled, and all three options report `disabled: false`.

## 4. Release gate

**FAIL / NOT APPROVED.** Remaining:

1. **H1:** allowlist, assertions, then re-run the gate.
2. **M1:** fix the tracked PDF rendering.
3. **M2:** fail closed when tracking cannot be created for an online link.
4. One real test email containing the PDF and the tracked link.
5. Cleaning-operator pricing validation.
6. Founder acceptance.
7. Separate deployment authorization.

Recommended: L1–L4 and I1.

After H1, M1 and M2 are fixed, I expect a narrow re-review to be enough: re-run the gate, check the PDF text, and check the send failure path.

## 5. Suggested ledger entry (not written)

> Claude independent delta review `9a81c5c..71e53d1`: **FAIL (fix required).**
> - Unchanged `CHECK_DEFINERS=1` exits 3 at H1: three new client-executable definer RPCs are not allowlisted.
> - The RPCs themselves verified token-scoped, atomic, idempotent and concurrency-safe. Evidence token length 20 satisfies the minimum.
> - M1: the tracked-link jsPDF download prints raw `veliz_*` JSON.
> - M2: send emails a dead `/view` link if the tracking insert fails.
> - Low: paid-source divergence, unbounded engagement writes, static tests, guessable committed preview token.
> - Release remains BLOCKED.

## 6. Constraints honored

- Read-only Git object access.
- Scratch copies and a deleted local cluster only.
- No repository writes, hosted access, email, deployment, preview deletion, spend, credential operations or human messages.
