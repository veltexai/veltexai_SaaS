#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
  assert.equal(migrations.length, 74, 'expected exact 74-migration chain');
  for (const migration of migrations) psql(['-f', resolve(migrationDir, migration)]);

  psql(['-f', resolve(root, 'quality/service-catalog-round4/db-harness/sql/10_fixtures.sql')]);
  psql(['-v', 'check_definers=1', '-f', resolve(root,
    'quality/service-catalog-round4/db-harness/sql/30_assertions.sql')]);

  const packageMatrix = readFileSync(resolve(root,
    'quality/r3-4-1-package-set/sql/adversarial-role-matrix.sql'), 'utf8');
  const tokenMatrix = packageMatrix.replace(
    /select 'R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS';\s*rollback;\s*$/,
    () => `select 'R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS';

reset role;
select set_config('r35.version',(select id::text from public.crm_proposal_versions
  where proposal_id='93000000-0000-4000-8000-000000000004'
    and schema_version='crm_proposal_version.v2'),true);
create function pg_temp.r35_disabled_count(p_org uuid,p_version uuid)
returns bigint language sql security definer set search_path=pg_catalog,public as $$
  select count(*) from public.crm_proposal_action_eligibility_events
  where organization_id=p_org and proposal_version_id=p_version
    and state='disabled' and reason='token revoked'
$$;
do $$ begin
  if exists(
    select 1 from public.crm_proposal_version_packages a
    where a.scope_sha256<>public.crm_estimate_sha256(a.customer_visible_scope)
  ) then
    raise exception 'forward scope digest derivation failed';
  end if;
  if (select count(distinct a.customer_visible_scope)
      from public.crm_proposal_version_packages a
      where a.proposal_version_id=current_setting('r35.version')::uuid)<>2
     or (select count(distinct a.scope_sha256)
         from public.crm_proposal_version_packages a
         where a.proposal_version_id=current_setting('r35.version')::uuid)<>2 then
    raise exception 'real publisher mixed-scope trigger proof was not exercised';
  end if;
end $$;
-- Recreate one pre-correction immutable row inside this rollback-only proof.
-- The forward NOT VALID constraint protects new rows but intentionally does
-- not rewrite legacy R3-4.1 metadata.
set constraints all immediate;
alter table public.crm_proposal_version_packages
  drop constraint crm_proposal_version_packages_scope_digest_check;
set local session_replication_role=replica;
with target as (
  select a.id,a.display_position,a.work_package_id,a.estimate_run_id,
    a.customer_visible_title,a.amount_minor,a.currency,a.pricing_basis,
    a.estimate_input_sha256,a.estimate_output_sha256,
    jsonb_build_array('Service: post construction','Frequency: once') as new_scope
  from public.crm_proposal_version_packages a
  where a.proposal_version_id=current_setting('r35.version')::uuid
  order by a.display_position limit 1
)
update public.crm_proposal_version_packages a set
  customer_visible_scope=t.new_scope,
  association_sha256=public.crm_estimate_sha256(jsonb_build_object(
    'display_position',t.display_position,'work_package_id',t.work_package_id,
    'estimate_run_id',t.estimate_run_id,'title',t.customer_visible_title,
    'scope_sha256',public.crm_estimate_sha256(t.new_scope),
    'amount_minor',t.amount_minor,'currency',t.currency,
    'pricing_basis',t.pricing_basis,
    'estimate_input_sha256',t.estimate_input_sha256,
    'estimate_output_sha256',t.estimate_output_sha256))
from target t where a.id=t.id;
alter table public.crm_proposal_version_packages
  add constraint crm_proposal_version_packages_scope_digest_check
  check (
    scope_sha256=public.crm_estimate_sha256(customer_visible_scope)
  ) not valid;
update public.crm_proposal_versions v set package_set_sha256=(
  select public.crm_estimate_sha256(jsonb_agg(jsonb_build_object(
    'displayPosition',a.display_position,'workPackageId',a.work_package_id,
    'estimateRunId',a.estimate_run_id,'associationSha256',a.association_sha256)
    order by a.display_position))
  from public.crm_proposal_version_packages a
  where a.proposal_version_id=v.id)
where v.id=current_setting('r35.version')::uuid;
set local session_replication_role=origin;
set local role service_role;
do $$
declare org uuid:=current_setting('r341.org')::uuid;
  version_id uuid:=current_setting('r35.version')::uuid;
  issued record; replayed record; token_id uuid; sibling_token_id uuid; err text;
begin
  select * into issued from public.command_crm_issue_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',
    repeat('a',64),1,null,1,'r35-issue-owner-0001',repeat('b',64));
  if issued.replayed or not issued.raw_token_recoverable then
    raise exception 'initial token issue did not return first-use metadata';
  end if;
  token_id:=issued.token_id;
  select * into issued from public.command_crm_issue_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,'review_proposal',
    repeat('e',64),1,null,3,'r35-issue-sibling-0001',repeat('f',64));
  sibling_token_id:=issued.token_id;
  select * into replayed from public.command_crm_issue_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',
    repeat('c',64),1,null,1,'r35-issue-owner-0001',repeat('b',64));
  if not replayed.replayed or replayed.raw_token_recoverable
     or replayed.token_id<>token_id then raise exception 'exact issue replay failed'; end if;
  begin
    perform public.command_crm_issue_customer_action_token_internal(
      '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',
      repeat('d',64),1,null,1,'r35-issue-owner-0001',repeat('e',64));
    raise exception 'changed issue replay accepted';
  exception when unique_violation then
    get stacked diagnostics err=message_text;
    if err<>'customer action token request conflict' then raise; end if;
  end;
  begin
    perform public.command_crm_issue_customer_action_token_internal(
      '94444444-4444-4444-8444-444444444444',org,version_id,'accept_proposal',
      repeat('f',64),1,repeat('1',64),1,'r35-estimator-approver',repeat('2',64));
    raise exception 'estimator designated approver accepted';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'customer action token unavailable' then raise; end if;
  end;
  begin
    perform public.command_crm_issue_customer_action_token_internal(
      '95555555-5555-4555-8555-555555555555',org,version_id,'accept_proposal',
      repeat('3',64),1,null,1,'r35-viewer-denied',repeat('4',64));
    raise exception 'viewer token issue accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.command_crm_issue_customer_action_token_internal(
      '96666666-6666-4666-8666-666666666666',org,version_id,'accept_proposal',
      repeat('5',64),1,null,1,'r35-unassigned-denied',repeat('6',64));
    raise exception 'unassigned estimator token issue accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.command_crm_issue_customer_action_token_internal(
      '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',
      repeat('7',64),1,null,2,'r35-expiry-denied',repeat('8',64));
    raise exception 'invalid expiry accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform set_config('veltex.proposal_version_command','1',true);
    update public.crm_site_work_packages set proposal_version_id=null
      where id='93000000-0000-4000-8000-000000000005';
    perform public.command_crm_issue_customer_action_token_internal(
      '11111111-1111-4111-8111-111111111111',org,version_id,'accept_proposal',
      repeat('9',64),1,null,1,'r35-stale-pointer',repeat('0',64));
    raise exception 'stale package pointer accepted';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'customer action token unavailable' then raise; end if;
  end;
  begin
    perform public.command_crm_revoke_customer_action_token_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '99999999-9999-4999-8999-999999999999',token_id,
      'wrong version','r35-revoke-wrong-version',repeat('1',64));
    raise exception 'cross-version revoke accepted';
  exception when insufficient_privilege then null; end;
  select * into replayed from public.command_crm_revoke_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,token_id,
    repeat('r',240),'r35-revoke-owner-0001',repeat('2',64));
  if replayed.replayed then raise exception 'initial revoke marked replay'; end if;
  if pg_temp.r35_disabled_count(org,version_id)<>0 then
    raise exception 'revoking one of two active tokens disabled the version';
  end if;
  select * into replayed from public.command_crm_revoke_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,token_id,
    repeat('r',240),'r35-revoke-owner-0001',repeat('2',64));
  if not replayed.replayed then raise exception 'exact revoke replay failed'; end if;
  select * into replayed from public.command_crm_revoke_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,sibling_token_id,
    'last token revoked','r35-revoke-sibling-0001',repeat('3',64));
  if replayed.replayed then raise exception 'initial sibling revoke marked replay'; end if;
  if pg_temp.r35_disabled_count(org,version_id)<>1 then
    raise exception 'last active token did not create one bounded disabled event';
  end if;
  select * into replayed from public.command_crm_revoke_customer_action_token_internal(
    '11111111-1111-4111-8111-111111111111',org,version_id,sibling_token_id,
    'already revoked','r35-revoke-sibling-0002',repeat('4',64));
  if not replayed.replayed then raise exception 'already-revoked token was treated as new'; end if;
  if pg_temp.r35_disabled_count(org,version_id)<>1 then
    raise exception 're-revoking last token duplicated disabled event';
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare org uuid:=current_setting('r341.org')::uuid; begin
  if (select count(*) from public.read_crm_customer_action_token_status(
      org,current_setting('r35.version')::uuid))<>2 then
    raise exception 'owner status reader failed'; end if;
end $$;
select set_config('request.jwt.claim.sub','95555555-5555-4555-8555-555555555555',true);
do $$ declare org uuid:=current_setting('r341.org')::uuid; begin
  if exists(select 1 from public.read_crm_customer_action_token_status(
      org,current_setting('r35.version')::uuid)) then
    raise exception 'viewer status access accepted'; end if;
end $$;

reset role;
do $$ declare table_name text; begin
  foreach table_name in array array['crm_proposal_action_eligibility_events',
    'crm_customer_action_tokens','crm_customer_action_token_revocations',
    'crm_customer_action_token_commands'] loop
    begin execute format('update public.%I set organization_id=organization_id',table_name);
      raise exception 'append-only update accepted for %',table_name;
    exception when insufficient_privilege then null; end;
    begin execute format('delete from public.%I',table_name);
      raise exception 'append-only delete accepted for %',table_name;
    exception when insufficient_privilege then null; end;
    begin execute format('truncate public.%I cascade',table_name);
      raise exception 'append-only truncate accepted for %',table_name;
    exception when insufficient_privilege then null; end;
  end loop;
end $$;
select 'R3_5_C0_1_ADVERSARIAL_MATRIX_PASS';
rollback;
`);
  assert.notEqual(tokenMatrix, packageMatrix, 'failed to extend the R3-4.1 matrix');
  const tokenMatrixPath = resolve(work, 'r3-5-token-adversarial.sql');
  writeFileSync(tokenMatrixPath, tokenMatrix);
  const matrixOutput = psql(['-f', tokenMatrixPath]);
  assert.match(matrixOutput, /R3_5_C0_1_ADVERSARIAL_MATRIX_PASS/);

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
      'public.command_crm_issue_customer_action_token_internal(uuid,uuid,uuid,text,text,integer,text,integer,text,text)',
      'EXECUTE'),
    'authenticated_issue_execute',has_function_privilege(
      'authenticated',
      'public.command_crm_issue_customer_action_token_internal(uuid,uuid,uuid,text,text,integer,text,integer,text,text)',
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
    'scope_digest_trigger',exists(
      select 1 from pg_trigger
      where tgrelid='public.crm_proposal_version_packages'::regclass
        and tgname='derive_crm_proposal_version_package_scope_sha256'
        and not tgisinternal),
    'scope_digest_constraint_not_valid',exists(
      select 1 from pg_constraint
      where conrelid='public.crm_proposal_version_packages'::regclass
        and conname='crm_proposal_version_packages_scope_digest_check'
        and not convalidated),
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
    scope_digest_trigger: true,
    scope_digest_constraint_not_valid: true,
    migration_count: 74,
  });

  const tokenColumns = psql(['-c', `select string_agg(column_name,',' order by ordinal_position)
    from information_schema.columns
    where table_schema='public' and table_name='crm_customer_action_tokens'`]).trim();
  assert.doesNotMatch(tokenColumns, /raw|bearer|cookie|authorization|user_agent|ip_address/i);

  console.log('R3-5 C0.1 disposable PostgreSQL 74-migration token foundation PASS');
} finally {
  if (started) {
    try { run(resolve(pgBin, 'pg_ctl'), ['-D', data, 'stop', '-m', 'fast']); } catch {}
  }
  rmSync(work, { recursive: true, force: true });
}
