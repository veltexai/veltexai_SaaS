#!/usr/bin/env bash
# Proves the effect of archiving the superseded duplicate 034 on a disposable
# local PostgreSQL cluster. This never accepts a hosted/TCP database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HARNESS="$ROOT/quality/service-catalog-round4/db-harness"
source "$HARNESS/guard_local.sh"

MIGRATIONS="$ROOT/supabase/migrations"
ARCHIVED="$ROOT/supabase/migrations_archive/034_fix_trial_display_after_proposals_exhausted.sql"
CANONICAL="$MIGRATIONS/034_free_trial_no_credit_card.sql"
TARGET="20260925001000_location_pricing_reviewed_seed.sql"
DB_PREFIX="veltex_harness_034eq"
TEMPLATE="${DB_PREFIX}_pre"
LEGACY="${DB_PREFIX}_legacy_both"
CURRENT="${DB_PREFIX}_canonical_only"
OUT="$(mktemp -d /tmp/veltex-034-equivalence.XXXXXX)"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)

cleanup() {
  local db
  for db in "$LEGACY" "$CURRENT" "$TEMPLATE"; do
    "${PSQL[@]}" -d postgres -c "drop database if exists $db" >/dev/null 2>&1 || true
  done
  rm -rf "$OUT"
}
trap cleanup EXIT

apply_file() {
  local db="$1" file="$2"
  "${PSQL[@]}" -d "$db" -f "$file" >"$OUT/$(basename "$db")-$(basename "$file").log" 2>&1 || {
    echo "FAILED: $(basename "$file") on $db" >&2
    grep -E 'ERROR|LINE|HINT' "$OUT/$(basename "$db")-$(basename "$file").log" | head -10 >&2 || true
    exit 1
  }
}

for db in "$LEGACY" "$CURRENT" "$TEMPLATE"; do
  "${PSQL[@]}" -d postgres -c "drop database if exists $db"
done
"${PSQL[@]}" -d postgres -c "create database $TEMPLATE"
apply_file "$TEMPLATE" "$HARNESS/sql/00_supabase_shim.sql"

while IFS= read -r file; do
  name="$(basename "$file")"
  [[ "$name" < "034_free_trial_no_credit_card.sql" ]] || break
  apply_file "$TEMPLATE" "$file"
done < <(find "$MIGRATIONS" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)

"${PSQL[@]}" -d postgres -c "create database $LEGACY template $TEMPLATE"
"${PSQL[@]}" -d postgres -c "create database $CURRENT template $TEMPLATE"

# Historical path: the older duplicate ran first, then the canonical 034.
apply_file "$LEGACY" "$ARCHIVED"
apply_file "$LEGACY" "$CANONICAL"
# Current path: exactly one executable 034.
apply_file "$CURRENT" "$CANONICAL"

# The archived migration contains no data mutation. Both paths must therefore
# have byte-identical data immediately after canonical 034.
pg_dump --data-only --inserts --no-owner --no-privileges "$LEGACY" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/legacy-after-034.data.sql"
pg_dump --data-only --inserts --no-owner --no-privileges "$CURRENT" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/current-after-034.data.sql"
diff -u "$OUT/legacy-after-034.data.sql" "$OUT/current-after-034.data.sql"

while IFS= read -r file; do
  name="$(basename "$file")"
  [[ "$name" > "034_free_trial_no_credit_card.sql" ]] || continue
  [[ "$name" > "$TARGET" ]] && break
  apply_file "$LEGACY" "$file"
  apply_file "$CURRENT" "$file"
done < <(find "$MIGRATIONS" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)

# Compare all executable schema semantics while excluding COMMENT metadata.
# The old duplicate leaves a stale COMMENT on get_user_current_usage; that is
# deliberately reported below rather than mislabeled as a behavioral change.
pg_dump --schema-only --no-comments --no-owner --no-privileges "$LEGACY" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/legacy-final.schema.sql"
pg_dump --schema-only --no-comments --no-owner --no-privileges "$CURRENT" \
  | sed '/^\\restrict /d;/^\\unrestrict /d' >"$OUT/current-final.schema.sql"
diff -u "$OUT/legacy-final.schema.sql" "$OUT/current-final.schema.sql"

"${PSQL[@]}" -d "$LEGACY" -Atc \
  "select coalesce(obj_description('public.get_user_current_usage(uuid)'::regprocedure, 'pg_proc'), '')" \
  >"$OUT/legacy-comment.txt"
"${PSQL[@]}" -d "$CURRENT" -Atc \
  "select coalesce(obj_description('public.get_user_current_usage(uuid)'::regprocedure, 'pg_proc'), '')" \
  >"$OUT/current-comment.txt"

echo "PASS: canonical-only 034 is data-identical after 034 and behaviorally schema-equivalent through $TARGET."
if ! cmp -s "$OUT/legacy-comment.txt" "$OUT/current-comment.txt"; then
  echo "EXPECTED METADATA DIFFERENCE: legacy-both retains the superseded get_user_current_usage comment; canonical-only does not."
fi
