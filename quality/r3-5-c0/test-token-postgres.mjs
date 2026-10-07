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
const work = mkdtempSync(resolve(tmpdir(), 'veltex-r3-5-token-'));
const data = resolve(work, 'data');
const port = Number(process.env.R3_5_TOKEN_PGPORT || 56900 + (process.pid % 300));
const run = (file, args, env = process.env) => execFileSync(file, args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  env,
});
const psql = (args) => run(resolve(pgBin, 'psql'), [
  '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1',
  '-h', work, '-p', String(port), '-d', 'veltex_r35', ...args,
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
  run(resolve(pgBin, 'createdb'), ['-h', work, '-p', String(port), 'veltex_r35']);
  psql(['-f', resolve(root, 'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
  const migrations = readdirSync(migrationDir).filter((file) => file.endsWith('.sql')).sort();
  assert.equal(migrations.length, 73, 'expected exact 73-migration chain');
  for (const migration of migrations) psql(['-f', resolve(migrationDir, migration)]);

  const proof = JSON.parse(psql(['-c', `select jsonb_build_object(
    'token_table',to_regclass('public.crm_customer_action_tokens') is not null,
    'revocation_table',to_regclass('public.crm_customer_action_token_revocations') is not null,
    'eligibility_table',to_regclass('public.crm_proposal_action_eligibility_events') is not null,
    'rate_table',to_regclass('public.crm_customer_action_rate_buckets') is not null,
    'token_rls',(select relrowsecurity from pg_class
      where oid='public.crm_customer_action_tokens'::regclass),
    'anon_token_select',has_table_privilege(
      'anon','public.crm_customer_action_tokens','SELECT'),
    'authenticated_token_select',has_table_privilege(
      'authenticated','public.crm_customer_action_tokens','SELECT'),
    'service_token_insert',has_table_privilege(
      'service_role','public.crm_customer_action_tokens','INSERT'),
    'service_issue_execute',has_function_privilege(
      'service_role',
      'public.command_crm_issue_customer_action_token_internal(uuid,uuid,uuid,text,text,integer,text,timestamptz,text,text)',
      'EXECUTE'),
    'authenticated_issue_execute',has_function_privilege(
      'authenticated',
      'public.command_crm_issue_customer_action_token_internal(uuid,uuid,uuid,text,text,integer,text,timestamptz,text,text)',
      'EXECUTE'),
    'service_revoke_execute',has_function_privilege(
      'service_role',
      'public.command_crm_revoke_customer_action_token_internal(uuid,uuid,uuid,uuid,text,text,text)',
      'EXECUTE'),
    'authenticated_status_execute',has_function_privilege(
      'authenticated','public.read_crm_customer_action_token_status(uuid,uuid)','EXECUTE'),
    'anon_status_execute',has_function_privilege(
      'anon','public.read_crm_customer_action_token_status(uuid,uuid)','EXECUTE'),
    'service_status_execute',has_function_privilege(
      'service_role','public.read_crm_customer_action_token_status(uuid,uuid)','EXECUTE'),
    'migration_count',${migrations.length}
  )::text`]).trim());

  assert.deepEqual(proof, {
    token_table: true,
    revocation_table: true,
    eligibility_table: true,
    rate_table: true,
    token_rls: true,
    anon_token_select: false,
    authenticated_token_select: false,
    service_token_insert: false,
    service_issue_execute: true,
    authenticated_issue_execute: false,
    service_revoke_execute: true,
    authenticated_status_execute: true,
    anon_status_execute: false,
    service_status_execute: false,
    migration_count: 73,
  });

  const tokenColumns = psql(['-c', `select string_agg(column_name,',' order by ordinal_position)
    from information_schema.columns
    where table_schema='public' and table_name='crm_customer_action_tokens'`]).trim();
  assert.doesNotMatch(tokenColumns, /raw|bearer|cookie|authorization|user_agent|ip_address/i);

  console.log('R3-5 C0.1 disposable PostgreSQL 73-migration token foundation PASS');
} finally {
  if (started) {
    try { run(resolve(pgBin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast']); } catch {}
  }
  rmSync(work, { recursive: true, force: true });
}
