import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261007010000_r3_4_1_proposal_history_package_metadata.sql';
const migrationVersion = '20261007010000';
const expectedSourceSha = '2016dfa7101b3d5e377f046eb292d804188837aa647d5d5bcff09b9dd5d737e8';
const reviewedTip = 'e85a362ae476c99eb8518c5340bf18466e2e57d8';
const output = process.argv[2]
  || '/private/tmp/veltex-r3-4-1-history-metadata-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('history metadata migration source hash changed');
const lines = source.split(/\r?\n/);
if ((source.match(/^begin;$/gmu) || []).length !== 1
    || (source.match(/^commit;$/gmu) || []).length !== 1) {
  throw new Error('history metadata migration transaction boundary changed');
}
const body = lines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 72 || versions.at(-1) !== migrationVersion
    || new Set(versions).size !== 72) {
  throw new Error('expected exact 72-version chain ending in history metadata remediation');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: independently reviewed R3-4.1 history metadata remediation.
-- Target project must be visibly confirmed as ynzkwctwlssjcsjmahey.
-- Production is excluded. Reviewed implementation tip: ${reviewedTip}.
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-4-1-history-metadata-preview-apply',0));
set local lock_timeout='15s';

do $preflight$
declare missing text; extra text; definition text;
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
     or (select count(*) from supabase_migrations.schema_migrations)<>71 then
    raise exception 'R3-4.1 history metadata predecessor mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regprocedure('public.read_crm_proposal_versions(uuid,uuid)') is null then
    raise exception 'accepted proposal history reader is absent';
  end if;
  definition:=pg_get_functiondef('public.read_crm_proposal_versions(uuid,uuid)'::regprocedure);
  if definition ~* 'v\\.package_count' or definition ~* 'v\\.package_set_sha256' then
    raise exception 'proposal history reader is already replaced';
  end if;
  if not has_function_privilege('authenticated','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE')
     or has_function_privilege('anon','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE')
     or has_function_privilege('service_role','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE') then
    raise exception 'proposal history privilege predecessor changed';
  end if;
end $preflight$;

${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_4_1_proposal_history_package_metadata',
  array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare definition text; is_definer boolean; settings text[];
begin
  if (select count(*) from supabase_migrations.schema_migrations)<>72
     or (select count(*) from supabase_migrations.schema_migrations
         where version='${migrationVersion}')<>1 then
    raise exception 'R3-4.1 history metadata history postcondition failed';
  end if;
  select p.prosecdef,p.proconfig into is_definer,settings
  from pg_proc p where p.oid='public.read_crm_proposal_versions(uuid,uuid)'::regprocedure;
  definition:=pg_get_functiondef('public.read_crm_proposal_versions(uuid,uuid)'::regprocedure);
  if definition !~* 'v\\.package_count' or definition !~* 'v\\.package_set_sha256'
     or is_definer is not true
     or not ('search_path=pg_catalog, public'=any(settings)) then
    raise exception 'proposal history metadata definition postcondition failed';
  end if;
  if not has_function_privilege('authenticated','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE')
     or has_function_privilege('anon','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE')
     or has_function_privilege('service_role','public.read_crm_proposal_versions(uuid,uuid)','EXECUTE') then
    raise exception 'proposal history privilege postcondition failed';
  end if;
end $postflight$;

select 'R3_4_1_HISTORY_METADATA_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql),
  migration_sha256: expectedSourceSha, expected_history_before: 71,
  expected_history_after: 72 }));
