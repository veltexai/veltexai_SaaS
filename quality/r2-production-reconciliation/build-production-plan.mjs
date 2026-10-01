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
const expectedHistory = ['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
const requiredDigests = ['profiles_identity','proposals_identity_and_content','tracking_identity_and_counters','branding_identity','subscriptions_identity'];
if (fp.project_ref !== productionRef || fp.environment !== 'production' || fp.read_only !== true) throw new Error('fingerprint is not the explicit production read-only contract');
if (fp.migration_history?.count !== 29 || JSON.stringify(fp.migration_history.versions) !== JSON.stringify(expectedHistory)) throw new Error('production history drift');
if (fp.r2_absent !== true) throw new Error('R2 is not wholly absent');
const fingerprintSha256 = createHash('sha256').update(fingerprintBytes).digest('hex');
if (review.status !== 'PASS' || review.fingerprint_sha256 !== fingerprintSha256 || !review.reviewer || !review.reviewed_at) throw new Error('independent fingerprint review is incomplete or does not bind this exact fingerprint');
for (const key of requiredDigests) if (!/^[0-9a-f]{64}$/.test(fp.content_digests?.[key] ?? '')) throw new Error(`missing redacted digest: ${key}`);
const prerequisiteFiles = [
  '031_enhance_addon_catalog.sql','032_fix_addon_catalog_rls.sql','033_7_day_trial_system.sql','034_free_trial_no_credit_card.sql','035_email_automation_log.sql','036_add_company_profile_fields.sql','037_marketing_attribution.sql','038_calculator_estimate_capture.sql','039_acquisition_attribution_funnel.sql','040_executive_premium_trial_experience.sql','041_growth_qualification_and_funnel.sql','20260908000000_enforce_proposal_design_entitlements.sql','20260913000000_commercial_quick_weekly_frequencies.sql','20260922000000_service_catalog_release_1.sql','20260922010000_catalog_remediation.sql','20260924000000_r0_privilege_hardening.sql','20260924010000_restrict_legacy_proposal_view.sql','20260924010500_fix_profiles_policy_recursion.sql','20260924011000_align_profiles_branding_columns.sql','20260924012000_align_tracking_delivery_methods.sql','20260924013000_sync_tracked_engagement_fields.sql','20260925000000_location_pricing_foundation.sql','20260925001000_location_pricing_reviewed_seed.sql'
];
const r2Files = ['20260925002000_r2_organization_tenancy.sql','20260925003000_r2_claude_security_remediation.sql','20260925004000_r2_second_security_remediation.sql','20260925005000_r2_third_security_remediation.sql','20260925006000_r2_cleanup_guard_ordering.sql','20260925007000_r2_service_role_proposal_read.sql','20260925008000_r2_addon_acl_alignment.sql','20260925009000_r2_tracked_print_projection.sql','20260925010000_tracked_link_revocation.sql','20260925011000_r0_private_function_service_role_acl.sql'];
const sha = text => createHash('sha256').update(text).digest('hex');
const reviewedSourceHashes = JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/reviewed-source-sha256.json'),'utf8'));
const exactFiles = [...prerequisiteFiles, ...r2Files];
if (JSON.stringify(Object.keys(reviewedSourceHashes)) !== JSON.stringify(exactFiles)) throw new Error('reviewed source hash table does not match the exact ordered migration set');
const steps = [...prerequisiteFiles, ...r2Files].map(file => {
  const version = file.split('_',1)[0];
  const source = readFileSync(resolve(root,'supabase/migrations',file),'utf8');
  const observed = fp.steps?.[version];
  let mode;
  if (r2Files.includes(file)) mode = 'apply';
  else if (!observed || typeof observed.history !== 'boolean' || typeof observed.complete !== 'boolean') throw new Error(`incomplete object fingerprint for ${version}`);
  else if (observed.history && observed.complete) mode = 'verify-recorded';
  else if (!observed.history && observed.complete) mode = 'reconcile-history';
  else if (!observed.history && !observed.complete) mode = 'apply';
  else throw new Error(`partial/inconsistent state for ${version}`);
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
