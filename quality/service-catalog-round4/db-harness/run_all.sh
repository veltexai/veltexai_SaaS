#!/usr/bin/env bash
# End-to-end: migrations -> fixtures -> Codex owner matrix -> assertions -> injection -> concurrency.
# Usage: MIGRATIONS_DIR=... ./run_all.sh [--scratch-patches]
set -euo pipefail
for arg in "$@"; do if [ "$arg" = --scratch-patches ]; then echo 'Scratch patches forbidden for candidate checks' >&2; exit 2; fi; done
source "$(cd "$(dirname "$0")" && pwd)/guard_local.sh"
HERE="$(cd "$(dirname "$0")" && pwd)"; DB="${DB:-veltex_harness}"; export DB
export PGHOST="${PGHOST:-/tmp/veltex-harness-pg}" PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-$(id -un)}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
"$HERE/run_migrations.sh" --db "$DB" ${1:-}
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/sql/10_fixtures.sql"
OWNER_MATRIX="${OWNER_MATRIX:-$HERE/sql/owner-matrix.round3.sql}"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$OWNER_MATRIX" \
  -v owner_id=11111111-1111-4111-8111-111111111111 -v other_id=22222222-2222-4222-8222-222222222222 \
  -v proposal_id=33333333-3333-4333-8333-333333333333 -v tracking_token=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa \
  && echo "OWNER MATRIX PASSED"
psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$HERE/sql/30_assertions.sql" ${CHECK_DEFINERS:+-v check_definers=1}
"$HERE/injection_tests.sh" ${1:-}
"$HERE/concurrency.sh"
echo "HARNESS COMPLETE"
