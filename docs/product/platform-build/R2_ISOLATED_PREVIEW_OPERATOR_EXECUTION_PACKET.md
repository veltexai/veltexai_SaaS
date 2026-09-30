# R2 isolated-preview operator execution packet

Status: **PREPARED / NOT HOSTED-EXECUTED**

Date: 2026-09-25 Pacific

This packet sequences the **committed** harness. It does not create a second
matrix, migration, or queue implementation.

| Item | Value |
|---|---|
| Isolated preview only | `ynzkwctwlssjcsjmahey` |
| Production — refuse | `iwoaaljitifloolszxlu` (any letter case) |
| Product candidate | `f761469` |
| Evidence / harness head | `99ff465` on `codex/r2-integrated-read-adapter` (includes the independently reviewed `afb679c` evidence pack and its closing fixes) |
| Worktree | `/private/tmp/veltex-r2-integration` |
| Bundle source SHA-256 | `164e90af1c36e807b11c2299098a408521910439c4befe8c0677617c3f76d3c9` |
| Pre-R2 fingerprint | exact 52 prerequisite history rows; repaired migration-029/post-040 template objects; 0 profiles; 0 proposals; empty digest `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`; no `public.organizations`; no `guard_organization_membership()`; zero R2 history rows |

U8 hosted wake, `pgmq`, and HMAC delivery remain **OPEN**. They are not a prerequisite claim for this packet and must not be enabled or selected here.

Cleanup or deletion of preview `ynzkwctwlssjcsjmahey` remains separately gated.
Prior deletion authorization does not apply while R2 hosted evidence is
incomplete.

## Tools to reuse (do not substitute)

| Step | `psql` path (authoritative when available) | SQL Editor path (when `psql` is absent) |
|---|---|---|
| Local prepare | `prepare-hosted-execution.sh` | same |
| Pre-R2 fingerprint | read-only counts/digest matching `preview-baseline-20260926.json` | `sql-editor/00-preview-guard.sql` |
| Atomic apply | `/private/tmp/veltex-r2-preview-atomic.sql` from `build-preview-migration-bundle.mjs` | `/private/tmp/veltex-r2-sql-editor-atomic.sql` from `sql-editor/build-sql-editor-bundle.mjs` |
| Post-R2 fingerprint | same digest on non-`9100`/`9200`/`9300` rows; five R2 history versions present | `sql-editor/_post_r2_fingerprint.fragment.sql` (included by 02/03/04) |
| Role / RLS matrix | `run-hosted.sh` → `sql/r2-hosted-matrix.sql` | `sql-editor/02-hosted-matrix.sql` (owner plus uninvited-role denial; not a positive four-role assignment) |
| Last-owner concurrency | `run-last-owner-concurrency.sh` | `sql-editor/03-last-owner-single-session.sql` is **not** two-session proof |
| U1 benchmark | `run-u1-benchmark.sh --execute-preview` with `R2_U1_EXECUTE=preview` | `sql-editor/04-u1-benchmark.sql` |
| Browser / operator | `HOSTED_APP_CHECKLIST.md` | same; SQL is not a substitute |

Runners refuse production in either letter case and require
`R2_EXPECTED_PROJECT_REF=ynzkwctwlssjcsjmahey` inside the URL.

## Artifact filenames

Save redacted transcripts under `/private/tmp/veltex-r2-hosted-evidence/` only.
Do not commit connection strings, JWTs, customer content, or live emails.

