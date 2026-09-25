#!/usr/bin/env bash
set -euo pipefail

: "${R2_PREVIEW_DATABASE_URL:?Set the isolated preview database URL}"
: "${R2_EXPECTED_PROJECT_REF:?Set the isolated preview project ref}"

case "$R2_PREVIEW_DATABASE_URL" in
  *iwoaaljitifloolszxlu*) echo "Refusing production project" >&2; exit 2 ;;
esac
case "$R2_PREVIEW_DATABASE_URL" in
  *"$R2_EXPECTED_PROJECT_REF"*) ;;
  *) echo "Database URL does not contain expected preview ref" >&2; exit 2 ;;
esac

command -v psql >/dev/null
HERE="$(cd "$(dirname "$0")" && pwd)"
psql "$R2_PREVIEW_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v candidate_commit=r2-fourth-remediation \
  -f "$HERE/sql/r2-hosted-matrix.sql"
