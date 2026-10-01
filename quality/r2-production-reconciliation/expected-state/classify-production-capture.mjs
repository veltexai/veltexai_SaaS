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
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json'),'utf8'));
const expectedHistory=['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
if(capture.project_ref!=='iwoaaljitifloolszxlu'||capture.environment!=='production'||capture.read_only!==true) throw new Error('wrong capture identity');
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
const classified={};
for(const step of prerequisiteSteps){
  const atoms=step.prerequisite_effective_atoms??[];
  if(!atoms.length) throw new Error(`ambiguous fully-superseded prerequisite requires recorded history: ${step.file}`);
  const afterMatches=atoms.filter(atom=>(current.get(atom)??null)===(prerequisiteExpected.get(atom)??null)).length;
  const beforeMatches=atoms.filter(atom=>(current.get(atom)??null)===(baselineExpected.get(atom)??null)).length;
  let state;
  if(afterMatches===atoms.length&&beforeMatches!==atoms.length) state='complete';
  else if(beforeMatches===atoms.length&&afterMatches!==atoms.length) state='absent';
  else if(afterMatches===atoms.length&&beforeMatches===atoms.length) state='ambiguous';
  else state='partial';
  classified[step.file.split('_',1)[0]]={history:capture.migration_history.versions.includes(step.file.split('_',1)[0]),state,expected_atom_count:atoms.length,matched_atom_count:afterMatches};
  if(state==='partial'||state==='ambiguous') throw new Error(`${state} prerequisite state: ${step.file}`);
}
const reconstructed=new Map(baselineExpected);
for(const step of prerequisiteSteps){
  const state=classified[step.file.split('_',1)[0]].state;
  if(state!=='complete') continue;
  for(const e of step.diff.evidence){if(e.after_sha256===null)reconstructed.delete(e.atom);else reconstructed.set(e.atom,e.after_sha256);}
}
const mismatch=[...current].filter(([k,v])=>reconstructed.get(k)!==v);
const missing=[...reconstructed].filter(([k])=>!current.has(k));
if(mismatch.length||missing.length) throw new Error(`catalog is not an exact baseline-plus-classified-steps state: mismatched=${mismatch.length} missing=${missing.length}`);
for(const step of r2Steps) classified[step.file.split('_',1)[0]]={history:false,state:'absent',expected_atom_count:step.diff.evidence.length,matched_atom_count:0};
const output={...capture,contract_version:2,baseline:{state:'complete',atom_digest:contract.recorded_baseline.atoms_sha256,expected_atom_count:baselineExpected.size,matched_atom_count:baselineExpected.size},steps:classified,r2_absent:true,classification:{expected_state_sha256:createHash('sha256').update(readFileSync(resolve(here,'expected-state.v1.json'))).digest('hex'),classified_at:new Date().toISOString()}};
writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n',{mode:0o600});
console.log(outputPath);
