import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const migrationsDir = join(root, 'supabase/migrations');
const migrationName = '20261007000000_r3_4_1_estimate_summary_package_cardinality.sql';
const migrationVersion = '20261007000000';
const expectedSourceSha = 'f69b9bf189b44d955b39610c82d4762e73b854825bc93a4c42c400701433076f';
const reviewedTip = '99c76359610d152c60047ebd5fdecb2399e65d99';
const output = process.argv[2]
  || '/private/tmp/veltex-r3-4-1-cardinality-preview-apply.sql';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const source = readFileSync(join(migrationsDir, migrationName), 'utf8');
if (sha256(source) !== expectedSourceSha) throw new Error('cardinality migration source hash changed');
const lines = source.split(/\r?\n/);
if (!/^\s*begin;\s*$/i.test(lines[0])
    || !/^\s*commit;\s*$/i.test(lines.findLast((line) => line.trim()) || '')) {
  throw new Error('cardinality migration transaction boundary changed');
}
const body = lines.filter((line) => !/^\s*(begin|commit);\s*$/i.test(line)).join('\n');
const versions = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'))
  .map((name) => name.split('_')[0]).sort();
if (versions.length !== 71 || versions.at(-1) !== migrationVersion
    || new Set(versions).size !== 71) {
  throw new Error('expected exact 71-version chain ending in cardinality remediation');
}
const previous = versions.filter((version) => version !== migrationVersion);
const expectedValues = previous.map((version) => `('${version}')`).join(',');

const sql = `-- ISOLATED PREVIEW ONLY: reviewed R3-4.1 cardinality remediation.
-- Target project must be visibly confirmed as ynzkwctwlssjcsjmahey.
-- Production is excluded. Reviewed packet tip: ${reviewedTip}.
-- Migration SHA-256: ${expectedSourceSha}
begin;
select pg_advisory_xact_lock(hashtextextended('veltex-r3-4-1-cardinality-preview-apply',0));
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
     or (select count(*) from supabase_migrations.schema_migrations)<>70 then
    raise exception 'R3-4.1 cardinality history mismatch missing=% extra=%',missing,extra;
  end if;
  if to_regclass('public.crm_proposal_version_packages') is null
     or to_regprocedure('public.read_crm_estimate_summaries(uuid)') is null then
    raise exception 'R3-4.1 accepted predecessor is absent';
  end if;
  definition:=pg_get_functiondef('public.read_crm_estimate_summaries(uuid)'::regprocedure);
  if definition !~* 'distinct\\s+on\\s*\\(e\\.opportunity_id\\)'
     or definition ~* 'distinct\\s+on\\s*\\(e\\.opportunity_id\\s*,\\s*e\\.work_package_id\\)' then
    raise exception 'accepted opportunity-only estimate summary definition changed';
  end if;
  if not has_function_privilege('authenticated','public.read_crm_estimate_summaries(uuid)','EXECUTE')
     or has_function_privilege('anon','public.read_crm_estimate_summaries(uuid)','EXECUTE')
     or has_function_privilege('service_role','public.read_crm_estimate_summaries(uuid)','EXECUTE') then
    raise exception 'estimate summary privilege predecessor changed';
  end if;
end $preflight$;

${body}

insert into supabase_migrations.schema_migrations(version,name,statements)
values('${migrationVersion}','r3_4_1_estimate_summary_package_cardinality',
  array['source_sha256:${expectedSourceSha}']::text[]);

do $postflight$
declare definition text;
begin
  if (select count(*) from supabase_migrations.schema_migrations)<>71
     or (select count(*) from supabase_migrations.schema_migrations
         where version='${migrationVersion}')<>1 then
    raise exception 'R3-4.1 cardinality history postcondition failed';
  end if;
  definition:=pg_get_functiondef('public.read_crm_estimate_summaries(uuid)'::regprocedure);
  if definition !~* 'distinct\\s+on\\s*\\(e\\.opportunity_id\\s*,\\s*e\\.work_package_id\\)'
     or definition !~* 'order\\s+by\\s+e\\.opportunity_id\\s*,\\s*e\\.work_package_id\\s*,\\s*e\\.created_at\\s+desc\\s*,\\s*e\\.id\\s+desc' then
    raise exception 'per-package estimate summary postcondition failed';
  end if;
  if not has_function_privilege('authenticated','public.read_crm_estimate_summaries(uuid)','EXECUTE')
     or has_function_privilege('anon','public.read_crm_estimate_summaries(uuid)','EXECUTE')
     or has_function_privilege('service_role','public.read_crm_estimate_summaries(uuid)','EXECUTE') then
    raise exception 'estimate summary privilege postcondition failed';
  end if;
end $postflight$;

select 'R3_4_1_CARDINALITY_PREVIEW_APPLY_PASS' evidence,
  (select count(*) from supabase_migrations.schema_migrations) history_count;
commit;
`;

writeFileSync(output, sql);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(sql), sha256: sha256(sql),
  migration_sha256: expectedSourceSha, expected_history_before: 70,
  expected_history_after: 71 }));
