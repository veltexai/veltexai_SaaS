#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { activeBaseline } from '../preview-baseline-active.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, '00-preview-guard.sql');
const fingerprint = readFileSync(resolve(here, '_pre_r2_fingerprint.fragment.sql'), 'utf8').trim();
const sql = `-- GENERATED FILE: do not edit directly.
-- R2 SQL Editor pre-migration fingerprint.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- Identity is the recorded database state, not a pasted project ref.
-- Recorded preview name (not a database proof): ${activeBaseline.project_ref}
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.

${fingerprint}

select
  'sql_editor_preview_fingerprint' as evidence_key,
  'pre_r2_isolated_preview_baseline' as identity,
  (select count(*) from supabase_migrations.schema_migrations) as migration_history_count,
  (select count(*) from public.profiles) as profile_count,
  (select count(*) from public.proposals) as proposal_count,
  (
    select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    from public.proposals
  ) as proposal_content_sha256;
`;

if (process.argv.includes('--check')) {
  if (readFileSync(output, 'utf8') !== sql) throw new Error('00-preview-guard.sql is out of parity');
  console.log('SQL Editor preview guard parity PASS');
} else {
  writeFileSync(output, sql);
  console.log('wrote sql-editor/00-preview-guard.sql');
}
