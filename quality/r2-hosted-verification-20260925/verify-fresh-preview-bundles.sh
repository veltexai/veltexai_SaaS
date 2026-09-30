#!/usr/bin/env bash
# Recreates the exact empty 52-version preview state in disposable local
# PostgreSQL, applies both generated R2 bundle variants independently, executes
# SQL-Editor post-checks, and proves preflight refusal plus atomic rollback.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$ROOT/quality/service-catalog-round4/db-harness"
MIGRATIONS="$ROOT/supabase/migrations"
PG_BIN="${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
export PATH="$PG_BIN:$PATH"

for executable in initdb pg_ctl psql createdb; do
  command -v "$executable" >/dev/null || { echo "PostgreSQL 16 executable unavailable: $executable" >&2; exit 2; }
done

TMP="$(mktemp -d /tmp/veltex-catalog-r2-fresh-bundles.XXXXXX)"
OUT="$(mktemp -d /tmp/veltex-r2-fresh-evidence.XXXXXX)"
export HARNESS_PGDATA="$TMP" PGHOST="$TMP" PGPORT="${PGPORT:-55441}" PGUSER=postgres
unset PGHOSTADDR PGSERVICE PGSERVICEFILE
PSQL=(psql -X -q -v ON_ERROR_STOP=1)
DATABASES=(r2_fresh_base r2_fresh_psql r2_fresh_editor r2_standalone_repair r2_refuse_history r2_refuse_schema r2_refuse_wrapper r2_refuse_data r2_atomic_rollback)

cleanup() {
  if [ -f "$TMP/.veltex-disposable" ]; then
    for db in "${DATABASES[@]}"; do "${PSQL[@]}" -d postgres -c "drop database if exists $db" >/dev/null 2>&1 || true; done
    pg_ctl -D "$TMP/data" stop >/dev/null 2>&1 || true
    rm -rf "$TMP"
  fi
  rm -rf "$OUT"
}
trap cleanup EXIT

umask 077
initdb -D "$TMP/data" -A trust -U postgres >"$OUT/initdb.log"
touch "$TMP/.veltex-disposable"
pg_ctl -D "$TMP/data" -o "-p $PGPORT -k $TMP -c listen_addresses=''" -l "$OUT/postgres.log" start >/dev/null
source "$HARNESS/guard_local.sh"

for db in "${DATABASES[@]}"; do "${PSQL[@]}" -d postgres -c "drop database if exists $db"; done
"${PSQL[@]}" -d postgres -c 'create database r2_fresh_base'
"${PSQL[@]}" -d r2_fresh_base -f "$HARNESS/sql/00_supabase_shim.sql" >"$OUT/shim.log" 2>&1
"${PSQL[@]}" -d r2_fresh_base <<'SQL'
create schema if not exists supabase_migrations;
create table supabase_migrations.schema_migrations(version text primary key, statements text[], name text);
SQL

find "$MIGRATIONS" -maxdepth 1 -type f -name '*.sql' | LC_ALL=C sort \
  | awk '/20260925002000_r2_organization_tenancy.sql/{exit} {print}' >"$OUT/prerequisites.txt"
while IFS= read -r file; do
  "${PSQL[@]}" -d r2_fresh_base -f "$file" >"$OUT/prerequisite-$(basename "$file").log" 2>&1
  base="$(basename "$file" .sql)"; version="${base%%_*}"; name="${base#*_}"
  "${PSQL[@]}" -d r2_fresh_base -v version="$version" -v name="$name" <<'SQL'
insert into supabase_migrations.schema_migrations(version, statements, name)
values (:'version', array[]::text[], :'name');
SQL
done <"$OUT/prerequisites.txt"

