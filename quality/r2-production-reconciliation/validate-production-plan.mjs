#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const root=resolve(dirname(new URL(import.meta.url).pathname),'../..');
const dir=resolve(process.argv[2]??'/private/tmp/veltex-r2-production-plan');
const fingerprintPath=resolve(process.argv[3]??'');
const reviewPath=resolve(process.argv[4]??'');
if(!fingerprintPath||!reviewPath) throw new Error('exact fingerprint and independent review paths are required');
const fingerprintBytes=readFileSync(fingerprintPath);
const fingerprint=JSON.parse(fingerprintBytes.toString('utf8'));
const reviewBytes=readFileSync(reviewPath);
const review=JSON.parse(reviewBytes.toString('utf8'));
const manifest=JSON.parse(readFileSync(resolve(dir,'manifest.json'),'utf8'));
const manifestText=readFileSync(resolve(dir,'manifest.json'),'utf8');
const sql=readFileSync(resolve(dir,'UNARMED-production-plan.sql'),'utf8');
const reviewedSourceHashes=JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/reviewed-source-sha256.json'),'utf8'));
const expectedStateContract=JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/expected-state.v1.json'),'utf8'));
const expectedStateBytes=readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/expected-state.v1.json'));
const exactFiles=Object.keys(reviewedSourceHashes);
const sha=value=>createHash('sha256').update(value).digest('hex');
const expectedBinding={catalog_sha256:expectedStateContract.catalog_sha256,data_invariants_sha256:expectedStateContract.data_invariants_sha256,migrations_sha256:expectedStateContract.migrations_sha256,capture_generator_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/build-read-only-production-capture.mjs'))),effective_privileges_expression_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/effective-privileges-expression.sql'))),expected_effective_privileges_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/expected-effective-privileges.v1.json')))};
const bindingKeys=Object.keys(expectedBinding).sort();
const binding=fingerprint.contract_binding;
const bindingExact=binding&&typeof binding==='object'&&!Array.isArray(binding)&&JSON.stringify(Object.keys(binding).sort())===JSON.stringify(bindingKeys)&&bindingKeys.every(key=>binding[key]===expectedBinding[key]);
if(fingerprint.contract_version!==3||fingerprint.canonicalization_version!==2||fingerprint.classified_contract_version!==1||fingerprint.classification?.expected_state_sha256!==sha(expectedStateBytes)||!bindingExact) throw new Error('fingerprint classifier/contract binding failed');
if(fingerprint.baseline?.state!=='complete'||fingerprint.baseline.atom_digest!==expectedStateContract.recorded_baseline.atoms_sha256||fingerprint.baseline.expected_atom_count!==expectedStateContract.recorded_baseline.atoms.length||fingerprint.baseline.matched_atom_count!==expectedStateContract.recorded_baseline.atoms.length) throw new Error('baseline proof mismatch');
const compatibilityVersion='20260925013000'; const compatibilityPolicyAtom='policy:billing_history.Admins can view all billing history'; const legacyCompatibilityPolicySha256='15e41a56dabd4538aaf0c6bf3426103bcd944f11e3fd94151fb29d5d8ada0394';
const finalExpectedAtoms=new Map(expectedStateContract.atoms.map(atom=>[`${atom.kind}:${atom.identity}`,atom.value_sha256]));
const platformAtoms=(fingerprint.catalog_atoms??[]).map(atom=>[`${atom.kind}:${atom.identity}`,atom.value_sha256]).filter(([key,value])=>(key==='acl:schema:public:postgres:USAGE'||key.startsWith('extension:')||/^acl:(?:table|view):[^:]+:(?:anon|authenticated|OBJECT_OWNER|service_role):MAINTAIN$/.test(key))&&(finalExpectedAtoms.get(key)??null)!==value);
const platformEvidenceSha256=sha(platformAtoms.slice().sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('\n'));
const acceptedPlatformEvidence=new Map([[0,sha('')],[137,'6b7d138e76e5b72581af54653a717ba59ad9215c60efe62ebd1128ab126706f9']]);
if(fingerprint.platform_variance?.kind!=='hosted-pg17-catalog-envelope-v1'||!acceptedPlatformEvidence.has(fingerprint.platform_variance.count)||platformAtoms.length!==fingerprint.platform_variance.count||fingerprint.platform_variance.evidence_sha256!==platformEvidenceSha256||fingerprint.platform_variance.evidence_sha256!==acceptedPlatformEvidence.get(fingerprint.platform_variance.count)) throw new Error('hosted PG17 platform variance proof mismatch');
const legacyViewAtom=key=>key==='view:enhanced_proposals'||key.startsWith('column:enhanced_proposals.')||key.startsWith('acl:view:enhanced_proposals:');
const absentEquivalentAtoms=expectedStateContract.recorded_baseline.atoms.map(atom=>`${atom.kind}:${atom.identity}`).filter(legacyViewAtom).sort();
const absentEquivalentProofSha256=sha(absentEquivalentAtoms.join('\n'));
if(manifest.contract_version!==2||manifest.target!=='production iwoaaljitifloolszxlu'||manifest.productionAuthorized!==false||manifest.armed!==false) throw new Error('manifest safety contract failed');
for(const [name,value] of [['fingerprint_sha256',manifest.fingerprint_sha256],['review_sha256',manifest.review_sha256]]) if(!/^[0-9a-f]{64}$/.test(value??'')) throw new Error(`invalid ${name}`);
const fingerprintSha256=sha(fingerprintBytes);
if(review.status!=='PASS'||review.fingerprint_sha256!==fingerprintSha256||!review.reviewer||!review.reviewed_at) throw new Error('independent review does not bind the exact fingerprint');
if(JSON.stringify(manifest.steps.map(step=>step.file))!==JSON.stringify(exactFiles)) throw new Error('manifest migration order/set mismatch');
if(!sql.includes("raise exception 'UNARMED G3 ARTIFACT")) throw new Error('unarmed refusal missing');
const encoded=sql.match(/^-- MANIFEST_BASE64:([A-Za-z0-9+/=]+)$/m)?.[1];
if(!encoded||Buffer.from(encoded,'base64').toString('utf8')!==manifestText) throw new Error('SQL/manifest binding failed');
const expectedSql=`-- GENERATED G3 REVIEW ARTIFACT. UNARMED AND NON-EXECUTABLE.\n-- Target label: iwoaaljitifloolszxlu; identity still requires exact database fingerprint.\n-- Fingerprint SHA-256: ${manifest.fingerprint_sha256}\n-- Manifest Base64 SHA-256: ${createHash('sha256').update(encoded).digest('hex')}\n-- No production authorization is encoded in this file.\n\ndo $$ begin raise exception 'UNARMED G3 ARTIFACT: G2, exact-artifact review, G4 and action-specific production authorization are required'; end $$;\n\n-- MANIFEST_BASE64:${encoded}\n`;
if(sql!==expectedSql) throw new Error('unarmed SQL contains unexpected bytes');
for(const step of manifest.steps){
  const source=readFileSync(resolve(root,'supabase/migrations',step.file),'utf8');
  const digest=createHash('sha256').update(source).digest('hex');
  if(digest!==step.source_sha256||digest!==reviewedSourceHashes[step.file]) throw new Error(`source drift: ${step.file}`);
  if(!['verify-recorded','reconcile-history','reconcile-superseded-equivalent','reconcile-absent-equivalent','apply-replayable-partial','apply-normalize-equivalent-drift','apply'].includes(step.mode)) throw new Error(`invalid mode: ${step.file}`);
}
const supersededEquivalentProof=['20260908000000','20260924000000'];
const expectedSteps=exactFiles.map(file=>{
  const version=file.split('_',1)[0];
  const observed=fingerprint.steps?.[version];
  if(!observed||!['absent','complete','superseded-equivalent','absent-equivalent','replayable-partial','normalize-equivalent-drift'].includes(observed.state)) throw new Error(`fingerprint state is not buildable: ${version}`);
  let mode;
  if(version===compatibilityVersion&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file); const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort(); const proof=observed.replay_proof;
    const afterPolicy=contractStep.diff.evidence.find(evidence=>evidence.atom===compatibilityPolicyAtom)?.after_sha256;
    if(observed.expected_atom_count!==atomSet.length||observed.matched_atom_count!==atomSet.length-1||proof?.kind!=='production-schema-compatibility-with-policy-normalization'||proof?.policy_atom!==compatibilityPolicyAtom||proof?.current_policy_sha256!==legacyCompatibilityPolicySha256||proof?.after_policy_sha256!==afterPolicy||proof?.atom_set_sha256!==sha(atomSet.join('\n'))) throw new Error('migration 130 compatibility replay proof mismatch');
    mode='apply-replayable-partial';
  } else if(file>='20260925002000_') {
    if(observed.history||observed.state!=='absent'||observed.matched_atom_count!==0) throw new Error(`R2/forward state is not absent: ${version}`);
    if(version==='20260925012000'&&(observed.expected_atom_count!==0||observed.platform_proof?.kind!=='pg17-maintain-hardening'||observed.platform_proof?.postgres_major!==17||!fingerprint.postgres_version.startsWith('17.'))) throw new Error('PG17 MAINTAIN repair platform proof mismatch');
    mode='apply';
  } else if(version==='040'&&!observed.history&&observed.state==='superseded-equivalent') {
    if(observed.expected_atom_count!==0||observed.matched_atom_count!==0||JSON.stringify(observed.equivalence_proof)!==JSON.stringify(supersededEquivalentProof)) throw new Error('migration 040 equivalence evidence mismatch');
    for(const successor of supersededEquivalentProof){const evidence=fingerprint.steps?.[successor];if(!evidence||evidence.state!=='complete'||evidence.matched_atom_count!==evidence.expected_atom_count) throw new Error(`migration 040 successor is not exactly complete: ${successor}`);}
    mode='reconcile-superseded-equivalent';
  } else if(version==='20260924010000'&&!observed.history&&observed.state==='absent-equivalent') {
    if(observed.expected_atom_count!==absentEquivalentAtoms.length||observed.matched_atom_count!==absentEquivalentAtoms.length
      ||observed.equivalence_proof?.kind!=='legacy-view-absent'
      ||observed.equivalence_proof?.atom_set_sha256!==absentEquivalentProofSha256) throw new Error('legacy-view absence equivalence evidence mismatch');
    mode='reconcile-absent-equivalent';
  } else if(version==='20260908000000'&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const atom='function:can_user_access_template(user_uuid uuid, template_uuid uuid)';
    const predecessor=contractStep.diff.evidence.find(evidence=>evidence.atom===atom);
    const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort();
    if(observed.expected_atom_count!==atomSet.length||observed.matched_atom_count!==atomSet.length-1
      ||observed.replay_proof?.kind!=='canonical-080-function-predecessor'||observed.replay_proof?.atom!==atom
      ||observed.replay_proof?.before_sha256!==predecessor.before_sha256||observed.replay_proof?.after_sha256!==predecessor.after_sha256
      ||observed.replay_proof?.atom_set_sha256!==sha(atomSet.join('\n'))||!['absent','replayable-partial'].includes(fingerprint.steps?.['20260924000000']?.state)) throw new Error('migration 080 replay proof mismatch');
    mode='apply-replayable-partial';
  } else if(version==='20260924000000'&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file); const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort(); const proof=observed.replay_proof;
    if(observed.expected_atom_count!==atomSet.length||proof?.kind!=='canonical-r0-mixed-with-conditional-absence'||proof?.conditional_absent_atom!=='function:start_user_trial(user_uuid uuid, plan_name text)'||!Number.isInteger(proof.before_count)||!Number.isInteger(proof.after_count)||proof.before_count<1||proof.after_count<1||proof.before_count+proof.after_count!==atomSet.length-1||observed.matched_atom_count!==proof.after_count||proof.atom_set_sha256!==sha(atomSet.join('\n'))) throw new Error('R0 replay proof mismatch');
    mode='apply-replayable-partial';
  } else if(version==='20260924010500'&&!observed.history&&observed.state==='normalize-equivalent-drift') {
    const atom='policy:profiles.Admins can view all profiles'; const supporting='policy:profiles.Users can view own profile';
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const after=contractStep.diff.evidence.find(evidence=>evidence.atom===atom)?.after_sha256; const proof=observed.normalization_proof;
    const reviewed='5b2a0fe6d19cd361821d758ae148d8bff9d49997019bbb2e0bf3a18eb673d5bc';
    if(observed.expected_atom_count!==1||observed.matched_atom_count!==0||proof?.kind!=='redundant-self-view-admin-policy'||proof?.atom!==atom||proof?.supporting_atom!==supporting||proof?.current_sha256!==reviewed||proof?.supporting_sha256!==reviewed||proof?.after_sha256!==after) throw new Error('profiles policy normalization proof mismatch');
    mode='apply-normalize-equivalent-drift';
  } else if(observed.history&&observed.state==='complete'&&observed.matched_atom_count===observed.expected_atom_count) mode='verify-recorded';
  else if(!observed.history&&observed.state==='complete'&&observed.matched_atom_count===observed.expected_atom_count) mode='reconcile-history';
  else if(!observed.history&&observed.state==='absent'&&observed.matched_atom_count===0) {
    if(version==='040') for(const successor of supersededEquivalentProof){const evidence=fingerprint.steps?.[successor];if(!evidence||evidence.state!=='absent'||evidence.matched_atom_count!==0) throw new Error(`migration 040 cannot apply after a successor is present: ${successor}`);}
    mode='apply';
  }
  else throw new Error(`history/state mismatch: ${version}`);
  return {file,version,source_sha256:reviewedSourceHashes[file],mode};
});
const expectedManifest={contract_version:2,target:'production iwoaaljitifloolszxlu',productionAuthorized:false,armed:false,fingerprint_sha256:fingerprintSha256,review_sha256:sha(reviewBytes),frozen_counts:fingerprint.row_counts,frozen_orphans:fingerprint.orphan_counts,frozen_content_digests:fingerprint.content_digests,steps:expectedSteps};
if(manifestText!==JSON.stringify(expectedManifest,null,2)+'\n') throw new Error('manifest was not derived exactly from the reviewed fingerprint and source contract');
console.log(`G3 unarmed plan validated: ${manifest.steps.length} independently pinned steps; production mutation impossible`);
