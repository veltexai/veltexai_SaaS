#!/bin/sh
# Requires an already migrated, disposable LOCAL Supabase clone with synthetic fixtures.
# Deliberately refuses hosted projects. No credentials are printed.
set -eu
: "${CATALOG_STAGING_DATABASE_URL:?Set a loopback-only disposable database URL}"
case "$CATALOG_STAGING_DATABASE_URL" in
 postgresql://*@127.0.0.1:*/*|postgresql://*@localhost:*/*) ;;
 *) echo 'Refusing non-loopback database target' >&2; exit 2;;
esac
command -v psql >/dev/null
psql "$CATALOG_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260922000000_service_catalog_release_1.sql
psql "$CATALOG_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f supabase/migrations/20260922010000_catalog_remediation.sql
psql "$CATALOG_STAGING_DATABASE_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
begin;
do $$ begin
 if has_table_privilege('anon','public.proposals','select') or
    has_column_privilege('anon','public.proposals','service_specific_data','select') then
   raise exception 'Anonymous raw proposal access remains';
 end if;
 if has_table_privilege('anon','public.proposals','update') then raise exception 'Anonymous raw update remains'; end if;
 if not has_function_privilege('anon','public.read_tracked_proposal(text)','execute') then raise exception 'Public capability unavailable'; end if;
end $$;
set local role anon;
select public.read_tracked_proposal('nonexistent-synthetic-token') is null as unknown_token_is_private;
select public.record_tracked_view('nonexistent-synthetic-token') = false as unknown_token_cannot_update;
rollback;
SQL
printf '%s\n' 'Privilege smoke complete. Run the full synthetic owner/other-owner/token matrix in MIGRATION_AND_STAGING.md before acceptance.'
