#!/usr/bin/env bash
set -euo pipefail

: "${R2_PREVIEW_DATABASE_URL:?Set the isolated preview database URL}"
: "${R2_EXPECTED_PROJECT_REF:?Set the isolated preview project ref}"
: "${R2_CANDIDATE_COMMIT:?Set the exact R2 candidate commit}"
expected_ref="$(printf '%s' "$R2_EXPECTED_PROJECT_REF" | tr '[:upper:]' '[:lower:]')"
database_url_lower="$(printf '%s' "$R2_PREVIEW_DATABASE_URL" | tr '[:upper:]' '[:lower:]')"

case "$database_url_lower" in
  *iwoaaljitifloolszxlu*) echo "Refusing production project" >&2; exit 2 ;;
esac
case "$database_url_lower" in
  *"$expected_ref"*) ;;
  *) echo "Database URL does not contain expected preview ref" >&2; exit 2 ;;
esac

command -v psql >/dev/null
HERE="$(cd "$(dirname "$0")" && pwd)"
psql "$R2_PREVIEW_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -v candidate_commit="$R2_CANDIDATE_COMMIT" \
  -f "$HERE/sql/r2-hosted-matrix.sql"
