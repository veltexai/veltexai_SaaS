#!/usr/bin/env bash
# Sourced before every database mutation, including standalone helper execution.
: "${HARNESS_PGDATA:?Dedicated harness cluster required}"
case "$HARNESS_PGDATA" in /tmp/veltex-catalog-*) ;; *) echo 'Refusing non-harness directory' >&2; exit 2;; esac
export PGHOST="$HARNESS_PGDATA" PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-$(id -un)}"
unset PGHOSTADDR PGSERVICE PGSERVICEFILE
export PGDATABASE=postgres
[ -f "$HARNESS_PGDATA/.veltex-disposable" ] || { echo 'Missing disposable-cluster marker; refusing database access' >&2; exit 2; }
actual_data=$(psql -X -q -At -v ON_ERROR_STOP=1 -d postgres -c 'show data_directory') || { echo 'Unable to verify disposable server data directory' >&2; exit 2; }
[ "$actual_data" = "$HARNESS_PGDATA/data" ] || { echo 'Connected server is not the disposable harness' >&2; exit 2; }
