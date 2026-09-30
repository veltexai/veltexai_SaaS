#!/usr/bin/env bash
# Executes the complete 23-step recovery plan against a disposable, Unix-socket-
# only PostgreSQL 16 cluster, then compares it with the same migrations applied
# directly. No hosted/TCP database is accepted or contacted.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$ROOT/quality/service-catalog-round4/db-harness"
MIGRATIONS="$ROOT/supabase/migrations"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
export PATH="$PG_BIN:$PATH"

for executable in initdb pg_ctl psql pg_dump; do
  command -v "$executable" >/dev/null || {
    echo "PostgreSQL 16 executable unavailable: $executable" >&2
    exit 2
  }
done

HARNESS_PGDATA="$(mktemp -d /tmp/veltex-catalog-r2replay.XXXXXX)"
export HARNESS_PGDATA PGHOST="$HARNESS_PGDATA" PGPORT="${PGPORT:-55439}" PGUSER="$(id -un)"
unset PGHOSTADDR PGSERVICE PGSERVICEFILE
PLAN="/private/tmp/veltex-r2-prerequisite-replay-runall.$$"
OUT="$(mktemp -d /tmp/veltex-r2-runall-evidence.XXXXXX)"
TEMPLATE=veltex_harness_r2replay_base
REPLAY=veltex_harness_r2replay_plan
DIRECT=veltex_harness_r2replay_direct
GUARD=veltex_harness_r2replay_guard
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

cleanup() {
  local db
  if [ -f "$HARNESS_PGDATA/.veltex-disposable" ]; then
    for db in "$GUARD" "$REPLAY" "$DIRECT" "$TEMPLATE"; do
      "${PSQL[@]}" -d postgres -c "drop database if exists $db" >/dev/null 2>&1 || true
    done
    pg_ctl -D "$HARNESS_PGDATA/data" stop >/dev/null 2>&1 || true
    rm -rf "$HARNESS_PGDATA"
  fi
  rm -rf "$PLAN" "$OUT"
}
trap cleanup EXIT

umask 077
initdb -D "$HARNESS_PGDATA/data" -A trust -U "$PGUSER" >"$OUT/initdb.log"
touch "$HARNESS_PGDATA/.veltex-disposable"
pg_ctl -D "$HARNESS_PGDATA/data" \
  -o "-p $PGPORT -k $HARNESS_PGDATA -c listen_addresses=''" \
  -l "$OUT/postgres.log" start >/dev/null

# Verify the socket really belongs to this marked disposable cluster before the
# first database mutation.
source "$HARNESS/guard_local.sh"

node "$ROOT/quality/r2-hosted-verification-20260925/build-prerequisite-replay-plan.mjs" "$PLAN" >"$OUT/build.json"
node "$ROOT/quality/r2-hosted-verification-20260925/validate-prerequisite-replay-plan.mjs" >"$OUT/validate.log"

for db in "$GUARD" "$REPLAY" "$DIRECT" "$TEMPLATE"; do
  "${PSQL[@]}" -d postgres -c "drop database if exists $db"
done
"${PSQL[@]}" -d postgres -c "create database $TEMPLATE"
"${PSQL[@]}" -d "$TEMPLATE" -f "$HARNESS/sql/00_supabase_shim.sql" >"$OUT/shim.log" 2>&1
"${PSQL[@]}" -d "$TEMPLATE" <<'SQL'
create schema if not exists supabase_migrations;
create table supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

node -e 'const m=require(process.argv[1]); for (const v of m.baselineVersions) console.log(v)' "$PLAN/manifest.json" \
  >"$OUT/baseline-versions.txt"
while IFS= read -r version; do
  matches=("$MIGRATIONS/${version}"_*.sql)
  [ "${#matches[@]}" -eq 1 ] && [ -f "${matches[0]}" ] || {
    echo "Expected one baseline migration for $version" >&2
    exit 1
  }
  file="${matches[0]}"
  if [ "$version" != 030 ]; then
    "${PSQL[@]}" -d "$TEMPLATE" -f "$file" >"$OUT/baseline-$version.log" 2>&1 || {
      echo "Baseline migration failed: $(basename "$file")" >&2
      grep -E 'ERROR|LINE|HINT' "$OUT/baseline-$version.log" | head -10 >&2 || true
      exit 1
    }
  else
    echo "Recorded history without schema body (preview mismatch fixture)" >"$OUT/baseline-$version.log"
  fi
  name="$(basename "$file" .sql)"
  name="${name#${version}_}"
  "${PSQL[@]}" -d "$TEMPLATE" -v version="$version" -v name="$name" <<'SQL'
