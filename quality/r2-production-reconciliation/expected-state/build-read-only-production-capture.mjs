#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const here=dirname(new URL(import.meta.url).pathname);
const args=process.argv.slice(2);
const option=(name, fallback)=>{
  const index=args.indexOf(name);
  if(index<0) return fallback;
  if(!args[index+1]||args[index+1].startsWith('--')) throw new Error(`${name} requires a value`);
  return args[index+1];
};
const positional=args.filter((value,index)=>!value.startsWith('--')&&(index===0||!args[index-1].startsWith('--')));
const projectRef=option('--project-ref','iwoaaljitifloolszxlu');
const environment=option('--environment','production');
const allowedTarget=(projectRef==='iwoaaljitifloolszxlu'&&environment==='production')
  ||(projectRef==='ynzkwctwlssjcsjmahey'&&environment==='isolated-preview');
if(!allowedTarget) throw new Error('capture target must be the pinned production project or pinned isolated preview');
const defaultOutput=environment==='production'
  ?'/private/tmp/veltex-r2-production-catalog-capture.sql'
  :'/private/tmp/veltex-r2-isolated-preview-catalog-capture.sql';
const output=resolve(positional[0]??defaultOutput);
if(!output.startsWith('/private/tmp/')) throw new Error('capture SQL output must remain below /private/tmp');
const catalog=readFileSync(resolve(here,'catalog.sql'),'utf8');
const dataInvariants=readFileSync(resolve(here,'data-invariants-expression.sql'),'utf8').trim();
const effectivePrivileges=readFileSync(resolve(here,'effective-privileges-expression.sql'),'utf8').trim();
const effectivePrivilegeMatrixBytes=readFileSync(resolve(here,'expected-effective-privileges.v1.json'));
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json'),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const marker='-- CATALOG_TERMINAL_QUERY\n';
const markerIndex=catalog.indexOf(marker);
if(markerIndex<0||catalog.indexOf(marker,markerIndex+1)>=0) throw new Error('catalog.sql terminal query marker drifted');
const redacted=`select jsonb_pretty(jsonb_build_object(
  'contract_version',3,
  'canonicalization_version',2,
  'contract_binding',jsonb_build_object('catalog_sha256','${contract.catalog_sha256}','data_invariants_sha256','${contract.data_invariants_sha256}',
    'migrations_sha256','${contract.migrations_sha256}','capture_generator_sha256','${sha(readFileSync(new URL(import.meta.url)))}',
    'effective_privileges_expression_sha256','${sha(readFileSync(resolve(here,'effective-privileges-expression.sql')))}',
    'expected_effective_privileges_sha256','${sha(effectivePrivilegeMatrixBytes)}'),
  'captured_at',clock_timestamp(),
  'project_ref','${projectRef}',
  'environment','${environment}',
  'read_only',true,
  'postgres_version',current_setting('server_version'),
  'platform_capabilities',jsonb_build_object(
    'pgcrypto',(select jsonb_build_object('installed',true,'schema',n.nspname,'version',e.extversion,
      'digest_extension_owned',p.oid is not null,'digest_callable',coalesce(has_function_privilege(current_user,p.oid,'EXECUTE'),false))
      from pg_extension e join pg_namespace n on n.oid=e.extnamespace
      left join lateral (select q.oid from pg_proc q join pg_depend d on d.classid='pg_proc'::regclass and d.objid=q.oid
        where d.refclassid='pg_extension'::regclass and d.refobjid=e.oid and d.deptype='e'
          and q.pronamespace=e.extnamespace and q.proname='digest' and pg_get_function_identity_arguments(q.oid)='text, text' limit 1) p on true
      where e.extname='pgcrypto'),
    'role_membership',(select coalesce(jsonb_agg(jsonb_build_object('role',r.rolname,'member',m.rolname) order by r.rolname,m.rolname),'[]'::jsonb)
      from pg_auth_members am join pg_roles r on r.oid=am.roleid join pg_roles m on m.oid=am.member
      where r.rolname in ('anon','authenticated','service_role') or m.rolname in ('anon','authenticated','service_role'))
  ),
  'effective_privileges',${effectivePrivileges},
  'migration_history',(select jsonb_build_object(
    'count',count(*)::int,
    'versions',coalesce(jsonb_agg(version order by version),'[]'::jsonb)
  ) from supabase_migrations.schema_migrations),
  'row_counts',jsonb_build_object(
    'profiles',(select count(*)::int from public.profiles),
    'proposals',(select count(*)::int from public.proposals),
    'proposal_tracking',(select count(*)::int from public.proposal_tracking),
    'company_profiles',(select count(*)::int from public.company_profiles),
    'user_branding_settings',(select count(*)::int from public.user_branding_settings),
    'subscriptions',(select count(*)::int from public.subscriptions)
  ),
  'orphan_counts',jsonb_build_object(
    'proposals_without_profile',(select count(*)::int from public.proposals p left join public.profiles pr on pr.id=p.user_id where pr.id is null),
    'tracking_without_proposal',(select count(*)::int from public.proposal_tracking t left join public.proposals p on p.id=t.proposal_id where p.id is null)
  ),
  'content_digests',jsonb_build_object(
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
  ),
  'data_invariants',${dataInvariants},
  'catalog_atoms',coalesce(jsonb_agg(jsonb_build_object(
    'kind',atom->>'kind','identity',atom->>'identity','value_sha256',atom->>'value_sha256'
  ) order by atom->>'kind',atom->>'identity'),'[]'::jsonb)
)) from hashed;`;
const sql=`-- Generated from expected-state/catalog.sql. Returns hashes only; no row content.\n-- Confirm the dashboard project is ${projectRef} (${environment}) before running.\nbegin transaction read only;\n\n${catalog.slice(0,markerIndex)}${redacted}\n\nrollback;\n`;
if(!/begin transaction read only;/i.test(sql)||!/^rollback;$/im.test(sql)) throw new Error('capture must remain read-only and rolled back');
writeFileSync(output,sql,{mode:0o600});
console.log(output);
