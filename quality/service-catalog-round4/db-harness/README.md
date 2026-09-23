# Derived synthetic Postgres harness — round 4

Derived from Claude's downloaded round-3 harness, inspected before inclusion. Original archive SHA256: b84fed0e184f337a9ae95d22a203ade80d784fbc2796aed30f19806581ab801c. It uses an approximate Supabase auth/storage/default-grants shim and synthetic fixtures, not a real target.

Safety changes: dedicated newly initialized Unix-socket cluster only; no TCP; a marker and server data_directory check before mutations; fixed harness database-name prefix; no scratch patches; concurrency propagates every worker failure. The rerun test now requires success and the dirty-data test explicitly checks the old row survives. New stats/service-role assertions follow the original matrix.

Requirements: PostgreSQL 16 binaries and psql, bash; run as a non-root OS user. Do not point any script at an existing database or production tunnel.

```sh
export HARNESS_PGDATA=/tmp/veltex-catalog-unique-run
export PG_BIN=/usr/lib/postgresql/16/bin
export PATH="$PG_BIN:$PATH"
quality/service-catalog-round4/db-harness/start_cluster.sh
MIGRATIONS_DIR="$PWD/supabase/migrations" quality/service-catalog-round4/db-harness/run_all.sh
# Mandatory RELEASE gate; currently expected to FAIL on the preexisting RPC exposure:
CHECK_DEFINERS=1 MIGRATIONS_DIR="$PWD/supabase/migrations" quality/service-catalog-round4/db-harness/run_all.sh
quality/service-catalog-round4/db-harness/start_cluster.sh stop
```

The behavioral checks do not waive the definer gate. Do not add functions to its allowlist merely to get green CI. R3-3 remains a release blocker. Claude ran the ORIGINAL harness against scratch-patched round-3 migrations; execution of THIS derived harness and the unpatched round-4 chain must be recorded separately.