insert into supabase_migrations.schema_migrations(version, statements, name)
values (:'version', array[]::text[], :'name');
SQL
done <"$OUT/baseline-versions.txt"

"${PSQL[@]}" -d postgres -c "create database $REPLAY template $TEMPLATE"
"${PSQL[@]}" -d postgres -c "create database $DIRECT template $TEMPLATE"

# Reproduce the recorded preview mismatch: version 030 exists in history while
# every object from its exact body is absent. Repair only the replay side; the
# direct side receives the same committed body without another history insert.
"${PSQL[@]}" -d "$REPLAY" -f "$PLAN/00-030-recorded-history-reconciliation.sql" >"$OUT/reconcile-030.log" 2>&1
"${PSQL[@]}" -d "$DIRECT" -f "$MIGRATIONS/030_special_services.sql" >"$OUT/direct-030.log" 2>&1
for db in "$REPLAY" "$DIRECT"; do
  count030="$("${PSQL[@]}" -d "$db" -Atc "select count(*) from supabase_migrations.schema_migrations where version='030'")"
  [ "$count030" = 1 ] || { echo "$db changed or duplicated version-030 history" >&2; exit 1; }
done

# Once any 030 object exists, the reconciliation must refuse without changing
# its already-recorded history row.
"${PSQL[@]}" -d postgres -c "create database $GUARD template $REPLAY"
if "${PSQL[@]}" -d "$GUARD" -f "$PLAN/00-030-recorded-history-reconciliation.sql" >"$OUT/reconcile-030-refusal.log" 2>&1; then
  echo "Baseline-030 reconciliation unexpectedly accepted an already-repaired schema" >&2
  exit 1
fi
count030="$("${PSQL[@]}" -d "$GUARD" -Atc "select count(*) from supabase_migrations.schema_migrations where version='030'")"
[ "$count030" = 1 ] || { echo "Refused baseline reconciliation changed version-030 history" >&2; exit 1; }
"${PSQL[@]}" -d postgres -c "drop database $GUARD"

node -e 'const m=require(process.argv[1]); for (const s of m.steps) console.log([s.order,s.artifact,s.file,s.version].join("\t"))' "$PLAN/manifest.json" \
  >"$OUT/steps.tsv"

while IFS=$'\t' read -r order artifact file version; do
  if [ "$order" = 13 ]; then
    # A continue-on-error client must not record step 13 after its first guard
    # refuses. The repeated guard runs in the same final transaction as history,
    # leaving that transaction aborted before INSERT.
    "${PSQL[@]}" -d postgres -c "create database $GUARD template $REPLAY"
    "${PSQL[@]}" -d "$GUARD" -c \
      "insert into supabase_migrations.schema_migrations(version, statements, name) values ('20260922000000', array[]::text[], 'guard-contamination')"
    psql -X -q -v ON_ERROR_STOP=0 -d "$GUARD" -f "$PLAN/$artifact" \
      >"$OUT/step-13-continue-on-error.log" 2>&1 || true
    recorded="$("${PSQL[@]}" -d "$GUARD" -Atc "select count(*) from supabase_migrations.schema_migrations where version='20260913000000'")"
    [ "$recorded" = 0 ] || {
      echo "Step 13 recorded history after a refused precondition" >&2
      exit 1
    }
    "${PSQL[@]}" -d postgres -c "drop database $GUARD"
  fi

  "${PSQL[@]}" -d "$REPLAY" -f "$PLAN/$artifact" >"$OUT/replay-$order.log" 2>&1 || {
    echo "Replay artifact failed: $artifact" >&2
    grep -E 'ERROR|LINE|HINT' "$OUT/replay-$order.log" | head -10 >&2 || true
    exit 1
  }

  "${PSQL[@]}" -d "$DIRECT" -f "$MIGRATIONS/$file" >"$OUT/direct-$order.log" 2>&1 || {
    echo "Direct migration failed: $file" >&2
    grep -E 'ERROR|LINE|HINT' "$OUT/direct-$order.log" | head -10 >&2 || true
    exit 1
  }
  name="${file%.sql}"
  name="${name#${version}_}"
  "${PSQL[@]}" -d "$DIRECT" -v version="$version" -v name="$name" <<'SQL'
insert into supabase_migrations.schema_migrations(version, statements, name)
values (:'version', array[]::text[], :'name');
SQL
done <"$OUT/steps.tsv"

for db in "$REPLAY" "$DIRECT"; do
  count="$("${PSQL[@]}" -d "$db" -Atc 'select count(*) from supabase_migrations.schema_migrations')"
  [ "$count" = 52 ] || { echo "$db has $count migration-history rows, expected 52" >&2; exit 1; }
done

