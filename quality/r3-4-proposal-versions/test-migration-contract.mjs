#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const migration = readFileSync(resolve(root,
  'supabase/migrations/20261005000000_r3_4_immutable_proposal_versions.sql'), 'utf8');
const matrix = readFileSync(resolve(root,
  'quality/r3-4-proposal-versions/sql/adversarial-role-matrix.sql'), 'utf8');
const concurrency = readFileSync(resolve(root,
  'quality/r3-4-proposal-versions/concurrency.sh'), 'utf8');

for (const marker of [
  'create table public.crm_proposal_versions',
  'create table public.crm_proposal_version_commands',
  'unique(organization_id,proposal_id,version_number)',
  'unique(organization_id,request_key)',
  'create function public.crm_proposal_snapshot_v1_valid',
  'create function public.crm_render_proposal_snapshot_v1',
  'create function public.read_crm_proposal_version_source_internal',
  'create function public.guard_crm_proposal_binding',
  'create function public.guard_crm_package_proposal_version_pointer',
  'create function public.command_crm_publish_proposal_version_internal',
  'proposal versions are immutable',
  'proposal version key already used',
  'closed opportunity cannot publish a proposal version',
  'site work package changed',
  "'proposal.version_prepared'",
  'create function public.read_crm_proposal_candidates',
  'create function public.read_crm_proposal_versions',
]) assert.ok(migration.includes(marker), `missing ${marker}`);

assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
assert.equal((migration.match(/grant execute on function public\.command_crm_publish_proposal_version_internal/g) ?? []).length, 1);
assert.match(migration, /revoke all on public\.crm_proposal_versions,public\.crm_proposal_version_commands\s+from public,anon,authenticated,service_role/);
assert.match(migration, /revoke all on function public\.command_crm_publish_proposal_version_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role;/);
assert.match(migration, /revoke all on function public\.read_crm_proposal_candidates\(uuid,uuid\)[\s\S]*from public,anon,service_role;[\s\S]*grant execute[\s\S]*to authenticated;/);
assert.doesNotMatch(migration, /grant\s+(insert|update|delete|truncate)[\s\S]*crm_proposal_versions/i);

for (const forbidden of [
  'laborRate', 'modeledCost', 'margin', 'overhead', 'payrollBurden',
  'accessText', 'internalNotes', 'rawWalkthroughEvidence', 'overrideRationale',
]) assert.ok(!migration.includes(`'${forbidden}'`), `private key accidentally allowlisted: ${forbidden}`);

assert.match(migration, /package_row\.status<>'estimated'/);
assert.match(migration, /package_row\.proposal_id is distinct from p_proposal/);
assert.match(migration, /package_row\.estimate_run_id is distinct from p_estimate_run/);
assert.match(migration, /proposal_row\.crm_customer_id is distinct from opportunity_row\.customer_id/);
assert.match(migration, /content_snapshot#>>'\{pricing,amountMinor\}'\)::bigint<>estimate_row\.selected_amount_minor/);
assert.match(migration, /content_snapshot#>>'\{pricing,currency\}'<>estimate_row\.currency/);
assert.match(migration, /content_snapshot#>>'\{pricing,basis\}'<>estimate_row\.pricing_basis/);
assert.match(migration, /p_rendered_content<>public\.crm_render_proposal_snapshot_v1\(p_content_snapshot\)/);
assert.match(migration, /'actor',p_actor,'proposal',p_proposal/);
assert.match(migration, /new\.estimate_run_id is distinct from old\.estimate_run_id[\s\S]*new\.proposal_version_id:=null/);
assert.match(migration, /versioned proposal binding is immutable/);
assert.match(migration, /before insert or update of crm_opportunity_id,crm_customer_id,crm_property_id/);
assert.match(migration, /auth\.uid\(\) is null then return new[\s\S]*old_opportunity_row\.id is null[\s\S]*can_access_crm_opportunity\(old_opportunity_row\.id\)/);
assert.match(migration, /guard_crm_proposal_version_command_immutable before update or delete/);
assert.match(migration, /guard_crm_proposal_version_command_truncate before truncate/);
assert.match(migration, /set_config\('veltex\.proposal_version_command','1',true\)[\s\S]*set_config\('veltex\.proposal_version_command','',true\)/);

for (const marker of [
  'owner first publish failed', 'exact version replay failed',
  'changed version replay accepted', 'stale package token accepted',
  'private snapshot key accepted', 'assigned estimator publish failed',
  'admin version allocation failed', 'viewer published a proposal version',
  'cross-tenant actor published a proposal version',
  'immutable version update accepted', 'immutable version delete accepted',
  'immutable version truncate accepted',
  'direct package proposal-version pointer clear accepted',
  'versioned proposal binding mutation accepted',
  'unassigned estimator inserted a bound proposal',
  'unassigned estimator rebound an unversioned proposal',
  'actor-bound receipt reuse accepted',
  'object-valued customer email accepted',
  'string-valued amountMinor accepted',
  'immutable proposal-version receipt update accepted',
  'immutable proposal-version receipt delete accepted',
  'immutable proposal-version receipt truncate accepted',
  're-estimation did not invalidate proposal-version pointer',
  'unassigned estimator read proposal-version source',
  'viewer read proposal-version source',
  'cross-tenant actor read proposal-version source',
  'authenticated direct version insert accepted',
  'viewer received immutable version metadata',
  'owner proposal candidate projection mismatch',
  'assigned estimator proposal candidate read failed',
  'viewer received proposal candidates',
  'nested private pricing key accepted', 'mismatched estimate amount accepted',
  'mismatched property context accepted',
  'same-org unassigned estimator published a proposal version',
  'older package-less estimate source accepted',
  'older package-less estimate published',
  'unassigned estimator cleared inaccessible old proposal binding',
  'closed opportunity proposal version accepted', 'closed-state exact replay failed',
  'R3_4_ADVERSARIAL_ROLE_MATRIX_PASS',
]) assert.ok(matrix.includes(marker), `matrix missing ${marker}`);
assert.equal((matrix.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((matrix.match(/^rollback;$/gm) ?? []).length, 1);
assert.equal((matrix.match(/^commit;$/gm) ?? []).length, 0);
for (const marker of [
  'version-race-a', 'version-race-b', 'R3_4_CONCURRENCY_PASS',
  "RESULT\" = '1|1|1|1|1|1'", 'statuses $SA/$SB',
  "wait_event_type='Lock'", 'required 40001 path',
]) assert.ok(concurrency.includes(marker), `concurrency proof missing ${marker}`);
assert.ok(concurrency.includes('guard_local.sh'), 'concurrency proof must refuse non-disposable targets');

console.log('R3-4 immutable proposal-version migration contract PASS');
