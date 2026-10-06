#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const [captureArg, outputArg] = process.argv.slice(2);
if (!captureArg || !outputArg) {
  throw new Error('usage: build-production-rollback-cleanup.mjs <fresh-production-capture.json> <output.sql>');
}

const captureBytes = readFileSync(resolve(captureArg));
const capture = JSON.parse(captureBytes);
const outputPath = resolve(outputArg);
const sha = (value) => createHash('sha256').update(value).digest('hex');
const literal = (value) => `'${String(value).replaceAll("'", "''")}'`;
const expectedCaptureSha = 'd22b04c72c863cde6b2eaa04a61f0f322df11493968f4478afdacf5d7a97aa11';
const plannedVersions = ['20261001000000', '20261002000000'];

if (sha(captureBytes) !== expectedCaptureSha) throw new Error('fresh production capture bytes do not match the reviewed preflight');
if (capture.contract_version !== 3 || capture.canonicalization_version !== 2
    || capture.project_ref !== 'iwoaaljitifloolszxlu' || capture.environment !== 'production'
    || capture.read_only !== true || capture.postgres_version !== '17.6') {
  throw new Error('production capture identity/version mismatch');
}
if (capture.migration_history?.count !== 64 || capture.migration_history.versions.length !== 64
    || new Set(capture.migration_history.versions).size !== 64
    || plannedVersions.some((version) => capture.migration_history.versions.includes(version))) {
  throw new Error('production is not the exact pre-R3-1 64-version state');
}

const catalogSource = readFileSync(resolve(root, 'quality/r2-production-reconciliation/expected-state/catalog.sql'), 'utf8');
const markerIndex = catalogSource.indexOf('-- CATALOG_TERMINAL_QUERY');
if (markerIndex < 0) throw new Error('catalog terminal marker missing');
const expectedHistory = capture.migration_history.versions.map(literal).join(',');
const expectedHistoryHash = sha(capture.migration_history.versions.join('\n'));

const sql = `-- GENERATED R3-1 PRODUCTION ROLLBACK-PROOF CLEANUP. READ ONLY. DO NOT EDIT.
-- Fresh capture SHA-256: ${expectedCaptureSha}
-- Target: production iwoaaljitifloolszxlu only.
begin transaction read only;
set local statement_timeout='10min';
do $cleanup$
begin
  if current_user <> 'postgres' then raise exception 'R3-1 cleanup refused: current_user must be postgres'; end if;
  if current_setting('server_version') <> '17.6' then raise exception 'R3-1 cleanup refused: PostgreSQL version drift'; end if;
  if (select array_agg(version order by version collate "C") from supabase_migrations.schema_migrations)
     is distinct from array[${expectedHistory}]::text[] then raise exception 'R3-1 cleanup refused: migration history changed or proof residue persisted'; end if;
  if exists(select 1 from supabase_migrations.schema_migrations where version in ('20261001000000','20261002000000')) then
    raise exception 'R3-1 cleanup refused: planned migration history persisted';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'crm\\_%' escape '\\') then
    raise exception 'R3-1 cleanup refused: CRM relation residue persisted';
  end if;
end $cleanup$;
${catalogSource.slice(0, markerIndex)}select jsonb_build_object(
  'cleanup_pass',count(*)=2527
    and (select count(*) from supabase_migrations.schema_migrations)=64
    and (select count(*) from supabase_migrations.schema_migrations where version in ('20261001000000','20261002000000'))=0
    and (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'crm\\_%' escape '\\')=0,
  'read_only',current_setting('transaction_read_only')::boolean,
  'postgres_version',current_setting('server_version'),
  'history_count',(select count(*)::int from supabase_migrations.schema_migrations),
  'planned_history_count',(select count(*)::int from supabase_migrations.schema_migrations where version in ('20261001000000','20261002000000')),
  'history_sha256',(select encode(extensions.digest(convert_to(coalesce(string_agg(version,E'\\n' order by version collate "C"),''),'UTF8'),'sha256'),'hex') from supabase_migrations.schema_migrations),
  'expected_history_sha256','${expectedHistoryHash}',
  'catalog_count',count(*)::int,
  'catalog_sha256',encode(extensions.digest(convert_to(coalesce(string_agg(jsonb_build_array(atom->>'kind',atom->>'identity',atom->>'value_sha256')::text,E'\\n' order by atom->>'kind' collate "C",atom->>'identity' collate "C"),''),'UTF8'),'sha256'),'hex'),
  'expected_catalog_count',2527,
  'crm_relation_count',(select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'crm\\_%' escape '\\')
) from hashed cross join uniqueness where uniqueness.ok=1;
rollback;
`;

writeFileSync(outputPath, sql);
console.log(JSON.stringify({ output: outputPath, bytes: Buffer.byteLength(sql), sha256: sha(sql), capture_sha256: expectedCaptureSha }, null, 2));
