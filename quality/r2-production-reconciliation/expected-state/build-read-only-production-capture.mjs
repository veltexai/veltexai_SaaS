#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here=dirname(new URL(import.meta.url).pathname);
const output=resolve(process.argv[2]??'/private/tmp/veltex-r2-production-catalog-capture.sql');
if(!output.startsWith('/private/tmp/')) throw new Error('capture SQL output must remain below /private/tmp');
const catalog=readFileSync(resolve(here,'catalog.sql'),'utf8');
const dataInvariants=readFileSync(resolve(here,'data-invariants-expression.sql'),'utf8').trim();
const marker='-- CATALOG_TERMINAL_QUERY\n';
const markerIndex=catalog.indexOf(marker);
if(markerIndex<0||catalog.indexOf(marker,markerIndex+1)>=0) throw new Error('catalog.sql terminal query marker drifted');
const redacted=`select jsonb_pretty(jsonb_build_object(
  'contract_version',2,
  'captured_at',clock_timestamp(),
  'project_ref','iwoaaljitifloolszxlu',
  'environment','production',
  'read_only',true,
  'postgres_version',current_setting('server_version'),
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
const sql=`-- Generated from expected-state/catalog.sql. Returns hashes only; no row content.\n-- Confirm the dashboard project is iwoaaljitifloolszxlu before running.\nbegin transaction read only;\n\n${catalog.slice(0,markerIndex)}${redacted}\n\nrollback;\n`;
if(!/begin transaction read only;/i.test(sql)||!/^rollback;$/im.test(sql)) throw new Error('capture must remain read-only and rolled back');
writeFileSync(output,sql,{mode:0o600});
console.log(output);
