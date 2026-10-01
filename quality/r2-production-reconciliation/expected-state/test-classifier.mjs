#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const here=new URL('.',import.meta.url).pathname;
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json'),'utf8'));
const classifier=resolve(here,'classify-production-capture.mjs');
const captureBuilder=resolve(here,'build-read-only-production-capture.mjs');
const work=mkdtempSync(resolve(tmpdir(),'veltex-g3-classifier-'));
const history=['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
const digests=Object.fromEntries(['profiles_all','proposals_all','tracking_all','branding_all','subscriptions_all','usage_all','addon_catalog_all','proposal_addons_all','proposal_templates_all','tier_access_all','template_preferences_all'].map(k=>[k,'0'.repeat(64)]));
const capture=(atoms,dataInvariants=contract.recorded_baseline.data_invariants)=>({contract_version:2,captured_at:'2026-09-30T00:00:00Z',project_ref:'iwoaaljitifloolszxlu',environment:'production',read_only:true,migration_history:{count:29,versions:history},row_counts:{},orphan_counts:{},content_digests:digests,data_invariants:dataInvariants,catalog_atoms:atoms.map(a=>({kind:a.kind,identity:a.identity,value_sha256:a.value_sha256}))});
const run=(name,value,ok=true)=>{
  const input=resolve(work,`${name}.json`); const output=`/private/tmp/veltex-g3-${name}-classified.json`;
  writeFileSync(input,JSON.stringify(value));
  let passed=true; try{execFileSync(process.execPath,[classifier,input,output],{stdio:'pipe'});}catch{passed=false;}
  assert.equal(passed,ok,`${name} classification result`);
  return passed?JSON.parse(readFileSync(output,'utf8')):null;
};

const baselineResult=run('baseline',capture(contract.recorded_baseline.atoms));
assert.equal(baselineResult.steps['040'].state,'absent');

const prerequisiteResult=run('prereq',capture(contract.prerequisite_checkpoint.atoms,contract.prerequisite_checkpoint.data_invariants));
assert.equal(prerequisiteResult.steps['040'].state,'superseded-equivalent');
assert.deepEqual(prerequisiteResult.steps['040'].equivalence_proof,['20260908000000','20260924000000']);

const mixed=structuredClone(contract.prerequisite_checkpoint.atoms);
const r0Step=contract.production_steps.find(step=>step.file.startsWith('20260924000000_'));
const baselineByKey=new Map(contract.recorded_baseline.atoms.map(atom=>[`${atom.kind}:${atom.identity}`,atom]));
const mixedByKey=new Map(mixed.map(atom=>[`${atom.kind}:${atom.identity}`,atom]));
for(const evidence of r0Step.diff.evidence){
  const prior=baselineByKey.get(evidence.atom);
  if(prior)mixedByKey.set(evidence.atom,structuredClone(prior));else mixedByKey.delete(evidence.atom);
}
run('mixed-040-successors',capture([...mixedByKey.values()],contract.prerequisite_checkpoint.data_invariants),false);

const badData=structuredClone(contract.prerequisite_checkpoint.data_invariants); badData['20260925001000'].market_rows=51;
run('bad-data',capture(contract.prerequisite_checkpoint.atoms,badData),false);

const corrupt=structuredClone(contract.prerequisite_checkpoint.atoms);
corrupt.find(a=>a.kind==='column').value_sha256='f'.repeat(64);
run('partial',capture(corrupt,contract.prerequisite_checkpoint.data_invariants),false);

const r2Evidence=contract.production_steps.slice(23).flatMap(s=>s.diff.evidence).find(e=>e.after_sha256);
const stray=structuredClone(contract.recorded_baseline.atoms);
const [kind,...identityParts]=r2Evidence.atom.split(':');
const identity=identityParts.join(':');
const prior=stray.find(a=>a.kind===kind&&a.identity===identity);
if(prior) prior.value_sha256=r2Evidence.after_sha256;
else stray.push({kind,identity,value_sha256:r2Evidence.after_sha256,value:{}});
run('r2-stray',capture(stray),false);

const sqlPath='/private/tmp/veltex-g3-production-capture-test.sql';
execFileSync(process.execPath,[captureBuilder,sqlPath],{stdio:'pipe'});
const sql=readFileSync(sqlPath,'utf8');
assert.match(sql,/begin transaction read only;/i);
assert.match(sql,/^rollback;$/im);
assert.match(sql,/'project_ref','iwoaaljitifloolszxlu'/);
for(const forbidden of ['recipient_email','client_email','access_notes','tracking_id']) assert.doesNotMatch(sql,new RegExp(`['"]${forbidden}['"]`,'i'));
console.log('expected-state production classifier mutation tests PASS');
