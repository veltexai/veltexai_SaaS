#!/usr/bin/env bash
set -euo pipefail

: "${R2_PREVIEW_DATABASE_URL:?Set the isolated preview database URL}"
: "${R2_EXPECTED_PROJECT_REF:?Set the isolated preview project ref}"
case "$R2_PREVIEW_DATABASE_URL" in
  *iwoaaljitifloolszxlu*) echo "Refusing production project" >&2; exit 2 ;;
  *"$R2_EXPECTED_PROJECT_REF"*) ;;
  *) echo "Database URL does not contain expected preview ref" >&2; exit 2 ;;
esac

command -v psql >/dev/null
HERE="$(cd "$(dirname "$0")" && pwd)"
DB="$R2_PREVIEW_DATABASE_URL"

# Setup is committed so two independent sessions can contend on the same row.
psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$HERE/sql/last-owner-cleanup.sql"
log_a="$(mktemp /tmp/r2-owner-a.XXXXXX.log)"
log_b="$(mktemp /tmp/r2-owner-b.XXXXXX.log)"
cleanup() {
  prior=$?
  trap - EXIT
  rm -f "$log_a" "$log_b"
  if ! psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$HERE/sql/last-owner-cleanup.sql"; then
    echo "FAIL: concurrency fixture cleanup failed; manual cleanup is required" >&2
    exit 1
  fi
  exit "$prior"
}
trap cleanup EXIT
psql "$DB" -X -q -v ON_ERROR_STOP=1 -f "$HERE/sql/last-owner-setup.sql"

org=$(psql "$DB" -X -qAt -v ON_ERROR_STOP=1 -c \
  "select active_organization_id from public.profiles where id='92000000-0000-4000-8000-000000000011';")

set +e
psql "$DB" -X -q -v ON_ERROR_STOP=1 -c \
  "delete from public.organization_memberships where organization_id='$org' and user_id='92000000-0000-4000-8000-000000000011';" >"$log_a" 2>&1 &
a=$!
psql "$DB" -X -q -v ON_ERROR_STOP=1 -c \
  "delete from public.organization_memberships where organization_id='$org' and user_id='92000000-0000-4000-8000-000000000011';" >"$log_b" 2>&1 &
b=$!
wait "$a"; sa=$?
wait "$b"; sb=$?
set -e

owners=$(psql "$DB" -X -qAt -v ON_ERROR_STOP=1 -c \
  "select count(*) from public.organization_memberships where organization_id='$org' and role='owner';")
if [ "$owners" -lt 1 ]; then
  echo "FAIL: concurrent deletes removed every owner (statuses $sa/$sb)" >&2
  exit 1
fi
echo "PASS: concurrent final-owner invariant retained $owners owner(s) (statuses $sa/$sb)"
