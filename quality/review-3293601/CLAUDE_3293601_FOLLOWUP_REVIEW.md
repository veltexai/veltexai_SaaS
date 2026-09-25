# Claude Bounded Follow-up Review — Correction `644000d..3293601`

- **Reviewer:** Claude (independent)
- **Date:** 2026-09-24
- **Branch:** `codex/r0-privilege-hardening`
- **Commit:** `3293601` "fix: close paid delivery review findings". It is a single commit: 9 files, +174/−96.
- **Scope:** only the prior H1, M1, M2 and L1 findings, and whether the correction causes regressions.
- **Not repeated:** M-1 and hosted work. Earlier findings L2–L4 and I1 are carried forward unchanged and were not re-reviewed.

## Verdicts

| | Verdict |
|---|---|
| **Correction `644000d..3293601`** | **PASS for H1, M1 and M2.** **L1 is only partly closed.** Tracked paid access still disagrees with the owner's actual `get_user_usage_info` in 6 of 80 reachable status combinations, and in 11 more combinations if the target allows `trialing` subscriptions (L1′, Low). In every mismatch the tracked check is **more permissive** than the owner check. No regression found. |
| **Release gate** | **Still FAIL / NOT APPROVED**, now only for the external gates: a real test email with the PDF and tracked link, operator pricing validation, founder acceptance and deployment authorization. L1′ is recommended before deployment; it does not block on its own. |

---

## 1. Method and integrity

- **How I read the commits:** through the shared Git objects, read-only.
  - `git diff --stat 71e53d1 3293601 -- supabase/migrations quality/service-catalog-round4/db-harness` shows exactly two files.
  - Both files, rebuilt in my scratch copy of the verified `71e53d1` tree, match `git show 3293601:<path>` byte for byte:
    - `20260924013000_sync_tracked_engagement_fields.sql` → `f865d0b4…692b`
    - `30_assertions.sql` → `a863dfd0…6787`
- **Database environment:** local PostgreSQL 16 in a disposable cluster, run as the unprivileged `postgres` OS user through the candidate harness. I stopped and deleted the cluster.
- **Committed PDF:** extracted locally from Git objects with `pdftotext`.
- **Nothing else touched:** no repository writes, hosted access, production mutation, email, preview deletion, spend or external contact.

## 2. Prior findings

### H1 — CLOSED (executed)

- **Gate run:** the exact candidate, with the committed allowlist and **no diagnostic patch**, ran `CHECK_DEFINERS=1 run_all.sh`.
  - The 51-migration chain applied.
  - Owner matrix passed.
  - **ALL ASSERTIONS PASSED.**
  - Injection, dirty data, rerun and 40-way concurrency passed.
  - HARNESS COMPLETE, **exit 0**.
  - `definer-inventory.sql` exit 0, with no `RELEASE BLOCKED`.
- **Allowlist change:** it adds exactly the three signatures with a justification comment. It does not add any wildcard or waiver.
- **Unknown-token negatives** (`30_assertions.sql`, `F4a`–`F4c`) run as `anon`. I checked that they actually fire:
  - With `tracked_proposal_has_paid_access` replaced by `select true`, the unmodified assertions fail at **`F4c unknown token has paid access`**.
  - With `record_tracked_download` replaced by `select true`, they fail at **`F4a unknown token downloaded`**.
  - After I reapplied the real migration, they pass again, which also re-confirms idempotency.

### M1 — CLOSED (committed PDF inspected)

