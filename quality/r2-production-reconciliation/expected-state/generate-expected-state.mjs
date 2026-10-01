#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

export const root=resolve(new URL('../../..',import.meta.url).pathname);
export const here=dirname(new URL(import.meta.url).pathname);
export const migrationDir=resolve(root,'supabase/migrations');
export const expectedPath=resolve(here,'expected-state.v1.json');
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const migrationFiles=()=>readdirSync(migrationDir).filter(f=>f.endsWith('.sql')).sort();
export const key=a=>`${a.kind}:${a.identity}`;
const atomHash=a=>a.value_sha256??sha256(JSON.stringify(a.value));
export function diffAtoms(before,after){
  const a=new Map(before.map(x=>[key(x),x])); const b=new Map(after.map(x=>[key(x),x]));
  const added=[...b.keys()].filter(k=>!a.has(k)).sort();
  const removed=[...a.keys()].filter(k=>!b.has(k)).sort();
  const changed=[...a.keys()].filter(k=>b.has(k)&&atomHash(a.get(k))!==atomHash(b.get(k))).sort();
  const evidence=[...new Set([...added,...removed,...changed])].sort().map(atom=>({
    atom,
    before_sha256:a.has(atom)?atomHash(a.get(atom)):null,
    after_sha256:b.has(atom)?atomHash(b.get(atom)):null
  }));
  return {added,removed,changed,evidence};
}
export function attributeFinalWriters(steps){
  const writers=new Map();
  for(const step of steps){
    step.superseded_atoms=[];
    for(const atom of [...step.diff.changed,...step.diff.removed]){
      const prior=writers.get(atom);
      if(prior) prior.superseded_atoms.push({atom,by:step.file,action:step.diff.removed.includes(atom)?'removed':'changed'});
    }
    for(const atom of step.diff.removed) writers.delete(atom);
    for(const atom of [...step.diff.added,...step.diff.changed]) writers.set(atom,step);
  }
  for(const step of steps){
    step.effective_atoms=[...writers.entries()].filter(([,writer])=>writer===step).map(([atom])=>atom).sort();
    step.superseded_atoms.sort((a,b)=>a.atom.localeCompare(b.atom,'en')||a.by.localeCompare(b.by,'en'));
  }
  return steps;
}
const run=(file,args=[],options={})=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],...options});
const pgBin=process.env.PG_BIN||dirname(run('/usr/bin/which',['initdb']).trim());
function psql(socket,port,db,args=[]){return run(resolve(pgBin,'psql'),['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h',socket,'-p',String(port),'-d',db,...args]);}
function catalog(socket,port,db){return JSON.parse(psql(socket,port,db,['-f',resolve(here,'catalog.sql')]).trim());}
export function buildContract({keep=false}={}){
  const files=migrationFiles(); if(files.length!==62) throw new Error(`expected exact 62-migration chain, found ${files.length}`);
  const recordedBaselineFiles=['001_initial_schema.sql','002_grant_permissions.sql','003_fix_admin_policies.sql','004_add_proposal_fields.sql','005_fix_proposals_schema.sql','006_add_pdf_exports_fields.sql','009_add_profile_fields.sql','010_admin_panel_tables.sql','011_admin_panel_missing_tables.sql','012_enhanced_proposals_system.sql','013_enhance_admin_tables.sql','014_stripe_subscription_schema.sql','015_trial_system_setup.sql','016_add_canceled_at.sql','017_add_billing_history_plan_tracking.sql','018_system_settings_table.sql','019_add_invoice_date_to_billing_history.sql','020_fix_profiles_rls_recursion.sql','021_enhanced_proposal_system.sql','022_enhanced_proposal_system.sql','023_proposal_tracking.sql','024_enhanced_prompt_templates.sql','025_enhanced_prompt_templates.sql','026_enhanced_tracking_tables.sql','027_user_branding_settings.sql','028_enhanced_cancellation_flow.sql','029_proposal_templates_system.sql','030_special_services.sql','20250901194222_add_user_roles.sql'];
  const prerequisiteFiles=['031_enhance_addon_catalog.sql','032_fix_addon_catalog_rls.sql','033_7_day_trial_system.sql','034_free_trial_no_credit_card.sql','035_email_automation_log.sql','036_add_company_profile_fields.sql','037_marketing_attribution.sql','038_calculator_estimate_capture.sql','039_acquisition_attribution_funnel.sql','040_executive_premium_trial_experience.sql','041_growth_qualification_and_funnel.sql','20260908000000_enforce_proposal_design_entitlements.sql','20260913000000_commercial_quick_weekly_frequencies.sql','20260922000000_service_catalog_release_1.sql','20260922010000_catalog_remediation.sql','20260924000000_r0_privilege_hardening.sql','20260924010000_restrict_legacy_proposal_view.sql','20260924010500_fix_profiles_policy_recursion.sql','20260924011000_align_profiles_branding_columns.sql','20260924012000_align_tracking_delivery_methods.sql','20260924013000_sync_tracked_engagement_fields.sql','20260925000000_location_pricing_foundation.sql','20260925001000_location_pricing_reviewed_seed.sql'];
  const r2Files=['20260925002000_r2_organization_tenancy.sql','20260925003000_r2_claude_security_remediation.sql','20260925004000_r2_second_security_remediation.sql','20260925005000_r2_third_security_remediation.sql','20260925006000_r2_cleanup_guard_ordering.sql','20260925007000_r2_service_role_proposal_read.sql','20260925008000_r2_addon_acl_alignment.sql','20260925009000_r2_tracked_print_projection.sql','20260925010000_tracked_link_revocation.sql','20260925011000_r0_private_function_service_role_acl.sql'];
  const productionOrder=[...recordedBaselineFiles,...prerequisiteFiles,...r2Files];
  if(productionOrder.length!==62||new Set(productionOrder).size!==62||productionOrder.some(f=>!files.includes(f))) throw new Error('production-shaped migration order is not the exact 62-file set');
  const work=mkdtempSync(resolve(tmpdir(),'veltex-expected-state-')); const data=resolve(work,'data'); const port=Number(process.env.EXPECTED_STATE_PGPORT||55439);
  run(resolve(pgBin,'initdb'),['-D',data,'-A','trust','-U',process.env.USER||'postgres']);
  run(resolve(pgBin,'pg_ctl'),['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']);
  try{
    psql(work,port,'postgres',['-c','create database veltex_canonical']);
    psql(work,port,'postgres',['-c','create database veltex_production_branch']);
    psql(work,port,'veltex_canonical',['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
    psql(work,port,'veltex_production_branch',['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
    let prior=catalog(work,port,'veltex_canonical'); const steps=[];
    for(const [index,file] of files.entries()){
      psql(work,port,'veltex_canonical',['-f',resolve(migrationDir,file)]);
      const atoms=catalog(work,port,'veltex_canonical');
      steps.push({ordinal:index+1,file,source_sha256:sha256(readFileSync(resolve(migrationDir,file))),atom_count:atoms.length,diff:diffAtoms(prior,atoms)});
      prior=atoms;
    }
    attributeFinalWriters(steps);
    for(const file of recordedBaselineFiles) psql(work,port,'veltex_production_branch',['-f',resolve(migrationDir,file)]);
    const baselineAtoms=catalog(work,port,'veltex_production_branch');
    let branchPrior=baselineAtoms; const productionSteps=[]; let prerequisiteAtoms=[];
    for(const [index,file] of [...prerequisiteFiles,...r2Files].entries()){
      psql(work,port,'veltex_production_branch',['-f',resolve(migrationDir,file)]);
      const atoms=catalog(work,port,'veltex_production_branch');
      productionSteps.push({ordinal:index+1,file,source_sha256:sha256(readFileSync(resolve(migrationDir,file))),atom_count:atoms.length,diff:diffAtoms(branchPrior,atoms)});
      branchPrior=atoms;
      if(file===prerequisiteFiles.at(-1)) prerequisiteAtoms=atoms;
    }
    attributeFinalWriters(productionSteps);
    const prerequisiteSteps=structuredClone(productionSteps.slice(0,prerequisiteFiles.length));
    attributeFinalWriters(prerequisiteSteps);
    for(let i=0;i<prerequisiteSteps.length;i++) productionSteps[i].prerequisite_effective_atoms=prerequisiteSteps[i].effective_atoms;
    if(JSON.stringify(branchPrior)!==JSON.stringify(prior)) throw new Error('production-shaped replay final catalog differs from fresh lexical 62-chain replay');
    return {contract_version:2,postgres_major:16,migration_count:files.length,migrations_sha256:sha256(files.map(f=>`${f}\0${sha256(readFileSync(resolve(migrationDir,f)))}\n`).join('')),catalog_sha256:sha256(readFileSync(resolve(here,'catalog.sql'))),production_order:productionOrder,recorded_baseline:{files:recordedBaselineFiles,atoms:baselineAtoms,atoms_sha256:sha256(JSON.stringify(baselineAtoms))},prerequisite_checkpoint:{through:prerequisiteFiles.at(-1),atoms:prerequisiteAtoms,atoms_sha256:sha256(JSON.stringify(prerequisiteAtoms))},steps,production_steps:productionSteps,atoms:prior};
  } finally {
    try{run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']);}finally{if(!keep)rmSync(work,{recursive:true,force:true});}
  }
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
  const check=process.argv.includes('--check'); const contract=buildContract(); const text=JSON.stringify(contract,null,2)+'\n';
  if(check){if(!existsSync(expectedPath)||readFileSync(expectedPath,'utf8')!==text) throw new Error('expected-state.v1.json is stale; run generator without --check'); console.log('expected-state.v1.json matches disposable PG16 result');}
  else {writeFileSync(expectedPath,text); console.log(`wrote ${expectedPath} (${contract.atoms.length} atoms, ${contract.steps.length} steps)`);}
}
