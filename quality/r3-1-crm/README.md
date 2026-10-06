# R3-1 CRM performance evidence

## Production release preflight

`build-production-rollback-proof.mjs` is the first non-committing production
release gate. It accepts only the exact reviewed read-only production capture,
the accepted R3-1 migration hashes, and application commit `0d765d7`. It emits
one transaction that locks the current application tables, revalidates the
complete captured catalog/privilege/content/invariant state, executes both
R3-1 migrations, emits hashes-only postflight evidence through a deliberate
exception, and therefore cannot commit.

Generate and statically verify the reviewed candidate with:

```sh
node quality/r3-1-crm/build-production-rollback-proof.mjs \
  /private/tmp/veltex-r3-1-production-preflight.json \
  /private/tmp/veltex-r3-1-production-rollback-proof-v2.sql
npm run r3-1:test-production-rollback-proof
```

Running the generated SQL against production is a separately approved action.
Its evidence must be independently matched before any commit-capable artifact
is generated. Never deploy the current integration branch for R3-1; it contains
unaccepted R3-2 work. Build the application from the exact accepted commit.
Use `PRODUCTION_ROLLBACK_PROOF_VERDICT_RECONCILIATION.md` to reconcile the
independent verdicts and preserve the separate execution-authorization gate.

After the deliberate proof exception, close or explicitly roll back that
dedicated session. Generate the separate read-only cleanup query from the same
reviewed production capture and run it only in a fresh session:

```sh
node quality/r3-1-crm/build-production-rollback-cleanup.mjs \
  /private/tmp/veltex-r3-1-production-preflight.json \
  /private/tmp/veltex-r3-1-production-rollback-cleanup.sql
npm run r3-1:test-production-rollback-cleanup
```

The cleanup refuses any migration-history or public CRM-relation residue and
returns hashes-only evidence. It neither substitutes for proof authorization
nor authorizes a migration, deployment, environment change or feature enable.

`crm-performance-benchmark.sql` is a rollback-only PostgreSQL benchmark for the
six query families required by the R3-1 release contract. It expects the fresh
65-migration disposable catalog harness plus its synthetic `.test` fixtures.
It inserts 2,000 leads, 500 customers/opportunities/tasks, and 250 walkthroughs,
captures `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`, prints hashes-free plan
metrics, and rolls every synthetic row back.

This is diagnostic evidence, not a production latency claim. Hosted preview
must still repeat the benchmark before release because index definitions and a
local PostgreSQL 16 plan cannot prove Supabase PostgreSQL 17 performance.

## 2026-10-01 local baseline

Fresh 65-migration PostgreSQL 16 harness, warm shared buffers:

| Query family | Execution ms | Shared hits | Expected query index selected |
|---|---:|---:|---|
| Board RPC | 19.918 | 2,950 | No |
| Board assignment/RLS | 19.045 | 4,078 | No |
| Duplicate email | 1.623 | 235 | No |
| Membership lookup | 0.047 | 4 | No (two-row membership table) |
| Open tasks | 18.648 | 6,087 | No |
| Stage/history | 37.447 | 18,214 | No |
| Walkthrough overlap | 0.144 | 20 | Yes |
| Idempotency receipt | 0.003 | 0 | No row / zero-hit lookup |

The planner reasonably preferred sequential scans for several 500-row fixture
relations and the two-row membership table. This evidence records cost; it does
not turn local index selection into a release assertion. The slowest local plan
was 37.447 ms, below the script's diagnostic 250 ms refusal ceiling. A separate
query after `ROLLBACK` returned `0|0|0|0` for leads, opportunities, tasks, and
walkthroughs, proving the synthetic benchmark left no CRM rows behind.
