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
assert.equal(files.length,62,'the contract is intentionally pinned to exactly 62 migrations');
assert.equal(new Set(files).size,62);
assert.equal(files[0],'001_initial_schema.sql');
assert.equal(files.at(-1),'20260925011000_r0_private_function_service_role_acl.sql');
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json')));
assert.equal(contract.contract_version,2);
assert.equal(contract.production_order.length,62);
assert.equal(contract.production_steps.length,33);
assert.equal(new Set(contract.production_order).size,62);
assert.deepEqual(new Set(contract.production_order),new Set(files));
const sql=readFileSync(resolve(here,'catalog.sql'),'utf8');
for(const required of ['table','column','constraint','index','function','view','trigger','policy','acl','type','sequence','extension']) assert.match(sql,new RegExp(`'${required}'`));
for(const required of ['reloptions','collation','ready','language','result','owned_by']) assert.match(sql,new RegExp(`'${required}'`));
assert.doesNotMatch(sql,/'(?:oid|relid|typid|owner_oid)'\s*,/i,'catalog must not label internal identifiers as emitted values');
console.log('expected-state deterministic fixture/static contract PASS');
