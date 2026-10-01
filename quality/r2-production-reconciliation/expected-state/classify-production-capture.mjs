#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

const here=dirname(new URL(import.meta.url).pathname);
const capturePath=resolve(process.argv[2]??'');
const outputPath=resolve(process.argv[3]??'/private/tmp/veltex-r2-production-classified.json');
if(!capturePath) throw new Error('production capture path required');
if(!outputPath.startsWith('/private/tmp/')) throw new Error('classified output must remain below /private/tmp');
const capture=JSON.parse(readFileSync(capturePath,'utf8'));
const contractPath=resolve(here,'expected-state.v1.json');
const contractBytes=readFileSync(contractPath);
const contract=JSON.parse(contractBytes);
const expectedHistory=['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
if(capture.project_ref!=='iwoaaljitifloolszxlu'||capture.environment!=='production'||capture.read_only!==true) throw new Error('wrong capture identity');
if(capture.contract_version!==3||capture.canonicalization_version!==2) throw new Error('unsupported capture contract/canonicalization version');
if(!/^(16|17)\./.test(capture.postgres_version??'')) throw new Error('unsupported PostgreSQL major');
const expectedBinding={
  catalog_sha256:contract.catalog_sha256,
  data_invariants_sha256:contract.data_invariants_sha256,
  migrations_sha256:contract.migrations_sha256,
  capture_generator_sha256:createHash('sha256').update(readFileSync(resolve(here,'build-read-only-production-capture.mjs'))).digest('hex'),
  effective_privileges_expression_sha256:createHash('sha256').update(readFileSync(resolve(here,'effective-privileges-expression.sql'))).digest('hex'),
  expected_effective_privileges_sha256:createHash('sha256').update(readFileSync(resolve(here,'expected-effective-privileges.v1.json'))).digest('hex'),
};
const bindingKeys=Object.keys(expectedBinding).sort();
const binding=capture.contract_binding;
if(!binding||typeof binding!=='object'||Array.isArray(binding)||JSON.stringify(Object.keys(binding).sort())!==JSON.stringify(bindingKeys)||bindingKeys.some(key=>!/^[0-9a-f]{64}$/.test(binding[key]??'')||binding[key]!==expectedBinding[key])) throw new Error('capture source/contract binding mismatch');
if(capture.migration_history?.count!==29||JSON.stringify(capture.migration_history.versions)!==JSON.stringify(expectedHistory)) throw new Error('production history drift');
if(!Array.isArray(capture.catalog_atoms)||capture.catalog_atoms.some(a=>!a.kind||!a.identity||!/^[0-9a-f]{64}$/.test(a.value_sha256??''))) throw new Error('invalid redacted catalog atoms');
const current=new Map(capture.catalog_atoms.map(a=>[`${a.kind}:${a.identity}`,a.value_sha256]));
if(current.size!==capture.catalog_atoms.length) throw new Error('duplicate catalog atom identity');
const baselineExpected=new Map(contract.recorded_baseline.atoms.map(a=>[`${a.kind}:${a.identity}`,a.value_sha256]));
const prerequisiteSteps=contract.production_steps.slice(0,23);
const r2Steps=contract.production_steps.slice(23);
let r2AfterMatches=0;
for(const step of r2Steps) for(const e of step.diff.evidence) {
  const baselineValue=baselineExpected.get(e.atom)??null;
  // A value that already existed in the recorded production baseline is not
  // evidence that an R2 migration ran; several R2 steps intentionally restore
  // or retain an older definition after prerequisite migrations changed it.
  if(e.after_sha256!==baselineValue && (current.get(e.atom)??null)===e.after_sha256) r2AfterMatches++;
}
const r2History=capture.migration_history.versions.some(v=>v>='20260925002000');
if(r2History||r2AfterMatches) throw new Error(`R2/forward state is not absent: history=${r2History} after_matches=${r2AfterMatches}`);
const prerequisiteExpected=new Map(contract.prerequisite_checkpoint.atoms.map(a=>[`${a.kind}:${a.identity}`,a.value_sha256]));
if(!capture.data_invariants||typeof capture.data_invariants!=='object') throw new Error('missing hashes-only data invariants');
for(const version of ['031','034','041','20260922000000','20260922010000','20260925001000']){
  const step=prerequisiteSteps.find(candidate=>candidate.file.startsWith(`${version}_`));
  const atoms=step?.prerequisite_effective_atoms??[];
  const structurallyComplete=atoms.length>0&&atoms.every(atom=>(current.get(atom)??null)===(prerequisiteExpected.get(atom)??null));
  if(structurallyComplete&&JSON.stringify(capture.data_invariants[version])!==JSON.stringify(contract.prerequisite_checkpoint.data_invariants[version])) throw new Error(`data invariant mismatch for ${version}`);
}
const classified={};
const deferredSuperseded=[];
const classificationExpected=new Map(baselineExpected);
const legacyViewEquivalentVersion='20260924010000';
const legacyViewAtom = key => key==='view:enhanced_proposals'
  || key.startsWith('column:enhanced_proposals.')
  || key.startsWith('acl:view:enhanced_proposals:');
for(const step of prerequisiteSteps){
  const atoms=step.prerequisite_effective_atoms??[];
  if(!atoms.length){
    deferredSuperseded.push(step);
    continue;
  }
  const transition=new Map(step.diff.evidence.map(evidence=>[evidence.atom,evidence]));
  if(atoms.some(atom=>!transition.has(atom))) throw new Error(`missing transition evidence: ${step.file}`);
  const afterMatches=atoms.filter(atom=>(current.get(atom)??null)===(transition.get(atom).after_sha256??null)).length;
  const beforeMatches=atoms.filter(atom=>(current.get(atom)??null)===(classificationExpected.get(atom)??null)).length;
  let state;
  if(afterMatches===atoms.length&&beforeMatches!==atoms.length) state='complete';
  else if(beforeMatches===atoms.length&&afterMatches!==atoms.length) state='absent';
  else if(afterMatches===atoms.length&&beforeMatches===atoms.length) state='ambiguous';
  else state='partial';
  const version=step.file.split('_',1)[0];
  if(version===legacyViewEquivalentVersion && state==='partial') {
    const absenceAtoms=[...baselineExpected.keys()].filter(legacyViewAtom).sort();
    if(absenceAtoms.length>0 && absenceAtoms.every(atom=>!current.has(atom))) {
      state='absent-equivalent';
      classified[version]={
        history:capture.migration_history.versions.includes(version),
        state,
        expected_atom_count:absenceAtoms.length,
        matched_atom_count:absenceAtoms.length,
        equivalence_proof:{kind:'legacy-view-absent',atom_set_sha256:createHash('sha256').update(absenceAtoms.join('\n')).digest('hex')},
      };
    }
  }
  classified[version]??={history:capture.migration_history.versions.includes(version),state,expected_atom_count:atoms.length,matched_atom_count:afterMatches};
  if(state==='partial'||state==='ambiguous') throw new Error(`${state} prerequisite state: ${step.file}`);
  if(state==='complete') for(const evidence of step.diff.evidence) {
    if(evidence.after_sha256===null) classificationExpected.delete(evidence.atom);
    else classificationExpected.set(evidence.atom,evidence.after_sha256);
  }
  if(state==='absent-equivalent') for(const atom of [...classificationExpected.keys()].filter(legacyViewAtom)) classificationExpected.delete(atom);
}
for(const step of deferredSuperseded){
  const version=step.file.split('_',1)[0];
  if(version!=='040') throw new Error(`ambiguous fully-superseded prerequisite requires recorded history: ${step.file}`);
  const successors=['20260908000000','20260924000000'];
  const successorStates=successors.map(successor=>classified[successor]?.state);
  let state;
  if(successorStates.every(candidate=>candidate==='complete')) state='superseded-equivalent';
  else if(successorStates.every(candidate=>candidate==='absent')) state='absent';
  else throw new Error(`migration 040 successor state is mixed or unproven: ${successorStates.join(',')}`);
  classified[version]={
    history:capture.migration_history.versions.includes(version),
    state,
    expected_atom_count:0,
    matched_atom_count:0,
    ...(state==='superseded-equivalent'?{equivalence_proof:successors}:{}),
  };
  if(classified[version].history&&state==='absent') throw new Error('migration 040 history exists but both successors are absent');
}
const reconstructed=new Map(baselineExpected);
for(const step of prerequisiteSteps){
  const state=classified[step.file.split('_',1)[0]].state;
  if(state==='absent-equivalent') {
    for(const atom of [...reconstructed.keys()].filter(legacyViewAtom)) reconstructed.delete(atom);
    continue;
  }
  if(state!=='complete'&&state!=='superseded-equivalent') continue;
  for(const evidence of step.diff.evidence){
    if(evidence.after_sha256===null) reconstructed.delete(evidence.atom);
    else reconstructed.set(evidence.atom,evidence.after_sha256);
  }
}
const mismatch=[...current].filter(([k,v])=>reconstructed.get(k)!==v);
const missing=[...reconstructed].filter(([k])=>!current.has(k));
if(mismatch.length||missing.length) throw new Error(`catalog is not an exact baseline-plus-classified-steps state: mismatched=${mismatch.length} missing=${missing.length} sample=${JSON.stringify({mismatch:mismatch.slice(0,3).map(([key])=>key),missing:missing.slice(0,3).map(([key])=>key)})}`);
for(const step of r2Steps) {
  const version=step.file.split('_',1)[0];
  classified[version]={history:false,state:'absent',expected_atom_count:step.diff.evidence.length,matched_atom_count:0};
  if(version==='20260925012000') {
    if(!capture.postgres_version.startsWith('17.')) throw new Error('PG17 MAINTAIN repair proof requires PostgreSQL 17 production');
    classified[version].platform_proof={kind:'pg17-maintain-hardening',postgres_major:17};
  }
}
const output={...capture,classified_contract_version:1,baseline:{state:'complete',atom_digest:contract.recorded_baseline.atoms_sha256,expected_atom_count:baselineExpected.size,matched_atom_count:baselineExpected.size},steps:classified,r2_absent:true,classification:{expected_state_sha256:createHash('sha256').update(contractBytes).digest('hex'),classified_at:new Date().toISOString()}};
writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n',{mode:0o600});
console.log(outputPath);
