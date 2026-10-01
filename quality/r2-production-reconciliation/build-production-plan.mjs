#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = resolve(dirname(new URL(import.meta.url).pathname), '../..');
const output = resolve(process.argv[2] ?? '/private/tmp/veltex-r2-production-plan');
const fingerprintPath = resolve(process.argv[3] ?? '');
const reviewPath = resolve(process.argv[4] ?? '');
const productionRef = 'iwoaaljitifloolszxlu';
if (dirname(output) !== '/private/tmp' || !/^veltex-r2-production-plan(?:-[A-Za-z0-9._-]+)?$/.test(basename(output))) throw new Error(`unsafe output: ${output}`);
if (!fingerprintPath || !existsSync(fingerprintPath)) throw new Error('reviewed fingerprint path is required');
if (!reviewPath || !existsSync(reviewPath)) throw new Error('independent review record is required');
const fingerprintBytes = readFileSync(fingerprintPath);
const fp = JSON.parse(fingerprintBytes.toString('utf8'));
const review = JSON.parse(readFileSync(reviewPath, 'utf8'));
const sha = text => createHash('sha256').update(text).digest('hex');
const expectedHistory = ['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
const requiredDigests = [
  'profiles_all','proposals_all','tracking_all','branding_all','subscriptions_all',
  'usage_all','addon_catalog_all','proposal_addons_all','proposal_templates_all',
  'tier_access_all','template_preferences_all'
];
if (fp.project_ref !== productionRef || fp.environment !== 'production' || fp.read_only !== true) throw new Error('fingerprint is not the explicit production read-only contract');
const expectedStatePath=resolve(root,'quality/r2-production-reconciliation/expected-state/expected-state.v1.json');
const expectedStateBytes=readFileSync(expectedStatePath);
const expectedStateContract=JSON.parse(expectedStateBytes);
const expectedBinding={catalog_sha256:expectedStateContract.catalog_sha256,data_invariants_sha256:expectedStateContract.data_invariants_sha256,migrations_sha256:expectedStateContract.migrations_sha256,capture_generator_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/build-read-only-production-capture.mjs'))),effective_privileges_expression_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/effective-privileges-expression.sql'))),expected_effective_privileges_sha256:sha(readFileSync(resolve(root,'quality/r2-production-reconciliation/expected-state/expected-effective-privileges.v1.json')))};
const bindingKeys=Object.keys(expectedBinding).sort();
const binding=fp.contract_binding;
const bindingExact=binding&&typeof binding==='object'&&!Array.isArray(binding)&&JSON.stringify(Object.keys(binding).sort())===JSON.stringify(bindingKeys)&&bindingKeys.every(key=>binding[key]===expectedBinding[key]);
if(fp.contract_version!==3||fp.canonicalization_version!==2||fp.classified_contract_version!==1||fp.classification?.expected_state_sha256!==sha(expectedStateBytes)||!bindingExact) throw new Error('fingerprint classifier/contract binding failed');
if (fp.migration_history?.count !== 29 || JSON.stringify(fp.migration_history.versions) !== JSON.stringify(expectedHistory)) throw new Error('production history drift');
if (fp.baseline?.state !== 'complete' || fp.baseline.atom_digest!==expectedStateContract.recorded_baseline.atoms_sha256 || fp.baseline.expected_atom_count!==expectedStateContract.recorded_baseline.atoms.length || fp.baseline.matched_atom_count!==expectedStateContract.recorded_baseline.atoms.length) throw new Error('recorded baseline objects are not independently proven complete');
if (fp.r2_absent !== true) throw new Error('R2 is not wholly absent');
const fingerprintSha256 = createHash('sha256').update(fingerprintBytes).digest('hex');
if (review.status !== 'PASS' || review.fingerprint_sha256 !== fingerprintSha256 || !review.reviewer || !review.reviewed_at) throw new Error('independent fingerprint review is incomplete or does not bind this exact fingerprint');
for (const key of requiredDigests) if (!/^[0-9a-f]{64}$/.test(fp.content_digests?.[key] ?? '')) throw new Error(`missing redacted digest: ${key}`);
const prerequisiteFiles = [
  '031_enhance_addon_catalog.sql','032_fix_addon_catalog_rls.sql','033_7_day_trial_system.sql','034_free_trial_no_credit_card.sql','035_email_automation_log.sql','036_add_company_profile_fields.sql','037_marketing_attribution.sql','038_calculator_estimate_capture.sql','039_acquisition_attribution_funnel.sql','040_executive_premium_trial_experience.sql','041_growth_qualification_and_funnel.sql','20260908000000_enforce_proposal_design_entitlements.sql','20260913000000_commercial_quick_weekly_frequencies.sql','20260922000000_service_catalog_release_1.sql','20260922010000_catalog_remediation.sql','20260924000000_r0_privilege_hardening.sql','20260924010000_restrict_legacy_proposal_view.sql','20260924010500_fix_profiles_policy_recursion.sql','20260924011000_align_profiles_branding_columns.sql','20260924012000_align_tracking_delivery_methods.sql','20260924013000_sync_tracked_engagement_fields.sql','20260925000000_location_pricing_foundation.sql','20260925001000_location_pricing_reviewed_seed.sql'
];
const r2Files = ['20260925002000_r2_organization_tenancy.sql','20260925003000_r2_claude_security_remediation.sql','20260925004000_r2_second_security_remediation.sql','20260925005000_r2_third_security_remediation.sql','20260925006000_r2_cleanup_guard_ordering.sql','20260925007000_r2_service_role_proposal_read.sql','20260925008000_r2_addon_acl_alignment.sql','20260925009000_r2_tracked_print_projection.sql','20260925010000_tracked_link_revocation.sql','20260925011000_r0_private_function_service_role_acl.sql','20260925012000_revoke_client_maintain.sql','20260925013000_production_schema_compatibility.sql'];
const reviewedSourceHashes = JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/reviewed-source-sha256.json'),'utf8'));
const exactFiles = [...prerequisiteFiles, ...r2Files];
const supersededEquivalentVersion = '040';
const supersededEquivalentProof = ['20260908000000','20260924000000'];
const absentEquivalentVersion = '20260924010000';
const replayablePartialVersion = '20260908000000';
const replayablePartialAtom = 'function:can_user_access_template(user_uuid uuid, template_uuid uuid)';
const platformConditionalVersion = '20260925012000';
const compatibilityVersion='20260925013000';
const compatibilityPolicyAtom='policy:billing_history.Admins can view all billing history';
const legacyCompatibilityPolicySha256='15e41a56dabd4538aaf0c6bf3426103bcd944f11e3fd94151fb29d5d8ada0394';
const platformAtomKey=atom=>`${atom.kind}:${atom.identity}`;
const finalExpectedAtoms=new Map(expectedStateContract.atoms.map(atom=>[platformAtomKey(atom),atom.value_sha256]));
const platformAtoms=(fp.catalog_atoms??[]).map(atom=>[platformAtomKey(atom),atom.value_sha256]).filter(([key,value])=>(key==='acl:schema:public:postgres:USAGE'||key.startsWith('extension:')||/^acl:(?:table|view):[^:]+:(?:anon|authenticated|OBJECT_OWNER|service_role):MAINTAIN$/.test(key))&&(finalExpectedAtoms.get(key)??null)!==value);
const platformEvidenceSha256=sha(platformAtoms.slice().sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('\n'));
const acceptedPlatformEvidence=new Map([[0,sha('')],[137,'6b7d138e76e5b72581af54653a717ba59ad9215c60efe62ebd1128ab126706f9']]);
if(fp.platform_variance?.kind!=='hosted-pg17-catalog-envelope-v1'||!acceptedPlatformEvidence.has(fp.platform_variance.count)||platformAtoms.length!==fp.platform_variance.count||fp.platform_variance.evidence_sha256!==platformEvidenceSha256||fp.platform_variance.evidence_sha256!==acceptedPlatformEvidence.get(fp.platform_variance.count)) throw new Error('hosted PG17 platform variance proof mismatch');
const legacyViewAtom = key => key==='view:enhanced_proposals'
  || key.startsWith('column:enhanced_proposals.')
  || key.startsWith('acl:view:enhanced_proposals:');