"${PSQL[@]}" -d r2_fresh_base -At <<'SQL' >"$OUT/baseline.txt"
select count(*) from supabase_migrations.schema_migrations;
select count(*) from public.profiles;
select count(*) from public.proposals;
select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex') from public.proposals;
SQL
expected=$'52\n0\n0\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
[ "$(cat "$OUT/baseline.txt")" = "$expected" ] || { echo 'fresh-preview baseline mismatch' >&2; cat "$OUT/baseline.txt" >&2; exit 1; }

node "$ROOT/quality/r2-hosted-verification-20260925/build-preview-migration-bundle.mjs" "$OUT/psql-bundle.sql" >"$OUT/psql-build.json"
node "$ROOT/quality/r2-hosted-verification-20260925/sql-editor/build-sql-editor-bundle.mjs" "$OUT/editor-bundle.sql" >"$OUT/editor-build.json"
for db in r2_fresh_psql r2_fresh_editor; do "${PSQL[@]}" -d postgres -c "create database $db template r2_fresh_base"; done
"${PSQL[@]}" -d r2_fresh_psql -f "$OUT/psql-bundle.sql" >"$OUT/psql-apply.log" 2>&1
"${PSQL[@]}" -d r2_fresh_editor -f "$OUT/editor-bundle.sql" >"$OUT/editor-apply.log" 2>&1

for db in r2_fresh_psql r2_fresh_editor; do
  [ "$("${PSQL[@]}" -d "$db" -Atc 'select count(*) from supabase_migrations.schema_migrations')" = 58 ] || { echo "$db does not have 58 history rows" >&2; exit 1; }
  for check in 02-hosted-matrix.sql 03-last-owner-single-session.sql 04-u1-benchmark.sql; do
    "${PSQL[@]}" -d "$db" -f "$ROOT/quality/r2-hosted-verification-20260925/sql-editor/$check" >"$OUT/$db-$check.log" 2>&1 || {
      echo "$check failed on $db" >&2; tail -40 "$OUT/$db-$check.log" >&2; exit 1;
    }
  done
done

# Reproduce the hosted preview's current 57-version state, then prove that the
# standalone 07000 repair is guarded, atomic, and sufficient for checks 02-04.
"${PSQL[@]}" -d postgres -c "create database r2_standalone_repair template r2_fresh_base"
for migration in \
  20260925002000_r2_organization_tenancy.sql \
  20260925003000_r2_claude_security_remediation.sql \
  20260925004000_r2_second_security_remediation.sql \
  20260925005000_r2_third_security_remediation.sql \
  20260925006000_r2_cleanup_guard_ordering.sql; do
  "${PSQL[@]}" -d r2_standalone_repair -f "$MIGRATIONS/$migration" >"$OUT/standalone-$migration.log" 2>&1 || {
    echo "standalone prerequisite $migration failed" >&2
    tail -40 "$OUT/standalone-$migration.log" >&2
    exit 1
  }
  base="${migration%.sql}"; version="${base%%_*}"; name="${base#*_}"
  "${PSQL[@]}" -d r2_standalone_repair -v version="$version" -v name="$name" <<'SQL'
insert into supabase_migrations.schema_migrations(version, statements, name)
values (:'version', array[]::text[], :'name');
SQL
done
"${PSQL[@]}" -d r2_standalone_repair \
  -f "$ROOT/quality/r2-hosted-verification-20260925/sql-editor/05-service-role-proposal-read-repair.sql" \
  >"$OUT/standalone-repair.log" 2>&1 || {
    echo 'standalone 07000 repair failed' >&2
    tail -40 "$OUT/standalone-repair.log" >&2
    exit 1
  }
[ "$("${PSQL[@]}" -d r2_standalone_repair -Atc 'select count(*) from supabase_migrations.schema_migrations')" = 58 ] || {
  echo 'standalone repair did not produce 58 history rows' >&2; exit 1;
}
for check in 02-hosted-matrix.sql 03-last-owner-single-session.sql 04-u1-benchmark.sql; do
  "${PSQL[@]}" -d r2_standalone_repair -f "$ROOT/quality/r2-hosted-verification-20260925/sql-editor/$check" >"$OUT/r2_standalone_repair-$check.log" 2>&1 || {
    echo "$check failed after standalone repair" >&2; tail -40 "$OUT/r2_standalone_repair-$check.log" >&2; exit 1;
  }
