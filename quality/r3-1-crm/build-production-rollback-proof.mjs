#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const [captureArg, outputArg] = process.argv.slice(2);
if (!captureArg || !outputArg) {
  throw new Error('usage: build-production-rollback-proof.mjs <fresh-production-capture.json> <output.sql>');
}

const capturePath = resolve(captureArg);
const outputPath = resolve(outputArg);
const captureBytes = readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const expectedCaptureSha = 'c573f62044b1bed9fc27947acb0e3fab701947d58786acbc0f2a93fd022a3cd5';
const acceptedAppCommit = '0d765d7a9ae33c43f95e2721c661b651e7dbf76f';
const steps = [
  ['20261001000000', '20261001000000_r3_1_crm_foundation.sql', '526b56f0bd32c542f77b89e61df79eed18304e7cccd4b06d5c458fa3273ea795'],
  ['20261002000000', '20261002000000_r3_1_security_remediation.sql', '85fac17469510408ab777a04101c585850fd5774874e0fb01c663c8fddd3cf18'],
];

if (sha(captureBytes) !== expectedCaptureSha) throw new Error('fresh production capture bytes do not match the reviewed preflight');
if (capture.contract_version !== 3 || capture.canonicalization_version !== 2
    || capture.project_ref !== 'iwoaaljitifloolszxlu' || capture.environment !== 'production'
    || capture.read_only !== true || capture.postgres_version !== '17.6') {
  throw new Error('production capture identity/version mismatch');
}
if (capture.migration_history?.count !== 64 || capture.migration_history.versions.length !== 64
    || new Set(capture.migration_history.versions).size !== 64
    || steps.some(([version]) => capture.migration_history.versions.includes(version))) {
  throw new Error('production is not the exact pre-R3-1 64-version state');
}
if (capture.catalog_atoms?.length !== 2527 || capture.effective_privileges?.length !== 1323) {
  throw new Error('production capture inventory size mismatch');
}

function body(file, expectedSha) {
  const source = readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');
  if (sha(source) !== expectedSha) throw new Error(`accepted source drift: ${file}`);
  const begins = source.match(/^\s*begin(?: transaction)?;\s*$/gim) ?? [];
  const commits = source.match(/^\s*commit;\s*$/gim) ?? [];
  if (begins.length !== 1 || commits.length !== 1
      || !/^\s*begin(?: transaction)?;\s*$/im.test(source)
      || !/^\s*commit;\s*$/i.test(source.trimEnd().split('\n').at(-1))) {
    throw new Error(`migration does not have one exact outer transaction wrapper: ${file}`);
  }
  return source.replace(/^\s*begin(?: transaction)?;\s*/im, '').replace(/\s*commit;\s*$/i, '').trim();
}

const catalogSource = readFileSync(resolve(root, 'quality/r2-production-reconciliation/expected-state/catalog.sql'), 'utf8');
const marker = '-- CATALOG_TERMINAL_QUERY';
const markerIndex = catalogSource.indexOf(marker);
if (markerIndex < 0) throw new Error('catalog terminal marker missing');
const liveCatalogQuery = `${catalogSource.slice(0, markerIndex)}select atom->>'kind' kind,atom->>'identity' identity,atom->>'value_sha256' value_sha256 from hashed cross join uniqueness where uniqueness.ok=1`;
const effectiveExpression = readFileSync(resolve(root, 'quality/r2-production-reconciliation/expected-state/effective-privileges-expression.sql'), 'utf8').trim();
const invariantExpression = readFileSync(resolve(root, 'quality/r2-production-reconciliation/expected-state/data-invariants-expression.sql'), 'utf8').trim();
const expectedCatalog = capture.catalog_atoms.map((x) => `(${literal(x.kind)},${literal(x.identity)},${literal(x.value_sha256)})`).join(',\n');
const expectedHistory = capture.migration_history.versions.map(literal).join(',');
const contentExpression = `jsonb_build_object(
  'profiles_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.profiles x) q),
  'proposals_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposals x) q),
  'tracking_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_tracking x) q),
  'branding_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.user_branding_settings x) q),
  'subscriptions_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.subscriptions x) q),
  'usage_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.usage x) q),
  'addon_catalog_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.additional_service_catalog x) q),
  'proposal_addons_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_additional_services x) q),
  'proposal_templates_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.proposal_templates x) q),
  'tier_access_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.template_tier_access x) q),
  'template_preferences_all',(select encode(digest(coalesce(string_agg(row_hash,',' order by row_hash),''),'sha256'),'hex') from (select encode(digest(to_jsonb(x)::text,'sha256'),'hex') row_hash from public.user_template_preferences x) q)
)`;

const stepSql = steps.map(([version, file, sourceSha], index) => `-- STEP ${index + 1}/2 ${file}\n-- SOURCE SHA-256 ${sourceSha}\ndo $$ begin
  if exists (select 1 from supabase_migrations.schema_migrations where version=${literal(version)}) then
    raise exception 'R3-1 rollback proof refused: history appeared early for ${version}';
  end if;
end $$;\n${body(file, sourceSha)}\ninsert into supabase_migrations.schema_migrations(version,name,statements)
values(${literal(version)},${literal(file.replace(/^\d+_/, '').replace(/\.sql$/, ''))},array[${literal(`source_sha256:${sourceSha}`)}]::text[]);`).join('\n\n');

