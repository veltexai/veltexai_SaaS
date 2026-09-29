# R2 isolated Supabase verification harness

Status: **PREPARED — NOT EXECUTED AGAINST THE FINAL INTEGRATED CANDIDATE**

Candidate: exact integrated product/recovery head `d128518`; later
evidence-only and replay-remediation commits do not change application product
code or committed migration bodies.

U1 membership-RLS benchmark and U8 runtime memo remain **PREPARED / NOT
EXECUTED** against any hosted database. They live in this directory plus
`docs/product/platform-build/R2_U1_MEMBERSHIP_RLS_BENCHMARK.md` and
`docs/product/platform-build/R2_U8_RUNTIME_READINESS.md`. The U1 runner defaults
to dry-run and refuses production project `iwoaaljitifloolszxlu`.

SQL-Editor variants live in `sql-editor/` and are **PREPARED / NOT
HOSTED-EXECUTED**. They exist because local `psql` is unavailable. The
authoritative `psql` runners `run-hosted.sh`, `run-last-owner-concurrency.sh`
and `run-u1-benchmark.sh` were concurrently hardened to refuse upper- or
lower-case production refs. The SQL-Editor migration bundle refuses
unless the current database matches the recorded isolated-preview fingerprint
(pre-R2 schema/history, 1 profile, 2 proposals, digest
`b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f`). A pasted
preview ref is not identity. A local JS dry-run does not prove hosted
production refusal. The SQL-Editor `02` check is two-tenant owner plus
uninvited-role denial, not a positive four-role assignment. A local in-memory
U8 claim/retry/DLQ spike lives in `u8-local-spike/`; it does not install or
enable `pg_cron`, `pgmq`, QStash, or Inngest, and the runtime choice remains
**OPEN**.

Founder hosted-execution order for isolated preview `wcnfhriosemgchmtwgof` is
`docs/product/platform-build/R2_ISOLATED_PREVIEW_OPERATOR_EXECUTION_PACKET.md`.
Local prepare (no database):
`./quality/r2-hosted-verification-20260925/prepare-hosted-execution.sh`.
U8 hosted wake/pgmq/HMAC remains OPEN and is not a prerequisite.

## Fresh-preview prerequisite reconciliation

### Required execution mode: bounded per-migration plan

Use the per-migration plan for hosted SQL-Editor recovery. It emits 23 separate
artifacts plus a manifest. Every artifact checks the exact prior history and
empty-preview boundary, executes one source migration, proves a migration-
specific observable outcome, and only then writes that migration's history
row. Execute exactly one artifact at a time in manifest order and stop on the
first error. Never skip forward or manually insert a history row. Allowed
clients are the Supabase SQL Editor (one complete artifact per Run) or `psql`
with `-v ON_ERROR_STOP=1`. Do not use clients configured to continue after an
error, batch multiple artifacts into one Run, or resume inside an artifact.

```sh
npm run migrations:validate
npm run r2:validate-prerequisite-plan
npm run r2:build-prerequisite-plan
npm run r2:verify-prerequisite-plan
```

The generated directory is
`/private/tmp/veltex-r2-prerequisite-replay/`. It is local operator material,
not a repository artifact. The rejected single-transaction recovery builder
was removed. It must not be reconstructed or used for SQL-Editor recovery:
migration `20260913000000` contains an intentional commit before final
constraint validation, and each step requires its own verified postcondition
before history can advance.

This directory is the bounded hosted-verification plan for R2 organization and
tenancy. It does not apply migrations, discover credentials, send email, deploy,
or touch production. Run prerequisite recovery first against the named disposable
isolated Supabase preview; only after all 23 steps pass may the exact R2 candidate
migrations be applied.

## Required evidence

1. Record pre-migration counts and SHA-256 digests for proposal content.
2. Apply the unmodified candidate migrations in order through
   `20260925006000_r2_cleanup_guard_ordering.sql`.
3. Run `./run-hosted.sh` with an isolated preview database URL.
4. Run `./run-last-owner-concurrency.sh` against the same preview.
5. Complete `HOSTED_APP_CHECKLIST.md` through the preview application/Auth
   surface. SQL simulation is not proof of signup, send, PDF, or tracked-link
   behavior.
6. Save redacted output under an evidence directory. Never commit connection
   strings, JWTs, customer content, or email addresses.

## Matrix covered by SQL

- two organizations;
- owner, uninvited-role candidates, non-member, anonymous and service-role paths;
- fail-closed denial of arbitrary service-role membership creation;
- same-tenant permissions and cross-tenant read/write denials;
- hostile `active_organization_id` input;
- immutable organization and creator attribution;
- final-owner protection;
- append-only audit records;
- browser denial for outbox/inbox and service-role inbox idempotency/conflict;
- fail-closed backfill/orphan checks and proposal-content digest reporting.

All SQL fixtures use reserved `.test` addresses and execute inside a transaction
that rolls back. The separate concurrency test creates one synthetic organization
and deletes it after the assertion; interruption cleanup instructions are printed
by the runner.

## Usage

```bash
node ./quality/r2-hosted-verification-20260925/build-preview-migration-bundle.mjs
export R2_PREVIEW_DATABASE_URL='postgresql://...isolated-preview...'
export R2_EXPECTED_PROJECT_REF='the-isolated-preview-ref'
export R2_CANDIDATE_COMMIT='f761469'
./quality/r2-hosted-verification-20260925/run-hosted.sh
./quality/r2-hosted-verification-20260925/run-last-owner-concurrency.sh
./quality/r2-hosted-verification-20260925/run-u1-benchmark.sh
```

The runners reject the production project reference
`iwoaaljitifloolszxlu` in either letter case, require an expected preview
reference, and refuse a URL that does not contain that reference. They never
apply the migration.

The bundle builder creates `/private/tmp/veltex-r2-preview-atomic.sql` from the
five committed R2 migrations. It validates each source transaction boundary,
removes the individual boundaries, wraps the exact bodies in one atomic
transaction and adds fail-closed pre/postconditions. This prevents a later
migration failure from leaving the preview partially upgraded. The generated
bundle is local evidence only and must not be committed.

When `psql` is unavailable, use the SQL-Editor pack instead of rewriting the
authoritative runners:

```bash
node ./quality/r2-hosted-verification-20260925/sql-editor/dry-run.mjs
node ./quality/r2-hosted-verification-20260925/sql-editor/build-sql-editor-bundle.mjs
node --test ./quality/r2-hosted-verification-20260925/u8-local-spike/outbox-claimer.test.mjs
```

Never paste generated SQL into production `iwoaaljitifloolszxlu`. The SQL
Editor bundle itself refuses when the database fingerprint does not match the
recorded isolated preview. Dashboard selection remains operator caution, not
proof.
