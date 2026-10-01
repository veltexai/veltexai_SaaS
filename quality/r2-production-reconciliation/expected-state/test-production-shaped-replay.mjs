#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { here, migrationDir, migrationFiles, root } from './generate-expected-state.mjs';

const run=(file,args,options={})=>execFileSync(file,args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],...options});
const pgBin=process.env.PG_BIN||dirname(run('/usr/bin/which',['initdb']).trim());
const work=mkdtempSync(resolve(tmpdir(),'veltex-production-shaped-replay-'));
const data=resolve(work,'data');
const port=Number(process.env.EXPECTED_STATE_REPLAY_PGPORT||56000+(process.pid%500));
const branchDb='veltex_production_shaped_branch'; const canonicalDb='veltex_production_shaped_canonical';
const currentOwner=process.env.USER||'postgres'; const renamedOwner=`replay_owner_${process.pid}`;
const psql=(db,args,user=currentOwner)=>run(resolve(pgBin,'psql'),['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h',work,'-p',String(port),'-U',user,'-d',db,...args]);
const catalog=(db,user=currentOwner)=>JSON.parse(psql(db,['-f',resolve(here,'catalog.sql')],user).trim());
const dataInvariantExpression=readFileSync(resolve(here,'data-invariants-expression.sql'),'utf8').trim();
const dataInvariants=(db,user=currentOwner)=>JSON.parse(psql(db,['-c',`select (${dataInvariantExpression})::text`],user).trim());
const contract=JSON.parse(readFileSync(resolve(here,'expected-state.v1.json'),'utf8'));
const classifier=resolve(here,'classify-production-capture.mjs');
const history=['001','002','003','004','005','006','009','010','011','012','013','014','015','016','017','018','019','020','021','022','023','024','025','026','027','028','029','030','20250901194222'];
const digestNames=['profiles_all','proposals_all','tracking_all','branding_all','subscriptions_all','usage_all','addon_catalog_all','proposal_addons_all','proposal_templates_all','tier_access_all','template_preferences_all'];
const fileSha=path=>createHash('sha256').update(readFileSync(resolve(here,path))).digest('hex');
const contractBinding={catalog_sha256:contract.catalog_sha256,data_invariants_sha256:contract.data_invariants_sha256,migrations_sha256:contract.migrations_sha256,capture_generator_sha256:fileSha('build-read-only-production-capture.mjs'),effective_privileges_expression_sha256:fileSha('effective-privileges-expression.sql'),expected_effective_privileges_sha256:fileSha('expected-effective-privileges.v1.json')};
// PostgreSQL 16 executes the disposable canonical catalog replay; the envelope
// models the verified hosted production major (17) so the PG17-only forward
// repair receives the same platform proof as a real production capture.
const capture=(atoms,dataInvariants)=>({contract_version:3,canonicalization_version:2,postgres_version:'17.6',contract_binding:contractBinding,captured_at:'2026-09-30T00:00:00Z',project_ref:'iwoaaljitifloolszxlu',environment:'production',read_only:true,migration_history:{count:29,versions:history},row_counts:{},orphan_counts:{},content_digests:Object.fromEntries(digestNames.map(k=>[k,'0'.repeat(64)])),data_invariants:dataInvariants,platform_capabilities:{pgcrypto:{installed:true,schema:'public',version:'1.3',digest_extension_owned:true,digest_callable:true}},catalog_atoms:atoms.map(({kind,identity,value_sha256})=>({kind,identity,value_sha256}))});
const key=a=>`${a.kind}:${a.identity}`;
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalizeOwner=(atoms,owner)=>atoms.map(atom=>{
  const value=structuredClone(atom.value); if(atom.kind==='acl'&&value.grantee===owner)value.grantee='<database_owner>';
  const identity=atom.kind==='acl'?atom.identity.replace(`:${owner}:`,':<database_owner>:'):atom.identity;
  return {...atom,identity,value,value_sha256:sha(value)};
});
const expectRefusal=(name,atoms,dataInvariants,pattern)=>{
  const input=resolve(work,`${name}.json`); const output=`/private/tmp/veltex-g3-replay-${process.pid}-${name}.json`;
  writeFileSync(input,JSON.stringify(capture(atoms,dataInvariants)));
  let stderr='';
  try{run(process.execPath,[classifier,input,output]); assert.fail(`${name} unexpectedly classified`);}catch(error){stderr=String(error.stderr??error.message);}
  assert.match(stderr,pattern,`${name} refusal reason`);
  return stderr.match(pattern)?.[0];
};
const classify=(name,atoms,dataInvariants)=>{
  const input=resolve(work,`${name}.json`); const output=`/private/tmp/veltex-g3-replay-${process.pid}-${name}.json`;
  writeFileSync(input,JSON.stringify(capture(atoms,dataInvariants)));
  run(process.execPath,[classifier,input,output]);
  return JSON.parse(readFileSync(output,'utf8'));
};

