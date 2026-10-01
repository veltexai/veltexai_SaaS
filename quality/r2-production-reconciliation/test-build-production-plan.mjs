#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root=resolve(new URL('../..',import.meta.url).pathname);
const discovery=readFileSync(resolve(root,'quality/r2-production-reconciliation/00-read-only-production-fingerprint.sql'),'utf8');
if(!/begin transaction read only;/i.test(discovery)||!/^rollback;$/im.test(discovery)) throw new Error('discovery transaction is not explicitly read-only/rolled back');
const discoveryWithoutComments=discovery.replace(/--.*$/gm,'');
if(/\b(insert|update|delete|alter|create|drop|truncate|grant|revoke)\b/i.test(discoveryWithoutComments)) throw new Error('discovery SQL contains a mutation keyword');
for(const forbidden of ['recipient_email','client_email','contact_phone','access_notes']) if(discovery.includes(forbidden)) throw new Error(`discovery SQL names sensitive field ${forbidden}`);
if(/\btracking_id\b/.test(discovery)) throw new Error('discovery SQL selects the bearer tracking token');
const template=JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/production-fingerprint.template.json'),'utf8'));
const temp=mkdtempSync(resolve(tmpdir(),'veltex-g3-test-'));
const builder=resolve(root,'quality/r2-production-reconciliation/build-production-plan.mjs');
const validator=resolve(root,'quality/r2-production-reconciliation/validate-production-plan.mjs');
let refused=false;
try { execFileSync(process.execPath,[builder,'/private/tmp/veltex-r2-production-plan-test-pending',resolve(root,'quality/r2-production-reconciliation/production-fingerprint.template.json')],{stdio:'pipe'}); } catch { refused=true; }
if(!refused) throw new Error('pending fingerprint unexpectedly built');
const versions=['031','032','033','034','035','036','037','038','039','040','041','20260908000000','20260913000000','20260922000000','20260922010000','20260924000000','20260924010000','20260924010500','20260924011000','20260924012000','20260924013000','20260925000000','20260925001000'];
const r2Versions=['20260925002000','20260925003000','20260925004000','20260925005000','20260925006000','20260925007000','20260925008000','20260925009000','20260925010000','20260925011000'];
template.captured_at='2026-09-30T00:00:00Z';
template.baseline={state:'complete',atom_digest:'1'.repeat(64),expected_atom_count:100,matched_atom_count:100};
for(const key of Object.keys(template.content_digests)) template.content_digests[key]='0'.repeat(64);
template.steps=Object.fromEntries([
  ...versions.map((version,index)=>[version,{history:false,state:index<5?'complete':'absent',expected_atom_count:4,matched_atom_count:index<5?4:0}]),
  ...r2Versions.map(version=>[version,{history:false,state:'absent',expected_atom_count:4,matched_atom_count:0}])
]);
template.steps['040']={history:false,state:'absent',expected_atom_count:0,matched_atom_count:0};
template.r2_absent=true;
const fixture=resolve(temp,'reviewed.json'); writeFileSync(fixture,JSON.stringify(template));
const review=resolve(temp,'review.json');
writeFileSync(review,JSON.stringify({status:'PASS',reviewer:'synthetic-test-only',reviewed_at:'2026-09-30T00:00:00Z',fingerprint_sha256:createHash('sha256').update(readFileSync(fixture)).digest('hex')}));
const expectBuildRefusal=(name,mutate,{staleReview=false}={})=>{
  const candidate=structuredClone(template); mutate(candidate);
  const candidatePath=resolve(temp,`${name}.json`); writeFileSync(candidatePath,JSON.stringify(candidate));
  const candidateReview=resolve(temp,`${name}-review.json`);
  writeFileSync(candidateReview,JSON.stringify({status:'PASS',reviewer:'synthetic-test-only',reviewed_at:'2026-09-30T00:00:00Z',fingerprint_sha256:staleReview?'f'.repeat(64):createHash('sha256').update(readFileSync(candidatePath)).digest('hex')}));
  let rejected=false;
  try { execFileSync(process.execPath,[builder,`/private/tmp/veltex-r2-production-plan-${name}`,candidatePath,candidateReview],{stdio:'pipe'}); } catch { rejected=true; }
  if(!rejected) throw new Error(`${name} fingerprint unexpectedly built`);
};
expectBuildRefusal('wrong-project',fp=>{fp.project_ref='wrong-project';});
expectBuildRefusal('history-drift',fp=>{fp.migration_history.versions=fp.migration_history.versions.slice(1);fp.migration_history.count-=1;});
expectBuildRefusal('missing-digest',fp=>{delete fp.content_digests.profiles_all;});
expectBuildRefusal('r2-present',fp=>{fp.r2_absent=false;});
expectBuildRefusal('stale-review',()=>{},{staleReview:true});
expectBuildRefusal('baseline-unproven',fp=>{fp.baseline.state='partial';});
expectBuildRefusal('partial-step',fp=>{fp.steps['031'].state='partial';fp.steps['031'].matched_atom_count=2;});
expectBuildRefusal('r2-stray-object',fp=>{fp.steps['20260925002000'].state='partial';fp.steps['20260925002000'].matched_atom_count=1;});
expectBuildRefusal('040-false-equivalence',fp=>{fp.steps['040']={history:false,state:'superseded-equivalent',expected_atom_count:0,matched_atom_count:0,equivalence_proof:['20260908000000','20260924000000']};});
expectBuildRefusal('equivalence-on-other-version',fp=>{fp.steps['031']={history:false,state:'superseded-equivalent',expected_atom_count:0,matched_atom_count:0,equivalence_proof:['20260908000000','20260924000000']};});
const output='/private/tmp/veltex-r2-production-plan-test-reviewed';
execFileSync(process.execPath,[builder,output,fixture,review],{stdio:'pipe'});
execFileSync(process.execPath,[validator,output,fixture,review],{cwd:root,stdio:'inherit'});
const manifest=JSON.parse(readFileSync(resolve(output,'manifest.json'),'utf8'));
if(manifest.steps.filter(s=>s.mode==='reconcile-history').length!==5) throw new Error('classification mismatch');
if(manifest.steps.filter(s=>s.mode==='apply').length!==28) throw new Error('apply classification mismatch');
const equivalentTemplate=structuredClone(template);
equivalentTemplate.steps['040']={history:false,state:'superseded-equivalent',expected_atom_count:0,matched_atom_count:0,equivalence_proof:['20260908000000','20260924000000']};
for(const successor of ['20260908000000','20260924000000']) equivalentTemplate.steps[successor]={history:false,state:'complete',expected_atom_count:4,matched_atom_count:4};
const equivalentFixture=resolve(temp,'equivalent.json'); writeFileSync(equivalentFixture,JSON.stringify(equivalentTemplate));
const equivalentReview=resolve(temp,'equivalent-review.json'); writeFileSync(equivalentReview,JSON.stringify({status:'PASS',reviewer:'synthetic-test-only',reviewed_at:'2026-09-30T00:00:00Z',fingerprint_sha256:createHash('sha256').update(readFileSync(equivalentFixture)).digest('hex')}));
const equivalentOutput='/private/tmp/veltex-r2-production-plan-test-equivalent';
execFileSync(process.execPath,[builder,equivalentOutput,equivalentFixture,equivalentReview],{stdio:'pipe'});
execFileSync(process.execPath,[validator,equivalentOutput,equivalentFixture,equivalentReview],{cwd:root,stdio:'pipe'});
const equivalentManifest=JSON.parse(readFileSync(resolve(equivalentOutput,'manifest.json'),'utf8'));
if(equivalentManifest.steps.find(step=>step.version==='040')?.mode!=='reconcile-superseded-equivalent') throw new Error('migration 040 terminal-equivalence mode missing');
const forged=structuredClone(manifest); forged.steps[0].mode='apply';
const forgedText=JSON.stringify(forged,null,2)+'\n'; const forgedEncoded=Buffer.from(forgedText).toString('base64');
const forgedSql=`-- GENERATED G3 REVIEW ARTIFACT. UNARMED AND NON-EXECUTABLE.\n-- Target label: iwoaaljitifloolszxlu; identity still requires exact database fingerprint.\n-- Fingerprint SHA-256: ${forged.fingerprint_sha256}\n-- Manifest Base64 SHA-256: ${createHash('sha256').update(forgedEncoded).digest('hex')}\n-- No production authorization is encoded in this file.\n\ndo $$ begin raise exception 'UNARMED G3 ARTIFACT: G2, exact-artifact review, G4 and action-specific production authorization are required'; end $$;\n\n-- MANIFEST_BASE64:${forgedEncoded}\n`;
writeFileSync(resolve(output,'manifest.json'),forgedText); writeFileSync(resolve(output,'UNARMED-production-plan.sql'),forgedSql);
let forgedRejected=false;
try { execFileSync(process.execPath,[validator,output,fixture,review],{cwd:root,stdio:'pipe'}); } catch { forgedRejected=true; }
if(!forgedRejected) throw new Error('validator accepted a self-consistent forged manifest');
execFileSync(process.execPath,[builder,output,fixture,review],{stdio:'pipe'});
const sqlPath=resolve(output,'UNARMED-production-plan.sql');
writeFileSync(sqlPath,readFileSync(sqlPath,'utf8')+"drop table public.profiles;\n");
let tamperRejected=false;
try { execFileSync(process.execPath,[validator,output,fixture,review],{cwd:root,stdio:'pipe'}); } catch { tamperRejected=true; }
if(!tamperRejected) throw new Error('validator accepted SQL bytes after the unarmed artifact');
console.log('G3 builder refusal/classification tests PASS');
