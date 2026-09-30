#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeBaseline } from '../preview-baseline-active.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const PRODUCTION_REF = 'iwoaaljitifloolszxlu';
const BASELINE_DIGEST = activeBaseline.proposal_content_sha256;
const sqlFiles = readdirSync(here).filter((name) => name.endsWith('.sql'));

const preR2 = readFileSync(resolve(here, '00-preview-guard.sql'), 'utf8')
  + readFileSync(resolve(here, '_pre_r2_fingerprint.fragment.sql'), 'utf8');
const postR2 = [
  '02-hosted-matrix.sql',
  '03-last-owner-single-session.sql',
  '04-u1-benchmark.sql',
  '_post_r2_fingerprint.fragment.sql',
].map((name) => readFileSync(resolve(here, name), 'utf8')).join('\n');

if (preR2.includes("'PREVIEW_REF_HERE'") || new RegExp(`preview_ref <> '${activeBaseline.project_ref}'`).test(preR2)) {
  throw new Error('pre-R2 guard still treats a pasted preview ref as identity');
}
if (!preR2.includes(BASELINE_DIGEST) || !/profile_count <> 0/.test(preR2) || !/proposal_count <> 0/.test(preR2)) {
  throw new Error('pre-R2 fingerprint missing recorded baseline counts or digest');
}
if (!/prerequisite_count <> 52/.test(preR2)
    || !/count\(\*\) from supabase_migrations\.schema_migrations\) <> 52/.test(preR2)
    || !preR2.includes("to_regclass('public.proposal_templates') is null")
    || !preR2.includes("to_regprocedure('public._r0_can_user_access_template_impl(uuid,uuid)') is null")
    || !preR2.includes("to_regprocedure('public.can_user_access_template(uuid,uuid)') is null")
    || !preR2.includes(activeBaseline.template_access_implementation_sha256)
    || !preR2.includes(activeBaseline.template_access_wrapper_sha256)
    || !preR2.includes('migration-029 schema/policy/trigger/index/FK/seed contract is incomplete')) {
  throw new Error('pre-R2 fingerprint lacks exact prerequisite/template-repair guards');
}
if (!/to_regclass\('public\.organizations'\) is not null/.test(preR2)) {
  throw new Error('pre-R2 fingerprint does not require the recorded pre-R2 schema state');
}
if (!postR2.includes(BASELINE_DIGEST) || !/id::text not like '91000000-%'/.test(postR2)
    || !/schema_migrations\) <> 57/.test(postR2)) {
  throw new Error('post-R2 fingerprint missing legacy baseline digest');
}

for (const name of sqlFiles) {
  const text = readFileSync(resolve(here, name), 'utf8');
  if (/^\\/m.test(text) || /\\gset|\\set |\\echo/.test(text) || /:'[A-Za-z0-9_]+'/.test(text)) {
    throw new Error(`${name} still contains a psql metacommand`);
  }
  if (/\), true\)\n(?:select|delete|insert|set |create)/i.test(text)) {
    throw new Error(`${name} is missing a semicolon after set_config`);
  }
  if (!text.includes(PRODUCTION_REF) || !text.includes('Refusing production project')) {
    throw new Error(`${name} lacks a production-ref defense-in-depth warning`);
  }
  if (!text.includes('PREPARED / NOT HOSTED-EXECUTED') && name.startsWith('_') === false && name !== '_guard.fragment.sql') {
    throw new Error(`${name} lacks PREPARED / NOT HOSTED-EXECUTED status`);
  }
  if (/four-role/.test(text) && !/uninvited-role denial/.test(text)) {
    throw new Error(`${name} overstates a positive four-role matrix`);
  }
}

for (const name of ['02-hosted-matrix.sql', '03-last-owner-single-session.sql', '04-u1-benchmark.sql']) {
  const text = readFileSync(resolve(here, name), 'utf8');
  if (!/begin;/i.test(text) || !/rollback;/i.test(text)) {
    throw new Error(`${name} must open a transaction and roll back`);
  }
}

const matrix = readFileSync(resolve(here, '02-hosted-matrix.sql'), 'utf8');
if (/four-role/.test(matrix) && !/owner plus uninvited-role denial/.test(matrix)) {
  throw new Error('02-hosted-matrix.sql still claims a positive four-role matrix');
}
for (const marker of [
  'owner', 'admin', 'estimator', 'viewer', '91000000', 'signup',
  'organization_audit_log', 'organization_event_outbox', 'organization_event_inbox',
  'example.test', 'owner_plus_uninvited_role_denial',
]) {
  if (!matrix.toLowerCase().includes(marker.toLowerCase())) {
    throw new Error(`02-hosted-matrix.sql missing ${marker}`);
  }
}

const u1 = readFileSync(resolve(here, '04-u1-benchmark.sql'), 'utf8');
if (/insert into public\.pdf_exports\s*\([^)]*(file_url|file_path)/is.test(u1)) {
  throw new Error('04-u1-benchmark.sql uses a removed pdf_exports path column');
}

console.log(JSON.stringify({
  status: 'PREPARED / NOT HOSTED-EXECUTED',
  mode: 'static-check',
  note: 'JS static checks do not prove hosted production refusal or database identity',
  fingerprint_digest: BASELINE_DIGEST,
  sql_files: sqlFiles.sort(),
}, null, 2));