const sql = `-- GENERATED R3-1 PRODUCTION ROLLBACK-PROOF. DO NOT EDIT OR COMMIT.
-- Accepted application commit: ${acceptedAppCommit}
-- Fresh capture SHA-256: ${expectedCaptureSha}
-- Target: production iwoaaljitifloolszxlu only.
begin;
set local lock_timeout='15s';
set local statement_timeout='30min';
select pg_advisory_xact_lock(hashtextextended('veltex-r3-1-production-release',0));
lock table supabase_migrations.schema_migrations in share row exclusive mode;
do $lock$
declare relation_name text;
begin
  for relation_name in select format('%I.%I',n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind in ('r','p') and not exists
      (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
    order by c.relname collate "C"
  loop execute 'lock table '||relation_name||' in share row exclusive mode'; end loop;
end $lock$;
create temp table r31_expected_catalog(kind text,identity text,value_sha256 text,primary key(kind,identity)) on commit drop;
insert into r31_expected_catalog values\n${expectedCatalog};
create temp table r31_live_catalog on commit drop as\n${liveCatalogQuery};
do $preflight$
begin
  if current_user <> 'postgres' then raise exception 'R3-1 rollback proof refused: current_user must be postgres'; end if;
  if (select array_agg(version order by version collate "C") from supabase_migrations.schema_migrations)
     is distinct from array[${expectedHistory}]::text[] then raise exception 'R3-1 rollback proof refused: history drift'; end if;
  if exists(select * from r31_expected_catalog except select * from r31_live_catalog)
     or exists(select * from r31_live_catalog except select * from r31_expected_catalog) then raise exception 'R3-1 rollback proof refused: catalog drift'; end if;
  if (${effectiveExpression}) is distinct from $expected$${JSON.stringify(capture.effective_privileges)}$expected$::jsonb then raise exception 'R3-1 rollback proof refused: effective privilege drift'; end if;
  if (${contentExpression}) is distinct from $expected$${JSON.stringify(capture.content_digests)}$expected$::jsonb then raise exception 'R3-1 rollback proof refused: protected content drift'; end if;
  if (${invariantExpression}) is distinct from $expected$${JSON.stringify(capture.data_invariants)}$expected$::jsonb then raise exception 'R3-1 rollback proof refused: invariant drift'; end if;
  if to_regclass('public.crm_opportunities') is not null then raise exception 'R3-1 rollback proof refused: CRM already present'; end if;
end $preflight$;
${stepSql}
do $postconditions$
declare table_name text;
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 66
     or (select count(*) from supabase_migrations.schema_migrations where version in ('20261001000000','20261002000000')) <> 2 then
    raise exception 'R3-1 rollback proof postcondition failed: history';
  end if;
  foreach table_name in array array['crm_customers','crm_contacts','crm_customer_contacts','crm_properties','crm_pipelines','crm_pipeline_stages','crm_loss_reasons','crm_lead_sources','crm_referral_sources','crm_leads','crm_opportunities','crm_walkthroughs','crm_tasks','crm_site_work_packages','crm_opportunity_stage_history','crm_opportunity_stage_commands','crm_task_commands','crm_assignment_commands','crm_lead_commands','crm_attribution_touches','crm_qualification_responses','crm_walkthrough_commands'] loop
    if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=table_name and c.relrowsecurity) then
      raise exception 'R3-1 rollback proof postcondition failed: % missing or RLS disabled',table_name;
    end if;
    if has_table_privilege('authenticated',format('public.%I',table_name),'INSERT')
       or has_table_privilege('authenticated',format('public.%I',table_name),'UPDATE')
       or has_table_privilege('authenticated',format('public.%I',table_name),'DELETE')
       or has_table_privilege('authenticated',format('public.%I',table_name),'TRUNCATE') then
      raise exception 'R3-1 rollback proof postcondition failed: authenticated direct DML on %',table_name;
    end if;
  end loop;
  if exists(
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and (p.proname like '%crm%' or p.proname like 'read_%walkthrough%')
      and has_function_privilege('anon',p.oid,'EXECUTE')
  ) then
    raise exception 'R3-1 rollback proof postcondition failed: anonymous CRM routine execute';
  end if;
end $postconditions$;
do $evidence$
declare result jsonb;
begin
${catalogSource.slice(0, markerIndex)}select jsonb_build_object(
  'rollback_proof',true,
  'history_count',(select count(*)::int from supabase_migrations.schema_migrations),
  'history_sha256',(select encode(digest(convert_to(coalesce(string_agg(version,E'\\n' order by version collate "C"),''),'UTF8'),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'catalog_count',count(*)::int,
  'catalog_sha256',encode(digest(convert_to(coalesce(string_agg(jsonb_build_array(atom->>'kind',atom->>'identity',atom->>'value_sha256')::text,E'\\n' order by atom->>'kind' collate "C",atom->>'identity' collate "C"),''),'UTF8'),'sha256'),'hex'),
  'effective_privileges_sha256',encode(digest(convert_to((${effectiveExpression})::text,'UTF8'),'sha256'),'hex'),
  'content_digests_sha256',encode(digest(convert_to((${contentExpression})::text,'UTF8'),'sha256'),'hex'),
  'data_invariants_sha256',encode(digest(convert_to((${invariantExpression})::text,'UTF8'),'sha256'),'hex')
) into result from hashed cross join uniqueness where uniqueness.ok=1;
  raise exception using errcode='P0001',message='R3_1_ROLLBACK_PROOF:'||result::text;
end $evidence$;
rollback;
`;

writeFileSync(outputPath, sql);
console.log(JSON.stringify({ output: outputPath, bytes: Buffer.byteLength(sql), sha256: sha(sql), capture_sha256: expectedCaptureSha, accepted_app_commit: acceptedAppCommit, steps: steps.map(([version, file, source_sha256]) => ({ version, file, source_sha256 })) }, null, 2));
