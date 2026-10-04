import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261004000000_r3_3_estimate_scenario_linkage.sql';
const migrationVersion = '20261004000000';
const expectedSourceSha = 'f1c34282cb12094888215fcc029a213cc78eca2cbc28a2e3f152cba74c09b1a8';
const output = process.argv[2] || '/private/tmp/veltex-r3-3-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('R3-3 migration source hash changed');
const bodyLines = source.split(/\r?\n/);
if (!/^\s*begin;\s*$/i.test(bodyLines[0])
    || !/^\s*commit;\s*$/i.test(bodyLines.findLast((line) => line.trim()) || '')) {
  throw new Error('R3-3 migration transaction boundary changed');
}
const body = bodyLines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 68 || versions.at(-1) !== migrationVersion
    || new Set(versions).size !== versions.length) {
  throw new Error('expected exact 68-version chain ending in R3-3');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: exact R3-3 atomic apply candidate.
-- Target project must be confirmed in the Supabase UI as ynzkwctwlssjcsjmahey.
-- Reviewed application/database candidate: c4aa33165f2f086e97fcce34a0c903f060039de3
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-3-preview-apply',0));
set local lock_timeout='15s';

create temp table r33_preservation(
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
     or (select count(*) from supabase_migrations.schema_migrations)<>67 then
    raise exception 'R3-3 preview history mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regclass('public.crm_site_work_packages') is null
     or to_regclass('public.crm_estimate_runs') is not null
     or to_regclass('public.crm_estimate_run_commands') is not null
     or to_regprocedure('public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamp with time zone)') is not null
     or exists(select 1 from information_schema.columns where table_schema='public'
       and table_name='crm_site_work_packages' and column_name='estimate_run_id') then
    raise exception 'R3-3 preview schema is not the exact pre-migration state';
  end if;
  for r in select c.relname from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace
    where nsp.nspname='public' and c.relkind in ('r','p') and c.relname like 'crm\\_%' escape '\\'
    order by c.relname collate "C"
  loop
    projection := case when r.relname='crm_site_work_packages'
      then 'to_jsonb(x)-''estimate_run_id''' else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.relname)
      into n,h;
    insert into r33_preservation values(r.relname,n,h);
  end loop;
end $preflight$;

-- Exact body of ${migrationName}.
${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_3_estimate_scenario_linkage',
  array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare r record; projection text; n bigint; h text;
begin
  for r in select * from r33_preservation order by table_name collate "C" loop
    projection := case when r.table_name='crm_site_work_packages'
      then 'to_jsonb(x)-''estimate_run_id''' else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.table_name)
      into n,h;
    if n is distinct from r.row_count or h is distinct from r.content_sha256 then
      raise exception 'protected CRM table changed: %',r.table_name;
    end if;
  end loop;
  if (select count(*) from supabase_migrations.schema_migrations)<>68
     or (select count(*) from supabase_migrations.schema_migrations where version='${migrationVersion}')<>1 then
    raise exception 'R3-3 history postcondition failed';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='crm_estimate_runs' and c.relkind='r' and c.relrowsecurity)
     or not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='crm_estimate_run_commands' and c.relkind='r' and c.relrowsecurity)
     or (select count(*) from public.crm_estimate_runs)<>0
     or (select count(*) from public.crm_estimate_run_commands)<>0 then
    raise exception 'R3-3 estimate tables postcondition failed';
  end if;
  if to_regprocedure('public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamp with time zone)') is null
     or to_regprocedure('public.read_crm_estimate_summaries(uuid)') is null
     or to_regprocedure('public.read_crm_estimate_runs(uuid,uuid)') is null
     or not exists(select 1 from pg_trigger where tgname='guard_crm_estimate_selection'
       and tgrelid='public.crm_site_work_packages'::regclass and not tgisinternal) then
    raise exception 'R3-3 routine/trigger postcondition failed';
  end if;
  if has_function_privilege('anon','public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamp with time zone)','EXECUTE')
     or has_function_privilege('authenticated','public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamp with time zone)','EXECUTE')
     or not has_function_privilege('service_role','public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamp with time zone)','EXECUTE')
     or has_table_privilege('authenticated','public.crm_estimate_runs','SELECT')
     or has_table_privilege('authenticated','public.crm_estimate_runs','INSERT')
     or has_table_privilege('authenticated','public.crm_estimate_run_commands','SELECT')
     or has_table_privilege('authenticated','public.crm_estimate_run_commands','INSERT')
     or not has_function_privilege('authenticated','public.read_crm_estimate_summaries(uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.read_crm_estimate_runs(uuid,uuid)','EXECUTE') then
    raise exception 'R3-3 privilege postcondition failed';
  end if;
  if not exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='crm_site_work_packages' and column_name='estimate_run_id')
     or not exists(select 1 from pg_constraint where conname='crm_site_work_packages_estimate_run_fk'
       and conrelid='public.crm_site_work_packages'::regclass)
     or not exists(select 1 from pg_constraint where conname='crm_site_work_packages_estimated_evidence_check'
       and conrelid='public.crm_site_work_packages'::regclass) then
    raise exception 'R3-3 package evidence postcondition failed';
  end if;
end $postflight$;

select 'R3_3_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count,
  (select count(*) from public.crm_estimate_runs) estimate_count,
  (select count(*) from public.crm_estimate_run_commands) receipt_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql),
  migration_sha256: expectedSourceSha, expected_history_before: 67,
  expected_history_after: 68 }));
