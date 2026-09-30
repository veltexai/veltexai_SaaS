#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const migrationName = '20260925010000_tracked_link_revocation.sql';
const migrationPath = resolve(root, 'supabase/migrations', migrationName);
const source = readFileSync(migrationPath, 'utf8').trim();
const beginMatches = source.match(/^begin;$/gim) ?? [];
const commitMatches = source.match(/^commit;$/gim) ?? [];

if (beginMatches.length !== 1 || commitMatches.length !== 1) {
  throw new Error(`${migrationName} must contain exactly one BEGIN and one COMMIT`);
}

const body = source
  .replace(/^begin;\s*/im, '')
  .replace(/\s*commit;\s*$/i, '')
  .trim();
const sourceDigest = createHash('sha256').update(source).digest('hex');

const sql = `-- GENERATED FILE: do not edit or commit.
-- R2 tracked-link revocation: isolated-preview-only guarded execution bundle.
-- Recorded preview ref: ynzkwctwlssjcsjmahey
-- Production ref (never authorized here): iwoaaljitifloolszxlu
-- Source migration: ${migrationName}
-- Source SHA-256: ${sourceDigest}

begin;

do $$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null
     or to_regclass('public.proposal_tracking') is null
     or to_regprocedure('public.read_tracked_proposal_print(text)') is null then
    raise exception 'Revocation preflight refused: required post-09000 R2 schema is missing';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 60
     or (select count(*) from supabase_migrations.schema_migrations where version = '20260925009000') <> 1
     or exists (select 1 from supabase_migrations.schema_migrations where version = '20260925010000') then
    raise exception 'Revocation preflight refused: expected exact 60-version post-09000 history';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'proposal_tracking'
      and column_name in ('revoked_at','revoked_by','revocation_reason')
  ) or to_regprocedure('public.revoke_tracked_proposal_link(uuid,uuid,text)') is not null then
    raise exception 'Revocation preflight refused: partial or unrecorded revocation schema exists';
  end if;
end $$;

${body}

insert into supabase_migrations.schema_migrations (version, statements, name)
values ('20260925010000', array[]::text[], 'tracked_link_revocation');

do $$
declare
  fn text;
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 61
     or (select count(*) from supabase_migrations.schema_migrations where version = '20260925010000') <> 1 then
    raise exception 'Revocation postcondition failed: migration history is not exact';
  end if;
  if to_regprocedure('public.revoke_tracked_proposal_link(uuid,uuid,text)') is null
     or has_function_privilege('anon', 'public.revoke_tracked_proposal_link(uuid,uuid,text)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.revoke_tracked_proposal_link(uuid,uuid,text)', 'EXECUTE') then
    raise exception 'Revocation postcondition failed: RPC or ACL mismatch';
  end if;
  foreach fn in array array[
    'read_tracked_proposal(text)', 'read_tracked_proposal_print(text)',
    'tracked_proposal_has_paid_access(text)', 'record_tracked_view(text)',
    'record_tracked_download(text)', 'record_tracking_click(text,text,text,text)',
    'record_tracking_metric(text,text,integer)'
  ] loop
    if position('revoked_at is null' in lower(pg_get_functiondef(('public.' || fn)::regprocedure))) = 0 then
      raise exception 'Revocation postcondition failed: % lacks fail-closed predicate', fn;
    end if;
  end loop;
end $$;

commit;

select
  'r2_tracked_link_revocation' as evidence_key,
  '20260925010000' as applied_version,
  '${sourceDigest}' as source_sha256,
  (select count(*) from supabase_migrations.schema_migrations) as migration_history_count,
  to_regprocedure('public.revoke_tracked_proposal_link(uuid,uuid,text)') is not null as revoke_rpc_present,
  has_function_privilege('authenticated', 'public.revoke_tracked_proposal_link(uuid,uuid,text)', 'EXECUTE') as authenticated_execute,
  has_function_privilege('anon', 'public.revoke_tracked_proposal_link(uuid,uuid,text)', 'EXECUTE') as anon_execute;
`;

const output = process.argv[2] ?? resolve('/private/tmp', 'veltex-r2-revocation-preview.sql');
writeFileSync(output, sql, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({ output, migrationName, sourceDigest }, null, 2));
