#!/usr/bin/env bash
# Parallel anonymous view/time calls against the synthetic fixture token.
# Expects fixtures (sql/10_fixtures.sql) loaded and tracking enabled. Commits real rows in the
# disposable DB, so run it LAST or against a fresh copy.
# Usage: DB=veltex_harness N=40 ./concurrency.sh
set -euo pipefail
for arg in "$@"; do if [ "$arg" = --scratch-patches ]; then echo 'Scratch patches forbidden for candidate checks' >&2; exit 2; fi; done
source "$(cd "$(dirname "$0")" && pwd)/guard_local.sh"
export PGHOST="${PGHOST:-/tmp/veltex-harness-pg}" PGPORT="${PGPORT:-55432}" PGUSER="${PGUSER:-$(id -un)}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
DB="${DB:-veltex_harness}"; N="${N:-40}"; TOKEN=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa
PROPOSAL=33333333-3333-4333-8333-333333333333
q() { psql -X -q -At -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }
before=$(q "select coalesce(p.view_count,0)||'|'||coalesce(t.view_count,0)||'|'||(select count(*) from proposal_views where proposal_id=p.id)
            from proposals p join proposal_tracking t on t.proposal_id=p.id and t.tracking_id='$TOKEN' where p.id='$PROPOSAL'")
IFS='|' read -r pv0 tv0 vr0 <<<"$before"
pids=()
for i in $(seq 1 "$N"); do
  q "set role anon; select public.record_tracked_view('$TOKEN'); select public.record_tracking_metric('$TOKEN','time',5000);" >/dev/null &
pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
after=$(q "select p.view_count||'|'||t.view_count||'|'||(select count(*) from proposal_views where proposal_id=p.id)||'|'||t.time_spent_seconds
           from proposals p join proposal_tracking t on t.proposal_id=p.id and t.tracking_id='$TOKEN' where p.id='$PROPOSAL'")
IFS='|' read -r pv1 tv1 vr1 ts <<<"$after"
echo "proposal views +$((pv1-pv0)), tracking views +$((tv1-tv0)), history rows +$((vr1-vr0)), time_spent=$ts (N=$N)"
[ $((pv1-pv0)) -eq "$N" ] && [ $((tv1-tv0)) -eq "$N" ] && [ $((vr1-vr0)) -eq "$N" ] && [ "$ts" -le 86400 ] \
  && echo "CONCURRENCY PASSED" || { echo "CONCURRENCY FAILED"; exit 1; }