const absentEquivalentAtoms = expectedStateContract.recorded_baseline.atoms
  .map(atom=>`${atom.kind}:${atom.identity}`).filter(legacyViewAtom).sort();
const absentEquivalentProofSha256 = sha(absentEquivalentAtoms.join('\n'));
if (JSON.stringify(Object.keys(reviewedSourceHashes)) !== JSON.stringify(exactFiles)) throw new Error('reviewed source hash table does not match the exact ordered migration set');
const steps = [...prerequisiteFiles, ...r2Files].map(file => {
  const version = file.split('_',1)[0];
  const source = readFileSync(resolve(root,'supabase/migrations',file),'utf8');
  const observed = fp.steps?.[version];
  if (!observed || typeof observed.history !== 'boolean' || !['absent','complete','partial','ambiguous','superseded-equivalent','absent-equivalent','replayable-partial','normalize-equivalent-drift'].includes(observed.state)) throw new Error(`incomplete object fingerprint for ${version}`);
  const allowsZeroAtoms = (version===supersededEquivalentVersion && ['absent','superseded-equivalent'].includes(observed.state)) || (version===platformConditionalVersion&&observed.state==='absent');
  if (!Number.isInteger(observed.expected_atom_count) || !Number.isInteger(observed.matched_atom_count) || observed.expected_atom_count < (allowsZeroAtoms?0:1) || observed.matched_atom_count < 0 || observed.matched_atom_count > observed.expected_atom_count) throw new Error(`invalid atom evidence for ${version}`);
  if (observed.state === 'partial' || observed.state === 'ambiguous') throw new Error(`partial/ambiguous state for ${version}`);
  let mode;
  if (version===compatibilityVersion&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort();
    const afterPolicy=contractStep.diff.evidence.find(evidence=>evidence.atom===compatibilityPolicyAtom)?.after_sha256;
    const proof=observed.replay_proof;
    if(observed.expected_atom_count!==atomSet.length||observed.matched_atom_count!==atomSet.length-1
      ||proof?.kind!=='production-schema-compatibility-with-policy-normalization'||proof?.policy_atom!==compatibilityPolicyAtom
      ||proof?.current_policy_sha256!==legacyCompatibilityPolicySha256||proof?.after_policy_sha256!==afterPolicy
      ||proof?.atom_set_sha256!==sha(atomSet.join('\n'))) throw new Error('migration 130 compatibility replay proof mismatch');
    mode='apply-replayable-partial';
  } else if (r2Files.includes(file)) {
    if (observed.history || observed.state !== 'absent' || observed.matched_atom_count !== 0) throw new Error(`R2/forward migration is not exhaustively absent: ${version}`);
    if(version===platformConditionalVersion&&(observed.expected_atom_count!==0||observed.platform_proof?.kind!=='pg17-maintain-hardening'||observed.platform_proof?.postgres_major!==17||!fp.postgres_version.startsWith('17.'))) throw new Error('PG17 MAINTAIN repair platform proof mismatch');
    mode = 'apply';
  } else if (version===supersededEquivalentVersion && !observed.history && observed.state==='superseded-equivalent') {
    if (JSON.stringify(observed.equivalence_proof)!==JSON.stringify(supersededEquivalentProof)) throw new Error('migration 040 equivalence proof mismatch');
    for (const successor of supersededEquivalentProof) {
      const evidence=fp.steps?.[successor];
      if (!evidence || evidence.state!=='complete' || evidence.matched_atom_count!==evidence.expected_atom_count) throw new Error(`migration 040 successor is not exactly complete: ${successor}`);
    }
    mode='reconcile-superseded-equivalent';
  } else if (version===absentEquivalentVersion && !observed.history && observed.state==='absent-equivalent') {
    if(observed.expected_atom_count!==absentEquivalentAtoms.length || observed.matched_atom_count!==absentEquivalentAtoms.length
      || observed.equivalence_proof?.kind!=='legacy-view-absent'
      || observed.equivalence_proof?.atom_set_sha256!==absentEquivalentProofSha256) throw new Error('legacy-view absence equivalence proof mismatch');
    mode='reconcile-absent-equivalent';
  } else if(version===replayablePartialVersion&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const transition=new Map(contractStep.diff.evidence.map(evidence=>[evidence.atom,evidence]));
    const predecessor=transition.get(replayablePartialAtom);
    const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort();
    if(observed.expected_atom_count!==atomSet.length||observed.matched_atom_count!==atomSet.length-1
      ||observed.replay_proof?.kind!=='canonical-080-function-predecessor'
      ||observed.replay_proof?.atom!==replayablePartialAtom
      ||observed.replay_proof?.before_sha256!==predecessor.before_sha256
      ||observed.replay_proof?.after_sha256!==predecessor.after_sha256
      ||observed.replay_proof?.atom_set_sha256!==sha(atomSet.join('\n'))
      ||!['absent','replayable-partial'].includes(fp.steps?.['20260924000000']?.state)) throw new Error('migration 080 replay proof mismatch');
    mode='apply-replayable-partial';
  } else if(version==='20260924000000'&&!observed.history&&observed.state==='replayable-partial') {
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const atomSet=contractStep.diff.evidence.map(evidence=>evidence.atom).sort();
    const proof=observed.replay_proof;
    if(observed.expected_atom_count!==atomSet.length||proof?.kind!=='canonical-r0-mixed-with-conditional-absence'||proof?.conditional_absent_atom!=='function:start_user_trial(user_uuid uuid, plan_name text)'||!Number.isInteger(proof.before_count)||!Number.isInteger(proof.after_count)||proof.before_count<1||proof.after_count<1||proof.before_count+proof.after_count!==atomSet.length-1||observed.matched_atom_count!==proof.after_count||proof.atom_set_sha256!==sha(atomSet.join('\n'))) throw new Error('R0 replay proof mismatch');
    mode='apply-replayable-partial';
  } else if(version==='20260924010500'&&!observed.history&&observed.state==='normalize-equivalent-drift') {
    const atom='policy:profiles.Admins can view all profiles';
    const supporting='policy:profiles.Users can view own profile';
    const contractStep=expectedStateContract.production_steps.find(step=>step.file===file);
    const after=contractStep.diff.evidence.find(evidence=>evidence.atom===atom)?.after_sha256;
    const proof=observed.normalization_proof;
    const reviewed='5b2a0fe6d19cd361821d758ae148d8bff9d49997019bbb2e0bf3a18eb673d5bc';
    if(observed.expected_atom_count!==1||observed.matched_atom_count!==0||proof?.kind!=='redundant-self-view-admin-policy'||proof?.atom!==atom||proof?.supporting_atom!==supporting||proof?.current_sha256!==reviewed||proof?.supporting_sha256!==reviewed||proof?.after_sha256!==after) throw new Error('profiles policy normalization proof mismatch');
    mode='apply-normalize-equivalent-drift';
  } else if (observed.history && observed.state === 'complete' && observed.matched_atom_count === observed.expected_atom_count) mode = 'verify-recorded';
  else if (!observed.history && observed.state === 'complete' && observed.matched_atom_count === observed.expected_atom_count) mode = 'reconcile-history';
  else if (!observed.history && observed.state === 'absent' && observed.matched_atom_count === 0) {
    if (version===supersededEquivalentVersion) {
      for (const successor of supersededEquivalentProof) {
        const evidence=fp.steps?.[successor];
        if (!evidence || evidence.state!=='absent' || evidence.matched_atom_count!==0) throw new Error(`migration 040 cannot apply after a successor is present: ${successor}`);
      }
    }
    mode = 'apply';
  }
  else throw new Error(`history/state mismatch for ${version}`);
  const sourceSha256 = sha(source);
  if (reviewedSourceHashes[file] !== sourceSha256) throw new Error(`migration source is not independently pinned: ${file}`);
  return { file, version, source_sha256: sourceSha256, mode };
});
rmSync(output,{recursive:true,force:true}); mkdirSync(output,{recursive:true,mode:0o700});
const manifest = { contract_version:2, target:`production ${productionRef}`, productionAuthorized:false, armed:false, fingerprint_sha256:fingerprintSha256, review_sha256:sha(readFileSync(reviewPath)), frozen_counts:fp.row_counts, frozen_orphans:fp.orphan_counts, frozen_content_digests:fp.content_digests, steps };
const manifestText = JSON.stringify(manifest,null,2)+'\n';
const manifestBase64 = Buffer.from(manifestText).toString('base64');
const sql = `-- GENERATED G3 REVIEW ARTIFACT. UNARMED AND NON-EXECUTABLE.\n-- Target label: ${productionRef}; identity still requires exact database fingerprint.\n-- Fingerprint SHA-256: ${manifest.fingerprint_sha256}\n-- Manifest Base64 SHA-256: ${sha(manifestBase64)}\n-- No production authorization is encoded in this file.\n\ndo $$ begin raise exception 'UNARMED G3 ARTIFACT: G2, exact-artifact review, G4 and action-specific production authorization are required'; end $$;\n\n-- MANIFEST_BASE64:${manifestBase64}\n`;
writeFileSync(resolve(output,'manifest.json'),manifestText,{mode:0o600});
writeFileSync(resolve(output,'UNARMED-production-plan.sql'),sql,{mode:0o600});
console.log(JSON.stringify({output,steps:steps.length,armed:false,fingerprint_sha256:manifest.fingerprint_sha256},null,2));
