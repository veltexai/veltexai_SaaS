#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const migrationDir = resolve(root, 'supabase/migrations');
const pgBin = process.env.PG_BIN || dirname(
  execFileSync('/usr/bin/which', ['initdb'], { encoding: 'utf8' }).trim(),
);
const work = mkdtempSync(resolve(tmpdir(), 'veltex-r3-4-1-foundation-'));
const data = resolve(work, 'data');
const port = Number(process.env.R3_4_1_FOUNDATION_PGPORT || 56500 + (process.pid % 300));
const run = (file, args) => execFileSync(file, args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
const psql = (args) => run(resolve(pgBin, 'psql'), [
  '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1',
  '-h', work, '-p', String(port), '-d', 'veltex_r341', ...args,
]);

let started = false;
try {
  run(resolve(pgBin, 'initdb'), ['-D', data, '-A', 'trust', '-U', process.env.USER || 'postgres']);
  run(resolve(pgBin, 'pg_ctl'), [
    '-D', data,
    '-o', `-p ${port} -k ${work} -c listen_addresses=''`,
    '-l', resolve(work, 'postgres.log'),
    'start',
  ]);
  started = true;
  run(resolve(pgBin, 'createdb'), [
    '-h', work, '-p', String(port), 'veltex_r341',
  ]);
  psql(['-f', resolve(root, 'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
  const migrations = readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
  assert.equal(migrations.length, 70, 'expected exact 70-migration chain');
  for (const migration of migrations) psql(['-f', resolve(migrationDir, migration)]);

  const proof = JSON.parse(psql(['-c', `select jsonb_build_object(
    'schema_version_constraint', exists(
      select 1 from pg_constraint
      where conrelid='public.crm_proposal_versions'::regclass
        and conname='crm_proposal_versions_schema_shape_check'
    ),
    'association_table', to_regclass('public.crm_proposal_version_packages') is not null,
    'association_rls', (
      select relrowsecurity from pg_class
      where oid='public.crm_proposal_version_packages'::regclass
    ),
    'association_columns', (
      select count(*) from information_schema.columns
      where table_schema='public' and table_name='crm_proposal_version_packages'
    ),
    'direct_service_role_insert', has_table_privilege(
      'service_role','public.crm_proposal_version_packages','INSERT'
    ),
    'migration_count', ${migrations.length}
  )::text`]).trim());

  assert.deepEqual(proof, {
    schema_version_constraint: true,
    association_table: true,
    association_rls: true,
    association_columns: 18,
    direct_service_role_insert: false,
    migration_count: 70,
  });
  console.log('R3-4.1 disposable PostgreSQL 70-migration foundation PASS');
} finally {
  if (started) {
    try { run(resolve(pgBin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast']); } catch {}
  }
  rmSync(work, { recursive: true, force: true });
}
