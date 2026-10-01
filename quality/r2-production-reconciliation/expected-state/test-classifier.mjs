#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const here=new URL('.',import.meta.url).pathname;
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json'),'utf8'));
const classifier=resolve(here,'classify-production-capture.mjs');
const captureBuilder=resolve(here,'build-read-only-production-capture.mjs');
const work=mkdtempSync(resolve(tmpdir(),'veltex-g3-classifier-'));
const history=['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
const digests=Object.fromEntries(['profiles_all','proposals_all','tracking_all','branding_all','subscriptions_all','usage_all','addon_catalog_all','proposal_addons_all','proposal_templates_all','tier_access_all','template_preferences_all'].map(k=>[k,'0'.repeat(64)]));
const sha=path=>createHash('sha256').update(readFileSync(resolve(here,path))).digest('hex');
const binding={catalog_sha256:contract.catalog_sha256,data_invariants_sha256:contract.data_invariants_sha256,migrations_sha256:contract.migrations_sha256,capture_generator_sha256:sha('build-read-only-production-capture.mjs'),effective_privileges_expression_sha256:sha('effective-privileges-expression.sql'),expected_effective_privileges_sha256:sha('expected-effective-privileges.v1.json')};
const capture=(atoms,dataInvariants=contract.recorded_baseline.data_invariants)=>({contract_version:3,canonicalization_version:2,postgres_version:'17.6',contract_binding:{...binding},captured_at:'2026-09-30T00:00:00Z',project_ref:'iwoaaljitifloolszxlu',environment:'production',read_only:true,migration_history:{count:29,versions:history},row_counts:{},orphan_counts:{},content_digests:digests,data_invariants:dataInvariants,platform_capabilities:{pgcrypto:{installed:true,schema:'public',version:'1.3',digest_extension_owned:true,digest_callable:true}},catalog_atoms:atoms.map(a=>({kind:a.kind,identity:a.identity,value_sha256:a.value_sha256}))});
const run=(name,value,ok=true)=>{
  const input=resolve(work,`${name}.json`); const output=`/private/tmp/veltex-g3-${name}-classified.json`;
  writeFileSync(input,JSON.stringify(value));
  let passed=true; try{execFileSync(process.execPath,[classifier,input,output],{stdio:'pipe'});}catch{passed=false;}
  assert.equal(passed,ok,`${name} classification result`);
  return passed?JSON.parse(readFileSync(output,'utf8')):null;
};

const baselineResult=run('baseline',capture(contract.recorded_baseline.atoms));
assert.equal(baselineResult.contract_version,3);
assert.equal(baselineResult.classified_contract_version,1);
assert.equal(baselineResult.steps['040'].state,'absent');
const wrongVersion=capture(contract.recorded_baseline.atoms); wrongVersion.contract_version=999; run('wrong-contract-version',wrongVersion,false);
const wrongCanonicalization=capture(contract.recorded_baseline.atoms); wrongCanonicalization.canonicalization_version=999; run('wrong-canonicalization',wrongCanonicalization,false);
const forgedBinding=capture(contract.recorded_baseline.atoms); forgedBinding.contract_binding={...binding,catalog_sha256:'f'.repeat(64)}; run('forged-binding',forgedBinding,false);
const missingBinding=capture(contract.recorded_baseline.atoms); delete missingBinding.contract_binding.expected_effective_privileges_sha256; run('missing-binding',missingBinding,false);

const prerequisiteResult=run('prereq',capture(contract.prerequisite_checkpoint.atoms,contract.prerequisite_checkpoint.data_invariants));
assert.equal(prerequisiteResult.steps['040'].state,'superseded-equivalent');
assert.deepEqual(prerequisiteResult.steps['040'].equivalence_proof,['20260908000000','20260924000000']);

const predecessorState=structuredClone(contract.prerequisite_checkpoint.atoms);
const predecessorByKey=new Map(predecessorState.map(atom=>[`${atom.kind}:${atom.identity}`,atom]));
const catalogRemediation=contract.production_steps.find(step=>step.file.startsWith('20260922010000_'));
const catalogIndex=contract.production_steps.indexOf(catalogRemediation);
const laterTouched=new Set(contract.production_steps.slice(catalogIndex+1,23).flatMap(step=>step.diff.evidence.map(evidence=>evidence.atom)));
for(const evidence of catalogRemediation.diff.evidence.filter(candidate=>!laterTouched.has(candidate.atom))){
  const [kind,...identityParts]=evidence.atom.split(':'); const identity=identityParts.join(':');
  if(evidence.before_sha256===null) predecessorByKey.delete(evidence.atom);
  else predecessorByKey.set(evidence.atom,{kind,identity,value_sha256:evidence.before_sha256,value:{}});
}
const predecessorResult=run('cumulative-predecessor',capture([...predecessorByKey.values()],{
  ...contract.prerequisite_checkpoint.data_invariants,
  '20260922010000':{applicable:false},
}));
assert.equal(predecessorResult.steps['20260922010000'].state,'absent');

const legacyViewAtom=atom=>atom.identity==='enhanced_proposals'||atom.identity.startsWith('enhanced_proposals.')||(atom.kind==='acl'&&atom.identity.startsWith('view:enhanced_proposals:'));
const viewAbsent=contract.prerequisite_checkpoint.atoms.filter(atom=>!legacyViewAtom(atom));
const viewAbsentResult=run('legacy-view-absent',capture(viewAbsent,contract.prerequisite_checkpoint.data_invariants));
assert.equal(viewAbsentResult.steps['20260924010000'].state,'absent-equivalent');
assert.equal(viewAbsentResult.steps['20260924010000'].equivalence_proof.kind,'legacy-view-absent');
const viewOnlyMissing=contract.prerequisite_checkpoint.atoms.filter(atom=>!(atom.kind==='view'&&atom.identity==='enhanced_proposals'));
run('legacy-view-partial-removal',capture(viewOnlyMissing,contract.prerequisite_checkpoint.data_invariants),false);

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
const previewSqlPath='/private/tmp/veltex-r2-isolated-preview-catalog-capture-test.sql';
execFileSync(process.execPath,[captureBuilder,previewSqlPath,'--project-ref','ynzkwctwlssjcsjmahey','--environment','isolated-preview'],{stdio:'pipe'});
const previewSql=readFileSync(previewSqlPath,'utf8');
assert.match(previewSql,/'project_ref','ynzkwctwlssjcsjmahey'/);
assert.match(previewSql,/'environment','isolated-preview'/);
assert.match(previewSql,/begin transaction read only;/i);
assert.match(previewSql,/rollback;/i);
assert.throws(()=>execFileSync(process.execPath,[captureBuilder,'--project-ref','iwoaaljitifloolszxlu','--environment','isolated-preview'],{stdio:'pipe'}));
for(const forbidden of ['recipient_email','client_email','access_notes','tracking_id']) assert.doesNotMatch(sql,new RegExp(`['"]${forbidden}['"]`,'i'));
console.log('expected-state production classifier mutation tests PASS');
