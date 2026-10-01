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
const compatibilityVersion='20260925013000';
const compatibilityPolicyAtom='policy:billing_history.Admins can view all billing history';
const legacyCompatibilityPolicySha256='15e41a56dabd4538aaf0c6bf3426103bcd944f11e3fd94151fb29d5d8ada0394';
const compatibilityStep=r2Steps.find(step=>step.file.startsWith(`${compatibilityVersion}_`));
const compatibilityTransition=new Map(compatibilityStep.diff.evidence.map(evidence=>[evidence.atom,evidence]));
const compatibilityOrdinary=[...compatibilityTransition.keys()].filter(atom=>atom!==compatibilityPolicyAtom);
const compatibilityPartialExact=!capture.migration_history.versions.includes(compatibilityVersion)
  && compatibilityOrdinary.every(atom=>(current.get(atom)??null)===compatibilityTransition.get(atom).after_sha256)
  && (current.get(compatibilityPolicyAtom)??null)===legacyCompatibilityPolicySha256;
let r2AfterMatches=0;
for(const step of r2Steps) for(const e of step.diff.evidence) {
  const baselineValue=baselineExpected.get(e.atom)??null;
  // A value that already existed in the recorded production baseline is not
  // evidence that an R2 migration ran; several R2 steps intentionally restore
  // or retain an older definition after prerequisite migrations changed it.
  const reviewedCompatibilityEffect=step===compatibilityStep&&compatibilityPartialExact&&compatibilityOrdinary.includes(e.atom);
  if(!reviewedCompatibilityEffect&&e.after_sha256!==baselineValue && (current.get(e.atom)??null)===e.after_sha256) r2AfterMatches++;
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
const classificationCurrent=new Map(current);
const replayablePartialVersion='20260908000000';
const replayablePartialAtom='function:can_user_access_template(user_uuid uuid, template_uuid uuid)';
const replayableR0Version='20260924000000';
const conditionalAbsentR0Atom='function:start_user_trial(user_uuid uuid, plan_name text)';
const normalizePolicyVersion='20260924010500';
const normalizePolicyAtom='policy:profiles.Admins can view all profiles';
const selfViewPolicyAtom='policy:profiles.Users can view own profile';
const reviewedEquivalentPolicySha256='5b2a0fe6d19cd361821d758ae148d8bff9d49997019bbb2e0bf3a18eb673d5bc';
const legacyViewEquivalentVersion='20260924010000';
const legacyViewAtom = key => key==='view:enhanced_proposals'
  || key.startsWith('column:enhanced_proposals.')
  || key.startsWith('acl:view:enhanced_proposals:');
for(const step of prerequisiteSteps){
  const version=step.file.split('_',1)[0];
  const effectiveAtoms=step.prerequisite_effective_atoms??[];
  const atoms=version===replayableR0Version?step.diff.evidence.map(evidence=>evidence.atom):effectiveAtoms;
  if(!atoms.length){
    deferredSuperseded.push(step);
    continue;
  }
  const transition=new Map(step.diff.evidence.map(evidence=>[evidence.atom,evidence]));
  if(atoms.some(atom=>!transition.has(atom))) throw new Error(`missing transition evidence: ${step.file}`);
  const afterMatches=atoms.filter(atom=>(classificationCurrent.get(atom)??null)===(transition.get(atom).after_sha256??null)).length;
  const beforeMatches=atoms.filter(atom=>(classificationCurrent.get(atom)??null)===(classificationExpected.get(atom)??null)).length;
  let state;
  if(afterMatches===atoms.length&&beforeMatches!==atoms.length) state='complete';
  else if(beforeMatches===atoms.length&&afterMatches!==atoms.length) state='absent';
  else if(afterMatches===atoms.length&&beforeMatches===atoms.length) state='ambiguous';
  else state='partial';
  if(version===replayablePartialVersion) {
    const replayAtoms=step.diff.evidence.map(evidence=>evidence.atom);
    const predecessor=transition.get(replayablePartialAtom);
    const remaining=replayAtoms.filter(atom=>atom!==replayablePartialAtom);
    const r0Step=prerequisiteSteps.find(candidate=>candidate.file.startsWith('20260924000000_'));
    const r0AfterPresent=r0Step.diff.evidence.some(evidence=>evidence.after_sha256!==null&&(current.get(evidence.atom)??null)===evidence.after_sha256);
    const exactCanonicalPartial=predecessor
      && (current.get(replayablePartialAtom)??null)===predecessor.before_sha256
      && predecessor.before_sha256!==predecessor.after_sha256
      && remaining.every(atom=>(current.get(atom)??null)===(transition.get(atom).after_sha256??null))
      && !current.has('function:start_user_trial(user_uuid uuid, plan_name text)')
      && !r0AfterPresent
      && !capture.migration_history.versions.includes(version);
    if(exactCanonicalPartial) {
      const atomSet=replayAtoms.slice().sort();
      state='replayable-partial';
      classified[version]={history:false,state,expected_atom_count:replayAtoms.length,matched_atom_count:remaining.length,replay_proof:{kind:'canonical-080-function-predecessor',atom:replayablePartialAtom,before_sha256:predecessor.before_sha256,after_sha256:predecessor.after_sha256,atom_set_sha256:createHash('sha256').update(atomSet.join('\n')).digest('hex')}};
    }
  }
  if(version===replayableR0Version&&state==='partial') {
    const conditional=transition.get(conditionalAbsentR0Atom);
    const ordinary=atoms.filter(atom=>atom!==conditionalAbsentR0Atom);
    const ordinaryAfter=ordinary.filter(atom=>(classificationCurrent.get(atom)??null)===(transition.get(atom).after_sha256??null));
    const ordinaryBefore=ordinary.filter(atom=>(classificationCurrent.get(atom)??null)===(classificationExpected.get(atom)??null));
    const ordinaryExact=ordinary.every(atom=>ordinaryAfter.includes(atom)||ordinaryBefore.includes(atom));
    if(!capture.migration_history.versions.includes(version)&&conditional&&!classificationCurrent.has(conditionalAbsentR0Atom)&&ordinaryExact&&ordinaryAfter.length>0&&ordinaryBefore.length>0) {
      const atomSet=atoms.slice().sort();
      state='replayable-partial';
      classified[version]={history:false,state,expected_atom_count:atoms.length,matched_atom_count:ordinaryAfter.length,replay_proof:{kind:'canonical-r0-mixed-with-conditional-absence',conditional_absent_atom:conditionalAbsentR0Atom,before_count:ordinaryBefore.length,after_count:ordinaryAfter.length,atom_set_sha256:createHash('sha256').update(atomSet.join('\n')).digest('hex')}};
    }
  }
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
  if(version===normalizePolicyVersion&&state==='partial') {
    const policyTransition=transition.get(normalizePolicyAtom);
    const currentPolicy=current.get(normalizePolicyAtom)??null;
    const selfViewPolicy=current.get(selfViewPolicyAtom)??null;
    if(!capture.migration_history.versions.includes(version)&&currentPolicy===reviewedEquivalentPolicySha256&&selfViewPolicy===reviewedEquivalentPolicySha256&&currentPolicy!==policyTransition.after_sha256) {
      state='normalize-equivalent-drift';
      classified[version]={history:false,state,expected_atom_count:1,matched_atom_count:0,normalization_proof:{kind:'redundant-self-view-admin-policy',atom:normalizePolicyAtom,current_sha256:currentPolicy,after_sha256:policyTransition.after_sha256,supporting_atom:selfViewPolicyAtom,supporting_sha256:selfViewPolicy}};
    }
  }
  classified[version]??={history:capture.migration_history.versions.includes(version),state,expected_atom_count:atoms.length,matched_atom_count:afterMatches};
  if(state==='partial'||state==='ambiguous') throw new Error(`${state} prerequisite state: ${step.file}`);
  if(state==='complete'||state==='replayable-partial'||state==='normalize-equivalent-drift') for(const evidence of step.diff.evidence) {
    const conditionalAbsent=version===replayableR0Version&&state==='replayable-partial'&&evidence.atom===conditionalAbsentR0Atom;
    if(evidence.after_sha256===null||conditionalAbsent) classificationExpected.delete(evidence.atom);
    else classificationExpected.set(evidence.atom,evidence.after_sha256);
    if(state==='replayable-partial'||state==='normalize-equivalent-drift') {
      if(evidence.after_sha256===null||conditionalAbsent) classificationCurrent.delete(evidence.atom);
      else classificationCurrent.set(evidence.atom,evidence.after_sha256);
    }
  }
  if(state==='absent-equivalent') for(const atom of [...classificationExpected.keys()].filter(legacyViewAtom)) classificationExpected.delete(atom);
}
for(const step of deferredSuperseded){
  const version=step.file.split('_',1)[0];
  if(version!=='040') throw new Error(`ambiguous fully-superseded prerequisite requires recorded history: ${step.file}`);
  const exactResidue=step.diff.evidence.every(evidence=>(current.get(evidence.atom)??null)===(evidence.after_sha256??null));
  if(exactResidue) {
    classified[version]={history:capture.migration_history.versions.includes(version),state:'complete',expected_atom_count:step.diff.evidence.length,matched_atom_count:step.diff.evidence.length,residue_proof:{kind:'exact-unsuperseded-040-transition'}};
    continue;
  }
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
  if(state==='replayable-partial') {
    for(const evidence of step.diff.evidence) {
      const value=current.get(evidence.atom)??null;
      if(value===null) reconstructed.delete(evidence.atom); else reconstructed.set(evidence.atom,value);
    }
    continue;
  }
  if(state==='normalize-equivalent-drift') {
    for(const evidence of step.diff.evidence) {
      const value=current.get(evidence.atom)??null;
      if(value===null) reconstructed.delete(evidence.atom); else reconstructed.set(evidence.atom,value);
    }
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
if(compatibilityPartialExact) for(const evidence of compatibilityStep.diff.evidence) {
  const value=current.get(evidence.atom)??null;
  if(value===null) reconstructed.delete(evidence.atom); else reconstructed.set(evidence.atom,value);
}
const postCompatibilityMismatch=[...current].filter(([k,v])=>reconstructed.get(k)!==v);
const postCompatibilityMissing=[...reconstructed].filter(([k])=>!current.has(k));
const platformMismatch=postCompatibilityMismatch.filter(([key])=>key==='acl:schema:public:postgres:USAGE'
  || key.startsWith('extension:')
  || /^acl:(?:table|view):[^:]+:(?:anon|authenticated|OBJECT_OWNER|service_role):MAINTAIN$/.test(key));
const platformKeys=new Set(platformMismatch.map(([key])=>key));
const unexpectedMismatch=postCompatibilityMismatch.filter(([key])=>!platformKeys.has(key));
const hostedPlatformShape=platformMismatch.length===137&&platformMismatch.filter(([key])=>key.endsWith(':MAINTAIN')).length===132
  &&platformMismatch.filter(([key])=>key.startsWith('extension:')).length===4&&platformKeys.has('acl:schema:public:postgres:USAGE');
if(!capture.postgres_version.startsWith('17.')||(!hostedPlatformShape&&platformMismatch.length!==0)) throw new Error('hosted PG17 platform variance shape mismatch');
if(capture.platform_capabilities?.pgcrypto?.installed!==true||capture.platform_capabilities.pgcrypto.version!=='1.3'
  ||capture.platform_capabilities.pgcrypto.digest_extension_owned!==true||capture.platform_capabilities.pgcrypto.digest_callable!==true) throw new Error('required pgcrypto capability is unavailable');
if(unexpectedMismatch.length||postCompatibilityMissing.length) throw new Error(`catalog is not an exact baseline-plus-classified-steps state: mismatched=${unexpectedMismatch.length} missing=${postCompatibilityMissing.length} sample=${JSON.stringify({mismatch:unexpectedMismatch.slice(0,3).map(([key])=>key),missing:postCompatibilityMissing.slice(0,3).map(([key])=>key)})}`);
const platformEvidenceSha256=createHash('sha256').update(platformMismatch.slice().sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('\n')).digest('hex');
const reviewedHostedPlatformEvidenceSha256='6b7d138e76e5b72581af54653a717ba59ad9215c60efe62ebd1128ab126706f9';
if(hostedPlatformShape&&platformEvidenceSha256!==reviewedHostedPlatformEvidenceSha256) throw new Error('hosted PG17 platform variance evidence mismatch');
for(const step of r2Steps) {
  const version=step.file.split('_',1)[0];
  if(version===compatibilityVersion&&compatibilityPartialExact) {
    const atomSet=step.diff.evidence.map(evidence=>evidence.atom).sort();
    classified[version]={history:false,state:'replayable-partial',expected_atom_count:atomSet.length,matched_atom_count:compatibilityOrdinary.length,replay_proof:{kind:'production-schema-compatibility-with-policy-normalization',policy_atom:compatibilityPolicyAtom,current_policy_sha256:legacyCompatibilityPolicySha256,after_policy_sha256:compatibilityTransition.get(compatibilityPolicyAtom).after_sha256,atom_set_sha256:createHash('sha256').update(atomSet.join('\n')).digest('hex')}};
  } else classified[version]={history:false,state:'absent',expected_atom_count:step.diff.evidence.length,matched_atom_count:0};
  if(version==='20260925012000') {
    if(!capture.postgres_version.startsWith('17.')) throw new Error('PG17 MAINTAIN repair proof requires PostgreSQL 17 production');
    classified[version].platform_proof={kind:'pg17-maintain-hardening',postgres_major:17};
  }
}
const output={...capture,classified_contract_version:1,baseline:{state:'complete',atom_digest:contract.recorded_baseline.atoms_sha256,expected_atom_count:baselineExpected.size,matched_atom_count:baselineExpected.size},platform_variance:{kind:'hosted-pg17-catalog-envelope-v1',count:platformMismatch.length,evidence_sha256:platformEvidenceSha256},steps:classified,r2_absent:true,classification:{expected_state_sha256:createHash('sha256').update(contractBytes).digest('hex'),classified_at:new Date().toISOString()}};
writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n',{mode:0o600});
console.log(outputPath);