const files=migrationFiles();
assert.equal(files.length,64);
assert.equal(contract.recorded_baseline.files.length,29);
let started=false;
try{
  run(resolve(pgBin,'initdb'),['-D',data,'-A','trust','-U',process.env.USER||'postgres']);
  run(resolve(pgBin,'pg_ctl'),['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']); started=true;
  psql('postgres',['-c',`create role ${renamedOwner} login superuser`]);
  psql('postgres',['-c',`create database ${branchDb}`]);
  psql('postgres',['-c',`create database ${canonicalDb} owner ${renamedOwner}`]);
  psql(branchDb,['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
  psql(canonicalDb,['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')],renamedOwner);

  for(const file of contract.recorded_baseline.files) psql(branchDb,['-f',resolve(migrationDir,file)]);
  const baseline=catalog(branchDb);
  assert.deepEqual(baseline,contract.recorded_baseline.atoms,'canonical 29-file replay differs from recorded baseline');
  const baselineClassification=classify('canonical-baseline',baseline,contract.recorded_baseline.data_invariants);
  assert.equal(baselineClassification.steps['040'].state,'absent');
  psql(branchDb,['-c',`insert into public.additional_service_catalog
    (sku,label,unit_type,rate,min_qty,default_frequency,frequency_options,amortize_to_monthly,default_qty_source)
    values ('fixture_clean_detail','Fixture clean detail','flat',1,0,'one_time',array['one_time'],false,'manual')`]);

  const prerequisiteFiles=contract.production_steps.slice(0,23).map(s=>s.file);
  assert.equal(prerequisiteFiles.length,23);
  for(const file of prerequisiteFiles){
    psql(branchDb,['-f',resolve(migrationDir,file)]);
    if(file==='033_7_day_trial_system.sql') psql(branchDb,['-c',`insert into auth.users(id,email) values ('33333333-3333-4333-8333-333333333333','veltexclean+g3fixture@gmail.com')`]);
  }
  const prerequisite=catalog(branchDb);
  assert.deepEqual(prerequisite,contract.prerequisite_checkpoint.atoms,'prerequisite replay differs from checkpoint');
  const prerequisiteData=dataInvariants(branchDb);
  assert.deepEqual(prerequisiteData,contract.prerequisite_checkpoint.data_invariants,'production-shaped data invariants differ from generated checkpoint');
  psql(branchDb,['-c',`alter database ${branchDb} set timezone='Pacific/Kiritimati'`,'-c',`alter database ${branchDb} set datestyle='SQL, DMY'`]);
  assert.deepEqual(dataInvariants(branchDb),prerequisiteData,'canonical invariant hashes changed under TimeZone/DateStyle GUCs');
  const fixtureProof=JSON.parse(psql(branchDb,['-c',`select jsonb_build_object(
    'status',p.subscription_status,'trial_end_present',p.trial_end_at is not null,'is_internal',p.is_internal,
    'usage_rows',(select count(*) from public.usage u where u.user_id=p.id),
    'addon_category',(select category from public.additional_service_catalog where sku='fixture_clean_detail')
  )::text from public.profiles p where p.id='33333333-3333-4333-8333-333333333333'`]).trim());
  assert.deepEqual(fixtureProof,{status:'free_trial',trial_end_present:true,is_internal:true,usage_rows:1,addon_category:'cleaning'},'031/034/041 synthetic backfill proof failed');
  const prerequisiteClassification=classify('prerequisite-complete',prerequisite,contract.prerequisite_checkpoint.data_invariants);
  assert.equal(prerequisiteClassification.steps['040'].state,'superseded-equivalent');

  // Reproduce the exact five-of-six production compatibility state: the two
  // fields, pending default, and both Stripe constraints already match while
  // the legacy PUBLIC/raw-profile admin policy still needs normalization.
  psql(branchDb,['-c',`alter table public.profiles alter column subscription_status set default 'pending'::text;
    alter table public.proposal_templates add column if not exists preview_pdf_url text;
    alter table public.proposals add column if not exists city varchar(100);
    alter table public.proposals alter column city set default null;
    alter table public.billing_history drop constraint if exists billing_history_action_check;
    alter table public.billing_history add constraint billing_history_action_check check (action=any(array['upgrade'::text,'downgrade'::text,'payment'::text,'refund'::text,'subscription_start'::text]));
    alter table public.subscriptions drop constraint if exists subscriptions_status_check;
    alter table public.subscriptions add constraint subscriptions_status_check check (status=any(array['active'::text,'trialing'::text,'cancelled'::text,'past_due'::text,'unpaid'::text]));
    drop policy if exists "Admins can view all billing history" on public.billing_history;
    create policy "Admins can view all billing history" on public.billing_history for select using (exists(select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'::text));`]);
  const compatibilityStep=contract.production_steps.find(step=>step.file.startsWith('20260925013000_'));
  const compatibilityKeys=new Set(compatibilityStep.diff.evidence.map(evidence=>evidence.atom));
  const compatibilityBefore=catalog(branchDb).filter(atom=>compatibilityKeys.has(key(atom)));
  const compatibilityBeforeMap=new Map(compatibilityBefore.map(atom=>[key(atom),atom.value_sha256]));
  const policyAtom='policy:billing_history.Admins can view all billing history';
  assert.equal(compatibilityStep.diff.evidence.filter(evidence=>evidence.atom!==policyAtom&&compatibilityBeforeMap.get(evidence.atom)===evidence.after_sha256).length,compatibilityStep.diff.evidence.length-1,'five compatibility atoms are not exact');
  assert.equal(compatibilityBeforeMap.get(policyAtom),'15e41a56dabd4538aaf0c6bf3426103bcd944f11e3fd94151fb29d5d8ada0394','legacy billing policy fixture is not exact');
  const compatibilityDataBefore=dataInvariants(branchDb);
  psql(branchDb,['-f',resolve(migrationDir,compatibilityStep.file)]);
  psql(branchDb,['-f',resolve(migrationDir,compatibilityStep.file)]);
  const compatibilityAfterMap=new Map(catalog(branchDb).filter(atom=>compatibilityKeys.has(key(atom))).map(atom=>[key(atom),atom.value_sha256]));
  for(const evidence of compatibilityStep.diff.evidence) assert.equal(compatibilityAfterMap.get(evidence.atom)??null,evidence.after_sha256,`compatibility normalization mismatch: ${evidence.atom}`);
  assert.deepEqual(dataInvariants(branchDb),compatibilityDataBefore,'compatibility migration changed protected data invariants');

  const effective=contract.production_steps.slice(0,23).flatMap(s=>s.prerequisite_effective_atoms??[]);
  const baselineMap=new Map(baseline.map(a=>[key(a),a])); const prerequisiteMap=new Map(prerequisite.map(a=>[key(a),a]));
  const changedAtom=effective.find(k=>prerequisiteMap.has(k)&&baselineMap.get(k)?.value_sha256!==prerequisiteMap.get(k).value_sha256);
  assert.ok(changedAtom,'no prerequisite atom suitable for one-atom partial state');
  const partialMap=new Map(baselineMap); partialMap.set(changedAtom,prerequisiteMap.get(changedAtom));
  const partial=[...partialMap.values()].sort((a,b)=>key(a).localeCompare(key(b),'en'));
  const partialReason=expectRefusal('one-atom-partial',partial,contract.recorded_baseline.data_invariants,/partial prerequisite state/);

  const r2Files=contract.production_steps.slice(23).map(s=>s.file); assert.equal(r2Files.length,12);
  psql(branchDb,['-f',resolve(migrationDir,r2Files[0])]);
  const strayR2=catalog(branchDb);
  assert.notDeepEqual(strayR2,prerequisite,'first R2 migration made no catalog change');
  const strayReason=expectRefusal('stray-r2',strayR2,contract.prerequisite_checkpoint.data_invariants,/R2\/forward state is not absent/);
  for(const file of r2Files.slice(1)) psql(branchDb,['-f',resolve(migrationDir,file)]);
  const branchFinal=catalog(branchDb);

  for(const file of files) psql(canonicalDb,['-f',resolve(migrationDir,file)],renamedOwner);
  const canonicalFinal=catalog(canonicalDb,renamedOwner);
  assert.deepEqual(branchFinal,canonicalFinal,'catalog must normalize database-owner ACLs before hashing');
  const explicitOwnerVariant=canonicalFinal.map(atom=>{
    if(atom.kind!=='acl'||atom.value.grantee!=='OBJECT_OWNER') return atom;
    const value={...atom.value,grantee:renamedOwner};
    return {...atom,identity:atom.identity.replace(':OBJECT_OWNER:',`:${renamedOwner}:`),value,value_sha256:sha(value)};
  });
  assert.notDeepEqual(branchFinal,explicitOwnerVariant,'owner-variant fixture did not create a distinct ACL catalog');
  assert.deepEqual(normalizeOwner(branchFinal,'OBJECT_OWNER'),normalizeOwner(explicitOwnerVariant,renamedOwner),'owner normalization is not invariant across database owners');

  console.log(JSON.stringify({status:'PASS',postgres_major:16,migrations_replayed:128,branch_model:'29 recorded + 23 prerequisite + 12 forward',canonical_model:'fresh lexical 64',renamed_owner_invariant:true,synthetic_backfills:{migration_031_category:fixtureProof.addon_category,migration_034_status:fixtureProof.status,migration_034_usage_rows:fixtureProof.usage_rows,migration_041_internal:fixtureProof.is_internal},states:{canonical_baseline:{atoms:baseline.length,migration_040:baselineClassification.steps['040'].state},prerequisite_complete:{atoms:prerequisite.length,migration_040:prerequisiteClassification.steps['040'].state},one_atom_partial:{atom:changedAtom,refusal:partialReason},stray_r2:{migration:r2Files[0],atoms:strayR2.length,refusal:strayReason}}},null,2));
} finally {
  if(started) try{run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']);}catch{}
  rmSync(work,{recursive:true,force:true});
}