done

assert_refusal() {
  local db="$1" bundle="$2" label="$3"
  if "${PSQL[@]}" -d "$db" -f "$bundle" >"$OUT/refuse-$label.log" 2>&1; then
    echo "$label mutation unexpectedly passed" >&2; exit 1
  fi
  [ "$("${PSQL[@]}" -d "$db" -Atc "select count(*) from supabase_migrations.schema_migrations where version in ('20260925002000','20260925003000','20260925004000','20260925005000','20260925006000','20260925007000')")" = 0 ] || {
    echo "$label refusal recorded R2 history" >&2; exit 1
  }
  [ "$("${PSQL[@]}" -d "$db" -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='organizations'")" = 0 ] || {
    echo "$label refusal left organizations" >&2; exit 1
  }
}

for db in r2_refuse_history r2_refuse_schema r2_refuse_wrapper r2_refuse_data r2_atomic_rollback; do
  "${PSQL[@]}" -d postgres -c "create database $db template r2_fresh_base"
done
"${PSQL[@]}" -d r2_refuse_history -c "insert into supabase_migrations.schema_migrations values ('99999999999999',array[]::text[],'tamper')" >/dev/null
assert_refusal r2_refuse_history "$OUT/psql-bundle.sql" extra-history
"${PSQL[@]}" -d r2_refuse_schema -c 'drop index public.idx_proposal_templates_type' >/dev/null
assert_refusal r2_refuse_schema "$OUT/editor-bundle.sql" missing-index
"${PSQL[@]}" -d r2_refuse_wrapper <<'SQL' >/dev/null
create or replace function public.can_user_access_template(user_uuid uuid, template_uuid uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public as 'select true';
SQL
assert_refusal r2_refuse_wrapper "$OUT/psql-bundle.sql" wrapper-tamper
"${PSQL[@]}" -d r2_refuse_data -c "insert into public.proposal_templates(name,template_type) values ('tamper','basic')" >/dev/null
assert_refusal r2_refuse_data "$OUT/editor-bundle.sql" seed-tamper

# This mutation passes the baseline contract but forces later R2 DDL to fail.
# The outer transaction must roll back every R2 object/history write while
# preserving the pre-existing dummy table.
"${PSQL[@]}" -d r2_atomic_rollback -c 'create table public.organization_memberships(dummy integer)' >/dev/null
if "${PSQL[@]}" -d r2_atomic_rollback -f "$OUT/editor-bundle.sql" >"$OUT/atomic-rollback.log" 2>&1; then
  echo 'atomic rollback mutation unexpectedly passed' >&2; exit 1
fi
[ "$("${PSQL[@]}" -d r2_atomic_rollback -Atc "select count(*) from supabase_migrations.schema_migrations where version in ('20260925002000','20260925003000','20260925004000','20260925005000','20260925006000','20260925007000')")" = 0 ] || { echo 'atomic failure retained R2 history' >&2; exit 1; }
[ "$("${PSQL[@]}" -d r2_atomic_rollback -Atc "select to_regclass('public.organizations') is null")" = t ] || { echo 'atomic failure retained organizations' >&2; exit 1; }
[ "$("${PSQL[@]}" -d r2_atomic_rollback -Atc "select to_regclass('public.organization_memberships') is not null")" = t ] || { echo 'atomic failure removed pre-existing fixture' >&2; exit 1; }

echo 'PASS: exact empty 52-version preview accepts both R2 bundles; standalone 07000 repair and 02/03/04 pass; history/schema/function/seed tampering refuses; forced mid-bundle failure rolls back atomically.'
