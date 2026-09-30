# R2 SQL Editor execution pack

Status: **PREPARED / NOT HOSTED-EXECUTED**

The `psql` runners remain the hosted execution path. They were concurrently
hardened to refuse upper- or lower-case production refs. This directory only
prepares SQL-Editor-compatible variants because local `psql` is unavailable
and those runners use `\set` / `\gset` / `\echo`.

Database identity is the recorded isolated-preview fingerprint from
`preview-baseline-ynzkwctwlssjcsjmahey-20260930.json`: the exact 52-version
pre-R2 history, repaired migration-029 plus post-R0 implementation/wrapper,
zero profiles,
zero proposals, and empty proposal-content SHA-256
`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. A pasted
project ref is not evidence of database identity. Production project
`iwoaaljitifloolszxlu` is named only as defense in depth. A local JS dry-run
does not prove hosted production refusal.

## Operator order

1. Open the isolated preview in the Supabase dashboard. Never open production.
2. Run `00-preview-guard.sql`. It refuses unless the current database matches
   the pre-R2 fingerprint. No preview-ref paste is required.
3. Generate the migration bundle locally; do not commit it:

   ```bash
   node ./quality/r2-hosted-verification-20260925/sql-editor/build-sql-editor-bundle.mjs
   ```

   Paste `/private/tmp/veltex-r2-sql-editor-atomic.sql` only into a database
   that already passed that fingerprint, and only if a later hosted assignment
   authorizes it. History insert shape is `(version text, statements text[],
   name text)`.
4. Run `02-hosted-matrix.sql` (two-tenant owner plus uninvited-role denial,
   signup bootstrap, audit / outbox / inbox, legacy proposal digest; one
   transaction that rolls back). This is not a positive four-role assignment.
   Invitations remain fail-closed.
5. Run `03-last-owner-single-session.sql`. This is **not** two-session
   concurrency; `run-last-owner-concurrency.sh` remains the concurrency proof.
6. Run `04-u1-benchmark.sql` (rolled-back U1 evidence).

Regenerate 02 and 04 from the authoritative `sql/` sources when those sources
change:

```bash
node ./quality/r2-hosted-verification-20260925/sql-editor/emit-sql-editor-checks.mjs
node ./quality/r2-hosted-verification-20260925/sql-editor/emit-sql-editor-checks.mjs --check
```

## Local checks that do not touch a database

```bash
node ./quality/r2-hosted-verification-20260925/sql-editor/dry-run.mjs
```
