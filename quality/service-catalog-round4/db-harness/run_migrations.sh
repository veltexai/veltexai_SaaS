#!/usr/bin/env bash
# Ordered migration runner for a disposable, synthetic Postgres (no credentials, no hosted targets).
#
# Usage:
#   MIGRATIONS_DIR=path/to/supabase/migrations ./run_migrations.sh [--scratch-patches] [--db NAME]
#
# Environment (all optional; defaults target a throwaway local cluster started by start_cluster.sh):
#   PGHOST (default /tmp/veltex-harness-pg)  PGPORT (default 55432)  PGUSER (default current user)
#
# What it does:
#   1. Refuses any non-local PGHOST (socket path, localhost or 127.0.0.1 only).
#   2. Creates database NAME (default veltex_harness), applies sql/00_supabase_shim.sql.
#   3. Applies every *.sql in MIGRATIONS_DIR in byte-order (LC_ALL=C sort), ON_ERROR_STOP=1,
#      stopping at the first failure and printing which file failed.
#   4. With --scratch-patches, applies patches/SCRATCH-*.patch to a TEMP COPY of the migrations
#      first. These are review-only compatibility patches for R3-1 and R3-2; a correct candidate
#      must pass WITHOUT them.
#   5. After the base chain (everything before 20260922000000) it snapshots <NAME>_base_tpl
#      for injection_tests.sh.
set -euo pipefail
for arg in "$@"; do if [ "$arg" = --scratch-patches ]; then echo 'Scratch patches forbidden for candidate checks' >&2; exit 2; fi; done
source "$(cd "$(dirname "$0")" && pwd)/guard_local.sh"
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${MIGRATIONS_DIR:?set MIGRATIONS_DIR to the repository supabase/migrations directory}"
export PGHOST="${PGHOST:-/tmp/veltex-harness-pg}" PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-$(id -un)}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
DB=veltex_harness; PATCH=0
while [ $# -gt 0 ]; do case "$1" in
  --scratch-patches) PATCH=1;; --db) DB="$2"; shift;; *) echo "unknown arg $1"; exit 2;; esac; shift; done
case "$PGHOST" in /*|localhost|127.0.0.1) ;; *) echo "Refusing non-local PGHOST=$PGHOST"; exit 3;; esac

[[ "$DB" =~ ^veltex_harness[a-z0-9_]*$ ]] || { echo "Refusing unexpected database name" >&2; exit 2; }
SRC="$MIGRATIONS_DIR"
if [ "$PATCH" = 1 ]; then
  TMP="$(mktemp -d)"; mkdir -p "$TMP/supabase/migrations"; cp "$MIGRATIONS_DIR"/*.sql "$TMP/supabase/migrations/"; chmod u+w "$TMP"/supabase/migrations/*.sql
  for p in "$HERE"/patches/SCRATCH-*.patch; do
    echo "SCRATCH PATCH (review-only): $(basename "$p")"; (cd "$TMP" && patch -p1 --forward --quiet < "$p")
  done
  SRC="$TMP/supabase/migrations"
fi

PSQL=(psql -X -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -d postgres -c "drop database if exists ${DB}_base_tpl" -c "drop database if exists $DB" -c "create database $DB"
"${PSQL[@]}" -d "$DB" -f "$HERE/sql/00_supabase_shim.sql"
tpl_done=0
for f in $(cd "$SRC" && ls -1 *.sql | LC_ALL=C sort); do
  if [ "$tpl_done" = 0 ] && [[ "$f" > "20260922000000" ]]; then
    "${PSQL[@]}" -d postgres -c "create database ${DB}_base_tpl template $DB"; tpl_done=1
    echo "snapshot: ${DB}_base_tpl (base chain before catalog migrations)"
  fi
  if ! "${PSQL[@]}" -d "$DB" -f "$SRC/$f" > /tmp/veltex-harness-last.log 2>&1; then
    echo "FAILED: $f"; grep -E "ERROR|LINE|HINT" /tmp/veltex-harness-last.log | head -5; exit 1
  fi
  echo "ok: $f"
done
echo "ALL MIGRATIONS APPLIED to $DB"
