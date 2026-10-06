import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261005000000_r3_4_immutable_proposal_versions.sql';
const migrationVersion = '20261005000000';
const expectedSourceSha = '86f438fe3a4516093534faf45d74bff4020dc68e9e40014f912e7152685678a3';
const output = process.argv[2] || '/private/tmp/veltex-r3-4-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('R3-4 migration source hash changed');
const bodyLines = source.split(/\r?\n/);
if (!/^\s*begin;\s*$/i.test(bodyLines[0])
    || !/^\s*commit;\s*$/i.test(bodyLines.findLast((line) => line.trim()) || '')) {
  throw new Error('R3-4 migration transaction boundary changed');
}
const body = bodyLines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 69 || versions.at(-1) !== migrationVersion
    || new Set(versions).size !== versions.length) {
  throw new Error('expected exact 69-version chain ending in R3-4');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: exact R3-4 atomic apply candidate.
-- Target project must be confirmed in the Supabase UI as ynzkwctwlssjcsjmahey.
-- Candidate application commit must be the independently reviewed R3-4 implementation.
-- The migration source hash below is the authoritative database-byte binding.
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-4-preview-apply',0));
set local lock_timeout='15s';

create temp table r34_preservation(
  table_name text primary key,
  row_count bigint not null,
  content_sha256 text not null
) on commit drop;

do $preflight$
declare missing text; extra text; r record; projection text; n bigint; h text;
begin
  with expected(version) as (values ${expectedValues})
  select string_agg(e.version,',' order by e.version collate "C") into missing
  from expected e left join supabase_migrations.schema_migrations m using(version)
  where m.version is null;
  with expected(version) as (values ${expectedValues})
  select string_agg(m.version,',' order by m.version collate "C") into extra
  from supabase_migrations.schema_migrations m left join expected e using(version)
  where e.version is null;
  if missing is not null or extra is not null
     or (select count(*) from supabase_migrations.schema_migrations)<>68 then
    raise exception 'R3-4 preview history mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regclass('public.crm_estimate_runs') is null
     or to_regclass('public.crm_proposal_versions') is not null
     or to_regclass('public.crm_proposal_version_commands') is not null
     or to_regprocedure('public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamp with time zone)') is not null
     or exists(select 1 from information_schema.columns where table_schema='public'
       and table_name='crm_site_work_packages' and column_name='proposal_version_id') then
    raise exception 'R3-4 preview schema is not the exact pre-migration state';
  end if;
  for r in select c.relname from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace
    where nsp.nspname='public' and c.relkind in ('r','p')
      and (c.relname like 'crm\\_%' escape '\\' or c.relname='proposals')
    order by c.relname collate "C"
  loop
    projection := case when r.relname='crm_site_work_packages'
      then 'to_jsonb(x)-''proposal_version_id''' else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.relname)
      into n,h;
    insert into r34_preservation values(r.relname,n,h);
  end loop;
end $preflight$;

-- Exact body of ${migrationName}.
${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_4_immutable_proposal_versions',
  array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare r record; projection text; n bigint; h text;
begin
  for r in select * from r34_preservation order by table_name collate "C" loop
    projection := case when r.table_name='crm_site_work_packages'
      then 'to_jsonb(x)-''proposal_version_id''' else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.table_name)
      into n,h;
    if n is distinct from r.row_count or h is distinct from r.content_sha256 then
      raise exception 'protected R3 CRM content changed: %',r.table_name;
    end if;
  end loop;
  if (select count(*) from supabase_migrations.schema_migrations)<>69
     or (select count(*) from supabase_migrations.schema_migrations where version='${migrationVersion}')<>1 then
    raise exception 'R3-4 history postcondition failed';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='crm_proposal_versions' and c.relkind='r' and c.relrowsecurity)
     or not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='crm_proposal_version_commands' and c.relkind='r' and c.relrowsecurity)
     or (select count(*) from public.crm_proposal_versions)<>0
     or (select count(*) from public.crm_proposal_version_commands)<>0 then
    raise exception 'R3-4 proposal version tables postcondition failed';
  end if;
  if to_regprocedure('public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamp with time zone)') is null
     or to_regprocedure('public.read_crm_proposal_candidates(uuid,uuid)') is null
     or to_regprocedure('public.read_crm_proposal_versions(uuid,uuid)') is null
     or not exists(select 1 from pg_trigger where tgname='guard_crm_proposal_binding'
       and tgrelid='public.proposals'::regclass and not tgisinternal)
     or not exists(select 1 from pg_trigger where tgname='guard_crm_package_proposal_version_pointer'
       and tgrelid='public.crm_site_work_packages'::regclass and not tgisinternal)
     or not exists(select 1 from pg_trigger where tgname='guard_crm_proposal_version_immutable'
       and tgrelid='public.crm_proposal_versions'::regclass and not tgisinternal) then
    raise exception 'R3-4 routine/trigger postcondition failed';
  end if;
  if has_function_privilege('anon','public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamp with time zone)','EXECUTE')
     or has_function_privilege('authenticated','public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamp with time zone)','EXECUTE')
     or not has_function_privilege('service_role','public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamp with time zone)','EXECUTE')
     or has_table_privilege('authenticated','public.crm_proposal_versions','SELECT')
     or has_table_privilege('authenticated','public.crm_proposal_version_commands','SELECT')
     or not has_function_privilege('authenticated','public.read_crm_proposal_candidates(uuid,uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE') then
    raise exception 'R3-4 privilege postcondition failed';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='crm_site_work_packages' and column_name='proposal_version_id')
     or not exists(select 1 from pg_constraint where conname='crm_site_work_packages_proposal_version_fk'
       and conrelid='public.crm_site_work_packages'::regclass) then
    raise exception 'R3-4 package pointer postcondition failed';
  end if;
end $postflight$;

select 'R3_4_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count,
  (select count(*) from public.crm_proposal_versions) version_count,
  (select count(*) from public.crm_proposal_version_commands) receipt_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql),
  migration_sha256: expectedSourceSha, expected_history_before: 68,
  expected_history_after: 69 }));