- **Root cause (Codex's clarification, confirmed):**
  - `export-jspdf.ts:110` already routes catalog proposals through `catalogDocumentText`.
  - `isCatalogProposal` only recognized the private `service_specific_data.catalogJob`, which the public projection omits.
  - The fix is at `features/service-catalog/proposal.ts:98-99`: `catalog_document === true` is now accepted.
- **The corrected evidence PDF:**
  - `tracked-link-download-final.pdf`, SHA-256 `c8d4e5af…a64a`, 12,743 B, jsPDF 3.0.1, 3 pages.
  - Its text contains **no** ```` ``` ````, `veliz`, `**`, `{"`, `"rows"`, `##`, `@` or `Access:`.
  - The scope renders as five bullets. Pricing renders as plain lines ("Recurring standard home cleaning (Every two weeks): $245.00", "Initial detailed clean … (Once): $310.00", "Ongoing visit price …: $245.00").
  - Prices match the owner document.
- **Bold stripping:** `export-jspdf.ts:1401` strips `**…**` only from the text drawn in `renderEnhancedMarkdownContent`. Line classification (headings and bullets) still uses the original line, so the layout is unchanged.
- **Limit:** I inspected text only. I did not look at the pages visually.

### M2 — CLOSED (inspected; Codex runs the mocked-email route test)

- **Where:** `app/api/proposals/[id]/send/route.ts:146-156`
- A tracking insert error now returns 500 `TRACKING_SETUP_ERROR` ("No email was sent").
- **Order in the route:**
  1. PDF generated (line 102);
  2. tracking inserted (line 130);
  3. fail-closed return (line 148);
  4. `sendEnhancedProposalEmail` (line 184);
  5. status set to `sent` (line 205).
- So on failure there is no email and no `sent` status.
- It also fails closed for `pdf_only`, which is conservative and acceptable.
- The static test checks this ordering. The behavioral route test is Codex-run.

### L1 — PARTLY CLOSED → L1′ remains (Low)

**What changed:** the new SQL (`20260924013000…sql:66-78`) uses `left join subscriptions … left join profiles … where (s.status = 'active' or pr.subscription_status = 'active')`. It does not call the same helper as the owner check.

**How I tested it:** I compared that SQL with the **actual owner path**: `get_user_usage_info(owner)` called through the R0 wrapper as the signed-in owner, `subscription_status = 'active'`.

- **Profile statuses** (all 8 allowed by `profiles_subscription_status_check`): `pending`, `free_trial`, `trial`, `trialing`, `active`, `cancelled`, `past_due`, `expired`.
- **Subscription sets** (10): none; `active`; `cancelled`; `past_due`; `unpaid`; and multiple rows, oldest first: `active+cancelled`, `cancelled+active`, `active+active`, `past_due+active`, `active+past_due`.

| Case | Owner (`get_user_usage_info`) | Tracked (new SQL) |
|---|---|---|
| Active subscription row (profile not `free_trial`) | active | true ✓ |
| **Profile `active`, no subscription row** (the original L1) | active | **true ✓ fixed** |
| Profile `active` + only `cancelled`/`past_due`/`unpaid` rows | active (profile fallback) | true ✓ |
| Profile `cancelled`/`expired`/etc. + active row (any order or count) | active | true ✓ |
| No active row, profile not `active` | not active | false ✓ |
| **Profile `free_trial` + any active row** (6 combinations) | **`free_trial` → not paid** | **true ✗** |

- **Result:** 74 of 80 combinations agree.
- **Latent case:** the owner function prefers the **newest** row among `active`/`trialing` and treats `trialing` as not paid.
  - The harness `subscriptions_status_check` rejects `trialing`. The application still queries `status = 'trialing'`, so the production constraint may differ.
  - With that constraint removed, 11 of 32 `trialing` combinations disagree. For example: profile `active` with a `trialing` row; or an older `active` row with a newer `trialing` row. In each, the owner is not paid but the tracked check returns true.

**Impact:** Low.

- New tracked links cannot be created in these states, because send requires the owner check.
- The effect is limited to customer downloads of already-delivered proposals while billing data is inconsistent (for example, a webhook updated `subscriptions` but not `profiles`).
- There is no cross-tenant exposure.

**Exact fix (diagnostic scratch only, not committed):** derive the answer from the same helper.

```sql
select coalesce((
  select (select u.subscription_status from public._r0_get_user_usage_info_impl(p.user_id) u) = 'active'
    from public.proposal_tracking t join public.proposals p on p.id = t.proposal_id
   where t.tracking_id = token and length(token) >= 20), false);
```

- **Result of that fix:** **80/80** and **32/32** agree.
- **Test to add:** a harness assertion that walks this profile × subscriptions matrix.

## 3. Regression check

| Area | Result |
|---|---|
| `isCatalogProposal` accepts `catalog_document` | Call sites checked. The PUT route (`app/api/proposals/[id]/route.ts:125`) and POST route (`app/api/proposals/route.ts:71`) parse client input with Zod object schemas, which strip unknown keys. `catalog_document` is not a column. So a client cannot use the marker to force catalog handling. Viewers (`template-renderer`, `proposal-content`, `print`) receive database rows without the key. **None found.** One theoretical note: `normalizeCatalogProposal` would throw on an object with `catalog_document: true` and no `catalogJob`. No route can reach that state (inferred). |
| `**` stripping in jsPDF | Applies to the generated content of all proposals, which is display-only. Legacy non-catalog PDFs also lose literal `**`, which is an improvement. |
| Paid-access SQL change | Grants, SECURITY DEFINER, fixed `search_path` and anon/authenticated execute are unchanged. The unknown token still returns false (F4c). The gate passes. |
| Migration edited in place | `20260924013000` was changed rather than superseded by a new migration. Fresh databases get the new body. The preview already recorded that version with the old body; the ledger says it was hot-updated there. **INFO:** track the preview's function body as out-of-band, or use a new migration version for future changes to applied migrations. |
| Tests | New tests are static again: a catalog-marker unit test, send-order string checks and a migration string check. The SQL negatives above are executable and verified live. |

## 4. Remaining findings

| ID | Severity | Status |
|---|---|---|
| **L1′** | Low | Tracked paid access is more permissive than the owner rule when the profile is `free_trial` with an active row, and in the latent `trialing` combinations. Fix: use the same helper (§2). |
| L2 | Low | Carried: public engagement writes are unbounded per token. |
| L3 | Low | Carried: new tests are mainly static; the SQL negatives are now executable. |
| L4 | Low | Carried: the committed preview token `release1-qa-20260924` (20 characters, satisfies the minimum) is human-readable and live until the preview is revoked or deleted. |
| I1 | Info | Carried: the delivery-method migration has no transaction and drops by exact name only. |
| I-new | Info | The applied migration `20260924013000` was edited in place. |

No Critical, High or Medium findings remain.

## 5. Suggested ledger entry (not written)

> Claude bounded follow-up `644000d..3293601`: **H1/M1/M2 CLOSED, L1 partially closed (L1′ Low).**
> - Exact candidate `CHECK_DEFINERS=1` exit 0; the unknown-token negatives are live (mutations caught at F4a/F4c).
> - Committed tracked PDF has no raw `veliz` JSON or Markdown markers.
> - Send fails closed before email.
> - Tracked paid access matches the owner `get_user_usage_info` in 74/80 cases. It is more permissive for `free_trial`-profile + active-subscription (6), and for 11 latent `trialing` cases. The same-helper fix verified 80/80 and 32/32 in scratch.
> - Release remains blocked on the real test email, operator validation, founder acceptance and deployment authorization.

## 6. Constraints honored

- Read-only Git object access.
- Scratch trees and a deleted local cluster only.
- No repository writes, hosted access, production mutation, email, preview deletion, spend or external contact.