pg_dump --schema-only --no-comments --no-owner "$REPLAY" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/replay.schema.sql"
pg_dump --schema-only --no-comments --no-owner "$DIRECT" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/direct.schema.sql"
diff -u "$OUT/direct.schema.sql" "$OUT/replay.schema.sql"

NONDETERMINISTIC_SOURCE_TABLES=(
  --exclude-table-data=public.additional_service_catalog
  --exclude-table-data=public.pricing_source_versions
  --exclude-table-data=public.occupational_wage_benchmarks
  --exclude-table-data=public.minimum_wage_rules
  --exclude-table-data=public.regional_price_parities
  --exclude-table-data=public.mileage_rate_versions
)

pg_dump --data-only --inserts --no-owner --no-privileges "${NONDETERMINISTIC_SOURCE_TABLES[@]}" "$REPLAY" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/replay.data.sql"
pg_dump --data-only --inserts --no-owner --no-privileges "${NONDETERMINISTIC_SOURCE_TABLES[@]}" "$DIRECT" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/direct.data.sql"
diff -u "$OUT/direct.data.sql" "$OUT/replay.data.sql"

# The official-market migration intentionally generates source UUIDs and import
# timestamps at execution time. Compare those rows by their stable business
# keys and source metadata, resolving foreign keys back to dataset/version,
# instead of treating independently generated UUIDs as product differences.
cat >"$OUT/pricing-semantic.sql" <<'SQL'
select jsonb_build_object(
  'sources', (select jsonb_agg(to_jsonb(s) order by s.dataset_key, s.version) from (
    select dataset_key, version, source_agency, source_url, source_vintage,
      retrieved_at, checksum, active
    from public.pricing_source_versions
  ) s),
  'wages', (select jsonb_agg(to_jsonb(w) order by w.market_code, w.occupation_code, w.statistic) from (
    select w.market_code, w.dataset_version, w.occupation_code, w.statistic,
      w.hourly_wage, s.dataset_key source_dataset_key, s.version source_version
    from public.occupational_wage_benchmarks w
    join public.pricing_source_versions s on s.id = w.source_version_id
  ) w),
  'minimum_wages', (select jsonb_agg(to_jsonb(m) order by m.jurisdiction_code, m.jurisdiction_type, m.effective_from) from (
    select m.jurisdiction_code, m.dataset_version, m.jurisdiction_type, m.hourly_floor,
      m.effective_from, m.effective_to, m.confirmation_required,
      s.dataset_key source_dataset_key, s.version source_version
    from public.minimum_wage_rules m
    join public.pricing_source_versions s on s.id = m.source_version_id
  ) m),
  'parities', (select jsonb_agg(to_jsonb(r) order by r.market_code, r.category) from (
    select r.market_code, r.dataset_version, r.category, r.parity,
      s.dataset_key source_dataset_key, s.version source_version
    from public.regional_price_parities r
    join public.pricing_source_versions s on s.id = r.source_version_id
  ) r),
  'mileage', (select jsonb_agg(to_jsonb(m) order by m.dataset_version, m.effective_from) from (
    select m.dataset_version, m.business_rate, m.effective_from, m.effective_to,
      s.dataset_key source_dataset_key, s.version source_version
    from public.mileage_rate_versions m
    join public.pricing_source_versions s on s.id = m.source_version_id
  ) m)
);
SQL
for db in "$REPLAY" "$DIRECT"; do
  "${PSQL[@]}" -d "$db" -Atf "$OUT/pricing-semantic.sql" >"$OUT/$db.pricing-semantic.json"
done
diff -u "$OUT/$DIRECT.pricing-semantic.json" "$OUT/$REPLAY.pricing-semantic.json"

# Migration 030 seeds generated UUIDs and timestamps. Compare its catalog rows
# by stable business fields rather than independently generated identities.
cat >"$OUT/additional-services-semantic.sql" <<'SQL'
select coalesce(jsonb_agg(to_jsonb(s) order by s.sku), '[]'::jsonb)
from (
  select sku, label, unit_type, rate, min_qty, default_frequency,
    frequency_options, amortize_to_monthly, default_qty_source, active,
    category, show_in_proposals, description, notes
  from public.additional_service_catalog
) s;
SQL
for db in "$REPLAY" "$DIRECT"; do
  "${PSQL[@]}" -d "$db" -Atf "$OUT/additional-services-semantic.sql" >"$OUT/$db.additional-services-semantic.json"
done
diff -u "$OUT/$DIRECT.additional-services-semantic.json" "$OUT/$REPLAY.additional-services-semantic.json"

echo "PASS: recorded-history/missing-schema 030 reconciliation and all 23 guarded replay steps match direct ordered migrations; no duplicate 030 history; step 13 cannot record history after refusal."
