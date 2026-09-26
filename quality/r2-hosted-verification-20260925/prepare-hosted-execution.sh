#!/usr/bin/env bash
# Prepare local R2 hosted-execution artifacts. Does not open a database,
# apply migrations, or enable pg_cron/pgmq/QStash/Inngest.
# Status: PREPARED / NOT HOSTED-EXECUTED
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
PRODUCTION_REF='iwoaaljitifloolszxlu'
PREVIEW_REF='wcnfhriosemgchmtwgof'
url="$(printf '%s' "${R2_PREVIEW_DATABASE_URL:-}" | tr '[:upper:]' '[:lower:]')"
ref="$(printf '%s' "${R2_EXPECTED_PROJECT_REF:-$PREVIEW_REF}" | tr '[:upper:]' '[:lower:]')"

case "$url" in
  *"$PRODUCTION_REF"*) echo "Refusing production project" >&2; exit 2 ;;
esac
case "$ref" in
  *"$PRODUCTION_REF"*) echo "Refusing production project" >&2; exit 2 ;;
esac
if [[ "$ref" != "$PREVIEW_REF" ]]; then
  echo "Refusing unexpected project ref (expected $PREVIEW_REF)" >&2
  exit 2
fi

node "$HERE/build-preview-migration-bundle.mjs"
node "$HERE/sql-editor/build-sql-editor-bundle.mjs"

cat <<EOF
{
  "status": "PREPARED / NOT HOSTED-EXECUTED",
  "isolated_preview_ref": "$PREVIEW_REF",
  "production_refused": "$PRODUCTION_REF",
  "product_candidate": "f761469",
  "harness_head": "afb679c",
  "packet": "$ROOT/docs/product/platform-build/R2_ISOLATED_PREVIEW_OPERATOR_EXECUTION_PACKET.md",
  "psql_bundle": "/private/tmp/veltex-r2-preview-atomic.sql",
  "sql_editor_bundle": "/private/tmp/veltex-r2-sql-editor-atomic.sql",
  "u8_hosted_wake_pgmq_hmac": "OPEN",
  "u8_is_prerequisite": false,
  "hosted_apply": "NOT EXECUTED — consequential approval required"
}
EOF
