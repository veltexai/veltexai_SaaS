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
  const work=mkdtempSync(resolve(tmpdir(),'veltex-expected-state-')); const data=resolve(work,'data'); const port=Number(process.env.EXPECTED_STATE_PGPORT||55439);
  run(resolve(pgBin,'initdb'),['-D',data,'-A','trust','-U',process.env.USER||'postgres']);
  run(resolve(pgBin,'pg_ctl'),['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']);
  try{
    psql(work,port,'postgres',['-c','create database veltex_expected_state']);
    psql(work,port,'postgres',['-c','create database veltex_recorded_baseline']);
    psql(work,port,'veltex_expected_state',['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
    psql(work,port,'veltex_recorded_baseline',['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
    for(const file of recordedBaselineFiles) psql(work,port,'veltex_recorded_baseline',['-f',resolve(migrationDir,file)]);
    const baselineAtoms=catalog(work,port,'veltex_recorded_baseline');
    let prior=catalog(work,port,'veltex_expected_state'); const steps=[]; let prerequisiteAtoms=[];
    for(const [index,file] of files.entries()){
      psql(work,port,'veltex_expected_state',['-f',resolve(migrationDir,file)]);
      const atoms=catalog(work,port,'veltex_expected_state');
      steps.push({ordinal:index+1,file,source_sha256:sha256(readFileSync(resolve(migrationDir,file))),atom_count:atoms.length,diff:diffAtoms(prior,atoms)});
      prior=atoms;
      if(file==='20260925001000_location_pricing_reviewed_seed.sql') prerequisiteAtoms=atoms;
    }
    attributeFinalWriters(steps);
    const prerequisiteSteps=structuredClone(steps.slice(0,52));
    attributeFinalWriters(prerequisiteSteps);
    for(let i=0;i<prerequisiteSteps.length;i++) steps[i].prerequisite_effective_atoms=prerequisiteSteps[i].effective_atoms;
    return {contract_version:1,postgres_major:16,migration_count:files.length,migrations_sha256:sha256(files.map(f=>`${f}\0${sha256(readFileSync(resolve(migrationDir,f)))}\n`).join('')),catalog_sha256:sha256(readFileSync(resolve(here,'catalog.sql'))),recorded_baseline:{files:recordedBaselineFiles,atoms:baselineAtoms,atoms_sha256:sha256(JSON.stringify(baselineAtoms))},prerequisite_checkpoint:{through:'20260925001000_location_pricing_reviewed_seed.sql',atoms:prerequisiteAtoms,atoms_sha256:sha256(JSON.stringify(prerequisiteAtoms))},steps,atoms:prior};
  } finally {
    try{run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']);}finally{if(!keep)rmSync(work,{recursive:true,force:true});}
  }
}
if(process.argv[1]&&resolve(process.argv[1])===new URL(import.meta.url).pathname){
  const check=process.argv.includes('--check'); const contract=buildContract(); const text=JSON.stringify(contract,null,2)+'\n';
  if(check){if(!existsSync(expectedPath)||readFileSync(expectedPath,'utf8')!==text) throw new Error('expected-state.v1.json is stale; run generator without --check'); console.log('expected-state.v1.json matches disposable PG16 result');}
  else {writeFileSync(expectedPath,text); console.log(`wrote ${expectedPath} (${contract.atoms.length} atoms, ${contract.steps.length} steps)`);}
}
