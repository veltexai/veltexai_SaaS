#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { attributeFinalWriters, diffAtoms, here, migrationFiles } from './generate-expected-state.mjs';

const fixture=JSON.parse(readFileSync(resolve(here,'synthetic-fixture.json')));
assert.deepEqual(diffAtoms(fixture.before,fixture.after),fixture.expected);
const attributed=attributeFinalWriters([
  {file:'one.sql',diff:{added:['function:f()'],removed:[],changed:[]}},
  {file:'two.sql',diff:{added:[],removed:[],changed:['function:f()']}},
  {file:'three.sql',diff:{added:['table:t'],removed:[],changed:[]}}
]);
assert.deepEqual(attributed[0].effective_atoms,[]);
assert.deepEqual(attributed[0].superseded_atoms,[{atom:'function:f()',by:'two.sql',action:'changed'}]);
assert.deepEqual(attributed[1].effective_atoms,['function:f()']);
assert.deepEqual(attributed[2].effective_atoms,['table:t']);
const files=migrationFiles();
assert.equal(files.length,64,'the contract is intentionally pinned to exactly 64 migrations');
assert.equal(new Set(files).size,64);
assert.equal(files[0],'001_initial_schema.sql');
assert.equal(files.at(-1),'20260925013000_production_schema_compatibility.sql');
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json')));
assert.equal(contract.contract_version,2);
assert.equal(contract.production_order.length,64);
assert.equal(contract.production_steps.length,35);
assert.match(contract.data_invariants_sha256,/^[0-9a-f]{64}$/);
for(const version of ['031','034','041','20260922000000','20260922010000','20260925001000']) assert.ok(contract.prerequisite_checkpoint.data_invariants[version]);
assert.equal(new Set(contract.production_order).size,64);
assert.deepEqual(new Set(contract.production_order),new Set(files));
const maintainRepair=readFileSync(resolve(here,'../../../supabase/migrations/20260925012000_revoke_client_maintain.sql'),'utf8');
for(const required of ['server_version_num',"execute 'revoke maintain on all tables in schema public from public, anon, authenticated'",'alter default privileges','has_table_privilege','pg_default_acl','pg_auth_members']) assert.match(maintainRepair,new RegExp(required,'i'));
assert.match(maintainRepair,/alter default privileges for role postgres in schema public revoke maintain on tables/i);
assert.match(maintainRepair,/supabase_admin/);
assert.match(maintainRepair,/current_user <> 'postgres'/);
const historicalGrantAllAllowlist=new Set(['002_grant_permissions.sql','010_admin_panel_tables.sql','011_admin_panel_missing_tables.sql','014_stripe_subscription_schema.sql']);
const newClientGrantAll=[];
for(const file of files){
  if(historicalGrantAllAllowlist.has(file))continue;
  const statements=readFileSync(resolve(here,'../../../supabase/migrations',file),'utf8').split(';');
  for(const statement of statements){
    const normalized=statement.replace(/--[^\n]*/g,' ').replace(/\s+/g,' ').trim();
    if(/\bgrant\s+all(?:\s+privileges)?\s+on\b.*\bto\s+(?:public\s*,\s*)?(?:anon|authenticated)\b/i.test(normalized))newClientGrantAll.push(`${file}: ${normalized}`);
  }
}
assert.deepEqual(newClientGrantAll,[],'new GRANT ALL to anon/authenticated requires explicit reviewed allowlisting');
const sql=readFileSync(resolve(here,'catalog.sql'),'utf8');
for(const required of ['table','column','constraint','index','function','view','trigger','policy','acl','type','sequence','extension']) assert.match(sql,new RegExp(`'${required}'`));
for(const required of ['reloptions','collation','ready','language','result','owned_by']) assert.match(sql,new RegExp(`'${required}'`));
assert.doesNotMatch(sql,/'position'\s*,/,'physical column order is diagnostic, not semantic migration evidence');
assert.doesNotMatch(sql,/'(?:oid|relid|typid|owner_oid)'\s*,/i,'catalog must not label internal identifiers as emitted values');
console.log('expected-state deterministic fixture/static contract PASS');
