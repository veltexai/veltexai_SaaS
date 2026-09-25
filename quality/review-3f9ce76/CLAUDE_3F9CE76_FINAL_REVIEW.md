# Claude Final Bounded Review — `644000d..3f9ce76`

- **Reviewer:** Claude (independent)
- **Date:** 2026-09-24
- **Branch:** `codex/r0-privilege-hardening`
- **Range:** `3293601` (already reviewed in `CLAUDE_3293601_FOLLOWUP_REVIEW.md`) plus `3f9ce76` "fix: align tracked paid entitlement precedence".
- **What `3f9ce76` changes:** exactly two files, +25/−11.
  - `supabase/migrations/20260924013000_sync_tracked_engagement_fields.sql`: `tracked_proposal_has_paid_access` only.
  - `features/service-catalog/__tests__/r0-privilege-hardening.test.ts`: static assertions only.

## Verdicts

| | Verdict |
|---|---|
| **Correction `644000d..3f9ce76`** | **PASS.** L1′ is closed. The tracked paid check now matches the actual owner `get_user_usage_info` in **80/80** reachable combinations and **32/32** latent `trialing` combinations, with no NULL results. The exact `CHECK_DEFINERS=1` gate passes. An unknown, short, empty or NULL token returns SQL NULL; every caller treats that as denied. No Critical, High or Medium findings remain. |
| **Release gate** | **FAIL / NOT APPROVED, on external gates only:** a real test email with the PDF and tracked link, cleaning-operator pricing validation, founder acceptance and deployment authorization. Code review of the Release 1 paid-delivery delta is complete. |

---

## 1. Method and integrity

- **How I read the commits:** through the shared Git objects, read-only.
  - `git diff --stat 3293601 3f9ce76` lists only the two files above.
  - `app/`, the other `features/` files, the other migrations, the harness and the committed evidence PDF are **byte-identical** to `3293601`.
- **Carried-forward proofs:** these remain valid without re-execution.
  - M1: the corrected public PDF, `c8d4e5af…a64a`, has no raw `veliz` JSON or Markdown.
  - M2: the send route fails closed before email.
  - The H1 allowlist and F4a–F4c negatives are unchanged (`30_assertions.sql` `a863dfd0…6787`), and I re-executed them below.
- **Scratch copy:** my verified `3293601` copy with the new function body applied. SHA-256 matches `git show 3f9ce76:<path>`: `20260924013000…sql` → `a0875a08…6181`.
- **Database environment:** local PostgreSQL 16 in a disposable cluster, run as the unprivileged `postgres` OS user. I stopped and deleted the cluster.
- **Nothing else touched:** no repository writes, hosted access, email, production, deletion, spend or humans.

## 2. Exact gate (no diagnostic patch)

| Check | Result |
|---|---|
| `CHECK_DEFINERS=1 run_all.sh` on the exact candidate | 51 migrations applied; OWNER MATRIX PASSED; **ALL ASSERTIONS PASSED** (H1 allowlist, H2–H6, F4a–F4c); injection, dirty data, rerun (idempotent) and 40-way concurrency passed; HARNESS COMPLETE, **exit 0** |
| `definer-inventory.sql` | exit 0, with 0 `RELEASE BLOCKED` |
| Function metadata after the change | SECURITY DEFINER, STABLE, `search_path = pg_catalog, public`. ACL: `postgres`, `anon`, `authenticated`, `service_role`. No PUBLIC grant. |

## 3. Precedence matrix against the actual owner helper

The owner side is `get_user_usage_info(owner)`, called through the R0 wrapper **as the signed-in owner**; "paid" means `subscription_status = 'active'`. The tracked side is `tracked_proposal_has_paid_access(token)` called as `anon`. Agreement is strict: a NULL counts as a mismatch.

| Matrix | Combinations | Agree | NULL | Disagree |
|---|---|---|---|---|
| 8 profile statuses × 10 subscription sets, including multiple rows in both orders (`active+cancelled`, `cancelled+active`, `active+active`, `past_due+active`, `active+past_due`) | 80 | **80** | 0 | **0** |
| Latent `trialing` combinations (8 profiles × `trialing`, `active+trialing`, `trialing+active`, `cancelled+trialing`), with the harness status constraint removed inside a rolled-back transaction | 32 | **32** | 0 | **0** |