| File | Contents |
|---|---|
| `00-local-prepare.json` | stdout of `prepare-hosted-execution.sh` (bundle paths and source digest) |
| `01-pre-r2-fingerprint.txt` | exact 52 prerequisites, repaired template objects, profile_count `0`, proposal_count `0`, empty digest match, no organizations / R2 history |
| `02-atomic-apply.txt` | apply result; history insert of five versions; source SHA-256 |
| `03-post-r2-fingerprint.txt` | organizations present; exact 52 prerequisites plus versions `20260925002000`…`20260925006000`; legacy digest still `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `04-hosted-matrix.txt` | `R2 HOSTED DATABASE MATRIX PASSED (transaction rolled back)` or SQL-Editor `sql_editor_hosted_matrix` / `PASS` / `owner_plus_uninvited_role_denial` |
| `05-last-owner-concurrency.txt` | `PASS: concurrent final-owner invariant retained` (psql). Record SQL-Editor 03 as single-session only. |
| `06-u1-benchmark.txt` | `u1_evidence` rows, `rls_overhead_ms`, residue check; no production URL |
| `07-hosted-app-checklist.md` | filled copy of `HOSTED_APP_CHECKLIST.md` with preview URL, `f761469`, timestamps |

## Sequence

### S0 — local prepare (no database)

```bash
cd /private/tmp/veltex-r2-integration
./quality/r2-hosted-verification-20260925/prepare-hosted-execution.sh
```

**PASS:** both generated bundles exist; source SHA-256 matches the table above;
script prints `PREPARED / NOT HOSTED-EXECUTED`.
**FAIL / abort:** production ref in any env; unexpected project ref; bundle
builder exception.

### S1 — pre-R2 fingerprint (read-only hosted)

Open dashboard project `ynzkwctwlssjcsjmahey` only. Never open production.
Run `sql-editor/00-preview-guard.sql` or the equivalent count/digest query.

**PASS:** evidence_key `sql_editor_preview_fingerprint`; identity
`pre_r2_isolated_preview_baseline`; exact 52-row history, repaired-template
objects, counts and digest match.
**FAIL / abort:** organizations exist; R2 history present; digest/count mismatch;
session labeled `iwoaaljitifloolszxlu`.

### S2 — atomic preview bundle (hosted mutation; approval required)

Apply **one** generated bundle to that preview only.

**PASS:** five R2 `schema_migrations` rows; required organization tables and
guards exist; null `active_organization_id` count is 0.
**FAIL / abort:** preflight fingerprint failure; partial apply; unexpected
application rows or a non-empty proposal digest.

### S3 — post-R2 fingerprint (read-only)

Re-check legacy (non-`9100`/`9200`/`9300`) profile/proposal counts and digest,
plus presence of `20260925006000`.

**PASS:** 0 / 0 / recorded empty digest, exact 52 prerequisites plus five R2 rows.
**FAIL / abort:** any mismatch.

### S4 — hosted role / RLS matrix

`psql`: `R2_PREVIEW_DATABASE_URL`, `R2_EXPECTED_PROJECT_REF=ynzkwctwlssjcsjmahey`,
`R2_CANDIDATE_COMMIT=f761469`, then `./run-hosted.sh`.
SQL Editor: `02-hosted-matrix.sql` after the post-R2 fingerprint.

**PASS:** matrix script completes and rolls back; legacy digest unchanged;
signup bootstrap; owner positives; uninvited admin/estimator/viewer denials;
audit/outbox/inbox; last-owner deny inside the transaction.
**FAIL / abort:** any raised exception; digest change; production URL accepted.

### S5 — last-owner concurrency

`psql` only for the contractual two-session proof:
`./run-last-owner-concurrency.sh`.

**PASS:** `PASS: concurrent final-owner invariant retained` and cleanup leaves
no `92000000-…` residue.
**FAIL / abort:** owner count drops below 1; cleanup residue.
SQL-Editor 03 may be recorded as supporting single-session evidence only.

### S6 — U1 membership benchmark

```bash
R2_U1_EXECUTE=preview \
R2_PREVIEW_DATABASE_URL='…ynzkwctwlssjcsjmahey…' \
R2_EXPECTED_PROJECT_REF=ynzkwctwlssjcsjmahey \
./quality/r2-hosted-verification-20260925/run-u1-benchmark.sh --execute-preview
```

Or SQL Editor `04-u1-benchmark.sql`.

**PASS:** every FAIL rule in `R2_U1_MEMBERSHIP_RLS_BENCHMARK.md` is absent;
`rls_overhead_ms` recorded; residue check passes.
**FAIL / abort:** those FAIL rules; production accepted; leftover `9300` fixtures.
Plan shape is RECORD ONLY.

### S7 — authenticated browser / operator checklist

Complete `HOSTED_APP_CHECKLIST.md` against a preview-backed app. SQL is not
proof of signup, send, PDF, or tracked-link behavior.

**PASS:** every checkbox has redacted evidence.
**FAIL / abort:** cross-tenant leak; invitation path appears; real customer
email; production Auth/project used.

## Abort criteria (stop; do not improvise)

- Dashboard, URL, or GUC names production `iwoaaljitifloolszxlu`.
- Database fingerprint does not match the recorded isolated-preview baseline.
- Legacy proposal digest changes.
- Matrix, last-owner, or U1 raises or leaves residue.
- Any live invitation capability or service-role membership manufacture.
- Real customer email, credential creation, or production data access.
- Enabling `pg_cron`, `pgmq`, QStash, Inngest, or claiming U8 closed.
- Changing the product candidate to “make it pass.”
- Preview deletion or production deploy.

On abort: keep the redacted transcript, leave the preview in place, and do not
retry a rejected path.

## Still requiring consequential approval

1. Applying the R2 atomic bundle to preview `ynzkwctwlssjcsjmahey`.
2. Providing / using the isolated preview database URL or SQL Editor session.
3. Executing hosted matrix, last-owner concurrency, and U1.
4. Pointing a preview app/Auth surface at that project for S7.
5. Any paid-entitlement, send, or one-time delivery acceptance.
6. Enabling hosted U8 wake (`pg_cron` / `pgmq`) or HMAC webhook delivery.
7. Creating or rotating credentials.
8. Deleting preview `ynzkwctwlssjcsjmahey`.
9. Founder acceptance of R2.
10. Production deployment, merge, or push.

## Local prepare only (this assignment)

```bash
./quality/r2-hosted-verification-20260925/prepare-hosted-execution.sh
```
