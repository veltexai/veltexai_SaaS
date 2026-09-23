#!/usr/bin/env bash
# Migration-level negative tests on fresh copies of the base snapshot produced by run_migrations.sh.
# Usage: MIGRATIONS_DIR=... DB=veltex_harness ./injection_tests.sh [--scratch-patches]
#   inject : permissive "USING (true)" SELECT policy for authenticated  -> remediation must ABORT atomically
#   equiv  : owner policy rewritten as (user_id = auth.uid())            -> aborts (fail-closed; documents R3-7)
#   dirty  : unknown historical event name present                      -> applies; new unknown write rejected
#   rerun  : remediation applied twice                                   -> second run fails (documents R3-6)
set -euo pipefail
for arg in "$@"; do if [ "$arg" = --scratch-patches ]; then echo 'Scratch patches forbidden for candidate checks' >&2; exit 2; fi; done
source "$(cd "$(dirname "$0")" && pwd)/guard_local.sh"
HERE="$(cd "$(dirname "$0")" && pwd)"
: "${MIGRATIONS_DIR:?}"; export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"; export PGHOST="${PGHOST:-/tmp/veltex-harness-pg}" PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-$(id -un)}"
DB="${DB:-veltex_harness}"; [[ "$DB" =~ ^veltex_harness[a-z0-9_]*$ ]] || exit 2; SRC="$MIGRATIONS_DIR"
if [ "${1:-}" = --scratch-patches ]; then
  TMP="$(mktemp -d)"; mkdir -p "$TMP/supabase/migrations"; cp "$MIGRATIONS_DIR"/*.sql "$TMP/supabase/migrations/"; chmod u+w "$TMP"/supabase/migrations/*.sql
  for p in "$HERE"/patches/SCRATCH-*.patch; do (cd "$TMP" && patch -p1 --forward --quiet < "$p"); done
  SRC="$TMP/supabase/migrations"
fi
R1="$SRC/20260922000000_service_catalog_release_1.sql"; R3="$SRC/20260922010000_catalog_remediation.sql"
P() { psql -X -q -v ON_ERROR_STOP=1 "$@"; }
fresh() { P -d postgres -c "drop database if exists t_$1" -c "create database t_$1 template ${DB}_base_tpl"; P -d "t_$1" -f "$R1" >/dev/null; }
state() { psql -X -At -d "t_$1" -c "select count(*) from pg_policy where polname='catalog_owner_guard'" -c "select count(*) from service_catalog_versions where version='2026-09-22.2'" | paste -sd' '; }
fail=0
fresh inject; P -d t_inject -c "create policy leak on public.proposals for select to authenticated using (true)"
if P -d t_inject -f "$R3" >/dev/null 2>&1; then echo "inject: FAIL (migration applied despite permissive policy)"; fail=1
else [ "$(state inject)" = "0 0" ] && echo "inject: PASS (aborted, nothing committed)" || { echo "inject: FAIL (partial commit)"; fail=1; }; fi

fresh equiv; P -d t_equiv -c 'drop policy "Users can view own proposals" on public.proposals' \
  -c 'create policy "Users can view own proposals" on public.proposals for select using (user_id = auth.uid())'
if P -d t_equiv -f "$R3" >/dev/null 2>&1; then echo "equiv: applied (expression normalization accepted)"; else echo "equiv: aborted (fail-closed; expected with current candidate, see R3-7)"; fi

fresh dirty; P -d t_dirty -c "alter table public.marketing_funnel_events drop constraint marketing_funnel_events_event_name_check" \
  -c "insert into public.marketing_funnel_events(event_id,event_name) values ('dirty-1','legacy_unknown_event')"
if P -d t_dirty -f "$R3" >/dev/null 2>&1; then
  if psql -X -q -d t_dirty -c "insert into public.marketing_funnel_events(event_id,event_name) values ('dirty-2','another_unknown')" >/dev/null 2>&1
  then echo "dirty: FAIL (new unknown event accepted)"; fail=1; else [ "$(psql -X -q -At -d t_dirty -c "select count(*) from marketing_funnel_events where event_id='dirty-1' and event_name='legacy_unknown_event'")" = 1 ] || exit 1; echo "dirty: PASS (historical kept, new rejected)"; fi
else echo "dirty: FAIL (migration aborted on historical data)"; fail=1; fi

fresh rerun; P -d t_rerun -f "$R3" >/dev/null
if P -d t_rerun -f "$R3" >/dev/null 2>&1; then echo "rerun: applied twice (idempotent)"; else echo "rerun: FAIL (second application must succeed)"; fail=1; fi
exit $fail
