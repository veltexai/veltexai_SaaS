#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const v1 = readFileSync(resolve(root,
  'supabase/migrations/20261005000000_r3_4_immutable_proposal_versions.sql'));
const migration = readFileSync(resolve(root,
  'supabase/migrations/20261006000000_r3_4_1_package_set_versions.sql'), 'utf8');

assert.equal(
  createHash('sha256').update(v1).digest('hex'),
  '86f438fe3a4516093534faf45d74bff4020dc68e9e40014f912e7152685678a3',
  'accepted R3-4 migration bytes changed',
);

for (const marker of [
  'create table public.crm_proposal_version_packages',
  'create function public.crm_proposal_scope_lines_valid',
  "schema_version='crm_proposal_version.v1'",
  "schema_version='crm_proposal_version.v2'",
  'and estimate_run_id is not null',
  'and work_package_id is null',
  'and estimate_run_id is null',
  'and package_count>0',
  "package_set_sha256 ~ '^[a-f0-9]{64}$'",
  'unique(organization_id,proposal_version_id,display_position)',
  'unique(organization_id,proposal_version_id,work_package_id)',
  'customer_visible_title text not null',
  'customer_visible_scope jsonb not null',
  'association_sha256 text not null',
  'guard_crm_proposal_version_package_immutable',
  'guard_crm_proposal_version_package_truncate',
  'guard_crm_package_proposal_version_binding',
  'assert_crm_proposal_package_set_consistent',
  'create function public.read_crm_proposal_package_set_preview_internal',
  'create function public.command_crm_publish_proposal_package_set_internal',
  "'package_ids',to_jsonb(p_package_ids)",
  "extract(epoch from token)::numeric order by ordinality",
  "proposal package set pricing basis must match",
  "'Service: '||replace(estimate_row.input_snapshot->>'jobType','_',' ')",
  'order by p.id for update',
  "'schema_version','crm_proposal_version.v2'",
  "'proposal.version_prepared'",
]) assert.ok(migration.includes(marker), `missing ${marker}`);

assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
assert.match(migration, /revoke all on public\.crm_proposal_version_packages\s+from public,anon,authenticated,service_role/);
assert.match(migration, /revoke all on function public\.command_crm_publish_proposal_package_set_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role;/);
assert.match(migration, /revoke all on function public\.read_crm_proposal_package_set_preview_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role;/);
assert.doesNotMatch(migration, /alter table public\.crm_proposal_versions[\s\S]*drop column/i);
assert.doesNotMatch(migration, /update\s+public\.crm_proposal_versions/i);
assert.doesNotMatch(migration, /delete\s+from\s+public\.crm_proposal_versions/i);
for (const privateKey of [
  'laborRate', 'modeledCost', 'margin', 'overhead', 'payrollBurden',
  'accessText', 'internalNotes', 'rawWalkthroughEvidence', 'overrideRationale',
]) assert.ok(!migration.includes(`'${privateKey}'`), `private key emitted: ${privateKey}`);
assert.ok(
  migration.indexOf('select m.role into actor_role')
    < migration.indexOf('select c.* into existing'),
  'authorization must precede command receipt lookup',
);

console.log('R3-4.1 additive package-set migration foundation PASS');
