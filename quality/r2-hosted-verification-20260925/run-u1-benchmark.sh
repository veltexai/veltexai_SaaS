#!/usr/bin/env bash
# U1 membership-RLS benchmark runner.
# Status: PREPARED / NOT EXECUTED.
# Default is dry-run. Hosted execution requires an explicit preview flag
# and never targets production.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SQL="$HERE/sql/u1-membership-rls-benchmark.sql"
PRODUCTION_REF='iwoaaljitifloolszxlu'

if [[ ! -f "$SQL" ]]; then
  echo "missing $SQL" >&2
  exit 2
fi

mode="${1:-dry-run}"

refuse_production() {
  local url="${1:-}"
  case "$url" in
    *"$PRODUCTION_REF"*)
      echo "Refusing production project" >&2
      exit 2
      ;;
  esac
}

if [[ "$mode" != "dry-run" && "$mode" != "--execute-preview" ]]; then
  echo "Usage: $0 [dry-run|--execute-preview]" >&2
  exit 2
fi

if [[ "$mode" == "dry-run" ]]; then
  echo "U1 benchmark PREPARED / NOT EXECUTED (dry-run)"
  echo "SQL: $SQL"
  echo "No-production guard: refuse $PRODUCTION_REF"
  echo "Hosted execute requires --execute-preview, R2_U1_EXECUTE=preview, R2_PREVIEW_DATABASE_URL, and R2_EXPECTED_PROJECT_REF"
  exit 0
fi

: "${R2_PREVIEW_DATABASE_URL:?Set the isolated preview database URL}"
: "${R2_EXPECTED_PROJECT_REF:?Set the isolated preview project ref}"
: "${R2_U1_EXECUTE:?Set R2_U1_EXECUTE=preview to run the isolated benchmark}"

if [[ "$R2_U1_EXECUTE" != "preview" ]]; then
  echo "R2_U1_EXECUTE must be the exact token preview" >&2
  exit 2
fi

refuse_production "$R2_PREVIEW_DATABASE_URL"
case "$R2_PREVIEW_DATABASE_URL" in
  *"$R2_EXPECTED_PROJECT_REF"*) ;;
  *) echo "Database URL does not contain expected preview ref" >&2; exit 2 ;;
esac
if [[ "$R2_EXPECTED_PROJECT_REF" == "$PRODUCTION_REF" ]]; then
  echo "Refusing production project" >&2
  exit 2
fi

command -v psql >/dev/null
psql "$R2_PREVIEW_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$SQL"
echo "U1 benchmark SQL finished; record the evidence table and rls_overhead_ms row"