In `3293601` the same matrices gave 74/80 and 21/32. The four precedence cases the new SQL implements are all covered, and all agree:

1. **Profile `free_trial` → deny,** even with active rows. This is the six `free_trial`-plus-active cases that previously disagreed.
2. **Otherwise the newest `active`/`trialing` row decides:** `active` → allow, `trialing` → deny. `cancelled`, `past_due` and `unpaid` rows are ignored.
3. **No active or trialing row → allow only if the profile is `active`** (legacy parity).
4. **Otherwise deny.** A NULL profile status gives tracked `false` and owner NULL, which is not paid; they agree.

**Exact `created_at` ties:** both functions order by `created_at desc limit 1` with no tiebreaker. In two insertion orders, both picked the same row and agreed: T,A → both `trialing`/false; A,T → both `active`/true. A tie is technically nondeterministic in both functions alike. See I1.

## 4. Unknown and NULL token handling

| Input (as anon) | Result |
|---|---|
| Unknown 36-character token | **NULL** |
| 19-character token | **NULL** |
| `NULL` | **NULL** |
| `''` | **NULL** |
| Known fixture token | `true` (profile active) |

- **Why NULL:** the new body is a scalar SQL function whose `WHERE` matches no row, so it returns SQL NULL rather than `false`. The inner `coalesce(…, false)` only applies when a row exists.
- **Fail-closed assessment:** every current consumer denies on NULL.
  - **Download route** (`app/api/proposals/[id]/download/route.ts`, unchanged): `Boolean((await supabase.rpc('tracked_proposal_has_paid_access', …)).data)`. NULL and RPC errors both give `false` → 403.
  - **An unknown token never reaches this check:** `read_tracked_proposal` must first return a payload bound to the same proposal id, or the route returns 404.
  - **Harness F4c** (`if fn(...) then raise`): NULL is treated as false; the assertion passes and correctly denies.
- **Latent pitfall:** a future SQL caller written as `if not fn(token)` would **fall through** on NULL. I demonstrated this: `NOT NULL` is not true.

**I2 (Info) recommendation:** wrap the whole body so the function returns `false` on no row, making its contract explicitly boolean. For example: `select coalesce((select … limit 1), false)`, or `coalesce(max(...), false)`. Also add `is false` assertions for an unknown token and a NULL token.

## 5. Remaining findings

| ID | Severity | Status |
|---|---|---|
| L1 / L1′ | — | **Closed** (80/80, 32/32) |
| H1, M1, M2 | — | **Closed** (carried proofs; H1 re-executed) |
| L2 | Low | Carried: public engagement writes are unbounded per token (rate limit or de-duplicate). |
| L3 | Low | Carried: the new tests are static string checks. The SQL gate negatives are executable. Suggest adding this precedence matrix as a harness assertion. |
| L4 | Low | Carried: the committed preview token `release1-qa-20260924` (20 characters, satisfies the minimum) is human-readable. Revoke it or delete the preview when evidence is complete. |
| I1 | Info | Carried: the delivery-method migration has no transaction and drops by exact name only. **New:** exact `created_at` ties are nondeterministic in both the owner and tracked functions. Add `, id desc` to both if strict determinism matters. |
| I2 | Info | New: an unknown or NULL token returns SQL NULL rather than `false`. Current callers deny, so it is fail-closed today. Coalesce the whole body to harden it. |
| I3 | Info | Carried: the applied migration `20260924013000` was edited in place twice. The preview function body is tracked out-of-band. |

## 6. Suggested ledger entry (not written)

> Claude final bounded review `644000d..3f9ce76`: **PASS.**
> - Exact `CHECK_DEFINERS=1` exit 0; inventory clean.
> - Tracked paid access equals the owner `get_user_usage_info` in 80/80 plus 32/32 latent-`trialing` combinations.
> - Unknown/short/empty/NULL tokens return SQL NULL, which all callers deny (Info: coalesce to `false`).
> - H1/M1/M2 proofs carried on byte-identical files.
> - Remaining Low/Info: unbounded engagement writes, static tests, guessable preview token, migration robustness, tie determinism.
> - Release remains blocked only on the real test email, operator pricing validation, founder acceptance and deployment authorization.

## 7. Constraints honored

- Read-only Git object access.
- Scratch copies and a deleted local PostgreSQL cluster only.
- No hosted access, email, repository changes, production, deletion, spend or external humans.
