# U1 membership-RLS benchmark pack

Status: **PREPARED / NOT EXECUTED**  
Date: 2026-09-25 Pacific  
Candidate head this pack was prepared against: `f761469` on `codex/r2-integrated-read-adapter`  
Authoritative ledger: `/private/tmp/veltex-r2-integration/docs/OPERATING_STATE_AND_DECISION_LEDGER.md`

This is evidence preparation only. It does not modify product code, migrations, or
the R3-1 contract. It must not be run against production.

## Binding sources

- Prompt 2 Codex U1: membership lookup is authoritative; every request carries an
  explicit organization ID; `auth.uid()` binds the caller; benchmark indexed
  membership/permission lookups on a Supabase clone before relying on them;
  caching may optimize but never authorize.
- Prompt 2 original U1 tradeoff: membership helper on every query vs stale
  `org_ids` JWT claims. The committed R2 helpers already chose membership lookup.
- `docs/product/platform-build/R2_MIGRATION_AND_ROLLBACK.md` “Performance
  evidence required before release”: capture `EXPLAIN (ANALYZE, BUFFERS)` for
  organization-scoped proposal reads, dependent export/add-on checks, and
  pending-outbox ordering. Source indexes are candidates, not hosted proof.
- Prompt 3 §12.1 / S0 and Prompt 14 §8 mention measuring membership-RLS overhead.
  The 5,000-opportunity / 1.5 s figure is a later CRM board hypothesis, **not**
  an R2 numeric SLA. This pack does not invent that SLA as a pass gate.

## What is measured

| Query key | Role | Path |
|---|---|---|
| `q1_membership_lookup` | authenticated owner A | `organization_memberships` by `(organization_id, auth.uid())` — the U1 helper body |
| `q2_org_scoped_proposals_rls` | authenticated owner A | `proposals` filtered by `organization_id` under current RLS (`can_edit_organization_work`) |
| `q3_org_scoped_proposals_bypass` | `service_role` | same proposal filter with RLS bypass |
| `q4_export_addon_paths_rls` | authenticated owner A | `proposals` ⟕ `proposal_additional_services` ⟕ `pdf_exports` |
| `q6_pending_outbox_order` | `service_role` | pending outbox ordered by `(available_at, event_sequence)` |

`rls_overhead_ms` is `q2.execution_ms - q3.execution_ms`. Record it. Do not fail
the pack on that number; no hosted millisecond budget is recorded in Prompt 2/U1
or the R2 rollback procedure.

Estimator/viewer plans are **not** seeded. R2 invitations are fail-closed, so
only signup-bootstrap owner memberships can be created. That limitation is
current product truth, not a waiver of later role-matrix checks.

Fixture volume is 64 org-A proposals and 8 org-B proposals. That is a
deterministic plan-shape fixture, not a 5,000-row CRM load.

## Safe seed / cleanup

- UUID prefix `93000000-…` (matrix uses `9100…`, last-owner uses `9200…`).
- Addresses are `*.example.test` only.
- The SQL file is one transaction that **rolls back**.
- After rollback it asserts no leftover `r2-u1-%@example.test` auth users, no
  `93000000-…` proposals, and no `u1-rls-benchmark-flat` catalog SKU.
- Baseline proposal digest is printed before rollback for operator comparison
  against the post-rollback database.
- The runner refuses production project `iwoaaljitifloolszxlu`, requires
  `R2_EXPECTED_PROJECT_REF` to appear in the URL, and requires
  `R2_U1_EXECUTE=preview` plus `--execute-preview`. Default invocation is
  dry-run and does not open a database.

## Expected evidence fields

Capture and retain (redact URLs, JWTs, customer content):

- preview project ref (not production);
- candidate commit;
- `u1_baseline` profile/proposal/outbox counts and proposal digest;
- every `u1_evidence` row: `query_key`, `role_used`, `row_count`,
  `planning_ms`, `execution_ms`, `shared_hit`, `shared_read`, index flags,
  `seq_scan_memberships`;
- `rls_overhead_ms`;
- statement that the residue check passed after rollback.

Do not commit connection strings or EXPLAIN payloads that include customer text
from the preview’s real rows. Synthetic `U1-CONTENT-*` strings are fixtures.

## Pass / fail thresholds

**FAIL (SQL-enforced when later executed on an isolated preview):**

- R2 tables or migration `20260925006000` absent;
- signup bootstrap did not create exactly one owner membership per fixture user;
- owner A membership leaked into org B, or owner A read any org B proposals;
- authenticated role could `SELECT` `organization_event_outbox`;
- `q1` row_count ≠ 1, `q2`/`q3` ≠ 64, `q4` < 64, `q6` < 1;
- residue remained after rollback;
- runner accepted the production project ref.

**PASS (when later executed):** every FAIL rule is absent, evidence fields above
are recorded, and `rls_overhead_ms` is stored for the U1 spike file.

**RECORD ONLY (not a fail):** absolute execution times and all index/scan flags.
PostgreSQL may correctly prefer a sequential scan for these deliberately small
fixtures, so plan choice is evidence rather than an invented failure threshold.
The committed index definitions are checked separately; a representative-volume
hosted result is required before using these measurements to set an SLA. Also
record whether `q2` used `proposals_organization_idx` (RLS helper cost may
dominate the outer plan) and Prompt 3's later 1.5 s / 5,000-opportunity CRM
target without treating either as an R2 pass gate.

## Artifacts

- `quality/r2-hosted-verification-20260925/sql/u1-membership-rls-benchmark.sql`
- `quality/r2-hosted-verification-20260925/run-u1-benchmark.sh`

Default command (does not touch a database):

```bash
./quality/r2-hosted-verification-20260925/run-u1-benchmark.sh
```
