import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261006000000_r3_4_1_package_set_versions.sql';
const migrationVersion = '20261006000000';
const expectedSourceSha = '1f7f2943813111590e6de914f4de8f455113522079e0258015d56b90587a4eb1';
const output = process.argv[2] || '/private/tmp/veltex-r3-4-1-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('R3-4.1 migration source hash changed');
const lines = source.split(/\r?\n/);
if (!/^\s*begin;\s*$/i.test(lines[0]) || !/^\s*commit;\s*$/i.test(lines.findLast((x) => x.trim()) || '')) {
  throw new Error('R3-4.1 migration transaction boundary changed');
}
const body = lines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 70 || versions.at(-1) !== migrationVersion || new Set(versions).size !== 70) {
  throw new Error('expected exact 70-version chain ending in R3-4.1');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: exact reviewed R3-4.1 atomic apply candidate.
-- Target project must be visibly confirmed as ynzkwctwlssjcsjmahey.
-- Production is excluded. Reviewed source candidate: a98ca78f1d5527534a82f653edcd62e238951cac.
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-4-1-preview-apply',0));
set local lock_timeout='15s';

create temp table r341_preservation(table_name text primary key,row_count bigint not null,content_sha256 text not null) on commit drop;

do $preflight$
declare missing text; extra text; r record; projection text; n bigint; h text;
begin
  with expected(version) as (values ${expectedValues})
  select string_agg(e.version,',' order by e.version collate "C") into missing
  from expected e left join supabase_migrations.schema_migrations m using(version) where m.version is null;
  with expected(version) as (values ${expectedValues})
  select string_agg(m.version,',' order by m.version collate "C") into extra
  from supabase_migrations.schema_migrations m left join expected e using(version) where e.version is null;
  if missing is not null or extra is not null or (select count(*) from supabase_migrations.schema_migrations)<>69 then
    raise exception 'R3-4.1 preview history mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regclass('public.crm_proposal_versions') is null
     or to_regclass('public.crm_proposal_version_packages') is not null
     or to_regprocedure('public.read_crm_proposal_package_set_preview_internal(uuid,uuid,uuid,uuid,uuid,uuid[])') is not null
     or exists(select 1 from information_schema.columns where table_schema='public' and table_name='crm_proposal_versions' and column_name='package_count')
     or exists(select 1 from information_schema.columns where table_schema='public' and table_name='crm_proposal_version_commands' and column_name='resulting_package_updated_ats') then
    raise exception 'R3-4.1 preview schema is not the exact accepted R3-4 predecessor';
  end if;
  for r in select c.relname from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace
    where nsp.nspname='public' and c.relkind in ('r','p') and (c.relname like 'crm\\_%' escape '\\' or c.relname='proposals')
    order by c.relname collate "C"
  loop
    projection:='to_jsonb(x)';
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.relname) into n,h;
    insert into r341_preservation values(r.relname,n,h);
  end loop;
end $preflight$;

${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_4_1_package_set_versions',array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare r record; projection text; n bigint; h text;
begin
  for r in select * from r341_preservation order by table_name collate "C" loop
    projection:=case
      when r.table_name='crm_proposal_versions' then 'to_jsonb(x)-''package_count''-''package_set_sha256'''
      when r.table_name='crm_proposal_version_commands' then 'to_jsonb(x)-''resulting_package_updated_ats'''
      else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.table_name) into n,h;
    if n is distinct from r.row_count or h is distinct from r.content_sha256 then raise exception 'protected R3 CRM content changed: %',r.table_name; end if;
  end loop;
  if (select count(*) from supabase_migrations.schema_migrations)<>70
     or (select count(*) from supabase_migrations.schema_migrations where version='${migrationVersion}')<>1 then raise exception 'R3-4.1 history postcondition failed'; end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='crm_proposal_version_packages' and c.relkind='r' and c.relrowsecurity)
     or (select count(*) from public.crm_proposal_version_packages)<>0
     or exists(select 1 from public.crm_proposal_versions where schema_version='crm_proposal_version.v2') then raise exception 'R3-4.1 additive tables postcondition failed'; end if;
  if to_regprocedure('public.read_crm_proposal_package_set_preview_internal(uuid,uuid,uuid,uuid,uuid,uuid[])') is null
     or to_regprocedure('public.command_crm_publish_proposal_package_set_internal(uuid,uuid,uuid,uuid,uuid,uuid[],timestamp with time zone[],text)') is null
     or not exists(select 1 from pg_trigger where tgname='guard_crm_package_proposal_version_binding' and not tgisinternal)
     or not exists(select 1 from pg_trigger where tgname='assert_crm_proposal_package_set_parent' and not tgisinternal) then raise exception 'R3-4.1 routine/trigger postcondition failed'; end if;
  if has_table_privilege('authenticated','public.crm_proposal_version_packages','SELECT')
     or has_table_privilege('service_role','public.crm_proposal_version_packages','SELECT')
     or has_function_privilege('authenticated','public.command_crm_publish_proposal_package_set_internal(uuid,uuid,uuid,uuid,uuid,uuid[],timestamp with time zone[],text)','EXECUTE')
     or not has_function_privilege('service_role','public.command_crm_publish_proposal_package_set_internal(uuid,uuid,uuid,uuid,uuid,uuid[],timestamp with time zone[],text)','EXECUTE') then raise exception 'R3-4.1 privilege postcondition failed'; end if;
end $postflight$;

select 'R3_4_1_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count,
  (select count(*) from public.crm_proposal_version_packages) association_count,
  (select count(*) from public.crm_proposal_versions where schema_version='crm_proposal_version.v2') v2_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql), migration_sha256: expectedSourceSha, expected_history_before: 69, expected_history_after: 70 }));
