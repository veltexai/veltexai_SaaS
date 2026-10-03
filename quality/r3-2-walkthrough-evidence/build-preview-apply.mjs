import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261003000000_r3_2_walkthrough_evidence.sql';
const migrationVersion = '20261003000000';
const expectedSourceSha = '62b9f4c11386cb99249b41ff07930467824976b49bf75510127e6d36846d1632';
const output = process.argv[2] || '/private/tmp/veltex-r3-2-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('R3-2 migration source hash changed');
const bodyLines = source.split(/\r?\n/);
if (!/^\s*begin;\s*$/i.test(bodyLines[0])
    || !/^\s*commit;\s*$/i.test(bodyLines.findLast((line) => line.trim()) || '')) {
  throw new Error('R3-2 migration transaction boundary changed');
}
const body = bodyLines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 67 || versions.at(-1) !== migrationVersion
    || new Set(versions).size !== versions.length) {
  throw new Error('expected exact 67-version chain ending in R3-2');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: exact R3-2 atomic apply candidate.
-- Target project must be confirmed in the Supabase UI as ynzkwctwlssjcsjmahey.
-- Source commit is recorded separately in the authorization manifest.
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-2-preview-apply',0));
set local lock_timeout='15s';

create temp table r32_preservation(
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
     or (select count(*) from supabase_migrations.schema_migrations)<>66 then
    raise exception 'R3-2 preview history mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regclass('public.crm_walkthroughs') is null
     or to_regclass('public.crm_walkthrough_evidence_commands') is not null
     or to_regprocedure('public.command_crm_walkthrough_evidence(uuid,uuid,uuid,text,timestamp with time zone,text,boolean)') is not null
     or exists(select 1 from information_schema.columns where table_schema='public'
       and table_name='crm_walkthroughs' and column_name in
         ('evidence_notes','evidence_completed_at','evidence_recorded_by')) then
    raise exception 'R3-2 preview schema is not the exact pre-migration state';
  end if;
  for r in select c.relname from pg_class c join pg_namespace nsp on nsp.oid=c.relnamespace
    where nsp.nspname='public' and c.relkind in ('r','p') and c.relname like 'crm\\_%' escape '\\'
    order by c.relname collate "C"
  loop
    projection := case when r.relname='crm_walkthroughs'
      then 'to_jsonb(x)-array[''evidence_notes'',''evidence_completed_at'',''evidence_recorded_by'']'
      else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.relname)
      into n,h;
    insert into r32_preservation values(r.relname,n,h);
  end loop;
end $preflight$;

-- Exact body of ${migrationName}.
${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_2_walkthrough_evidence',
  array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare r record; projection text; n bigint; h text; unexpected text;
begin
  for r in select * from r32_preservation order by table_name collate "C" loop
    projection := case when r.table_name='crm_walkthroughs'
      then 'to_jsonb(x)-array[''evidence_notes'',''evidence_completed_at'',''evidence_recorded_by'']'
      else 'to_jsonb(x)' end;
    execute format('select count(*),encode(digest(convert_to(coalesce(string_agg(row_sha,'','' order by row_sha),''''),''UTF8''),''sha256''),''hex'') from (select encode(digest(convert_to((%s)::text,''UTF8''),''sha256''),''hex'') row_sha from public.%I x) q',projection,r.table_name)
      into n,h;
    if n is distinct from r.row_count or h is distinct from r.content_sha256 then
      raise exception 'protected CRM table changed: %',r.table_name;
    end if;
  end loop;
  if (select count(*) from supabase_migrations.schema_migrations)<>67
     or (select count(*) from supabase_migrations.schema_migrations where version='${migrationVersion}')<>1 then
    raise exception 'R3-2 history postcondition failed';
  end if;
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='crm_walkthrough_evidence_commands'
        and c.relkind='r' and c.relrowsecurity)
     or (select count(*) from public.crm_walkthrough_evidence_commands)<>0 then
    raise exception 'R3-2 receipt table postcondition failed';
  end if;
  if to_regprocedure('public.command_crm_walkthrough_evidence(uuid,uuid,uuid,text,timestamp with time zone,text,boolean)') is null
     or to_regprocedure('public.read_crm_walkthroughs(uuid)') is null
     or not exists(select 1 from pg_trigger where tgname='crm_walkthrough_evidence_outbox'
       and tgrelid='public.crm_walkthroughs'::regclass and not tgisinternal) then
    raise exception 'R3-2 routine/trigger postcondition failed';
  end if;
  if has_function_privilege('anon','public.command_crm_walkthrough_evidence(uuid,uuid,uuid,text,timestamp with time zone,text,boolean)','EXECUTE')
     or not has_function_privilege('authenticated','public.command_crm_walkthrough_evidence(uuid,uuid,uuid,text,timestamp with time zone,text,boolean)','EXECUTE')
     or has_table_privilege('authenticated','public.crm_walkthrough_evidence_commands','SELECT')
     or has_table_privilege('authenticated','public.crm_walkthrough_evidence_commands','INSERT')
     or has_table_privilege('authenticated','public.crm_walkthrough_evidence_commands','UPDATE')
     or has_table_privilege('authenticated','public.crm_walkthrough_evidence_commands','DELETE')
     or has_column_privilege('authenticated','public.crm_walkthroughs','evidence_notes','SELECT')
     or has_column_privilege('authenticated','public.crm_walkthroughs','evidence_completed_at','SELECT')
     or has_column_privilege('authenticated','public.crm_walkthroughs','evidence_recorded_by','SELECT')
     or not has_column_privilege('authenticated','public.crm_walkthroughs','id','SELECT') then
    raise exception 'R3-2 privilege postcondition failed';
  end if;
  select string_agg(column_name,',' order by column_name collate "C") into unexpected
  from (values('evidence_notes'),('evidence_completed_at'),('evidence_recorded_by')) e(column_name)
  where not exists(select 1 from information_schema.columns c where c.table_schema='public'
    and c.table_name='crm_walkthroughs' and c.column_name=e.column_name);
  if unexpected is not null then raise exception 'R3-2 columns missing: %',unexpected; end if;
end $postflight$;

select 'R3_2_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and c.relname like 'crm\\_%' escape '\\') crm_table_count,
  (select count(*) from public.crm_walkthrough_evidence_commands) receipt_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql),
  migration_sha256: expectedSourceSha, expected_history_before: 66,
  expected_history_after: 67 }));
