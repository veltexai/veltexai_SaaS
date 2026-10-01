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
template.captured_at='2026-09-30T00:00:00Z';
for(const key of Object.keys(template.content_digests)) template.content_digests[key]='0'.repeat(64);
template.steps=Object.fromEntries(versions.map((version,index)=>[version,{history:false,complete:index<5}]));
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
expectBuildRefusal('missing-digest',fp=>{delete fp.content_digests.profiles_identity;});
expectBuildRefusal('r2-present',fp=>{fp.r2_absent=false;});
expectBuildRefusal('stale-review',()=>{},{staleReview:true});
const output='/private/tmp/veltex-r2-production-plan-test-reviewed';
execFileSync(process.execPath,[builder,output,fixture,review],{stdio:'pipe'});
execFileSync(process.execPath,[validator,output],{cwd:root,stdio:'inherit'});
const manifest=JSON.parse(readFileSync(resolve(output,'manifest.json'),'utf8'));
if(manifest.steps.filter(s=>s.mode==='reconcile-history').length!==5) throw new Error('classification mismatch');
if(manifest.steps.filter(s=>s.mode==='apply').length!==28) throw new Error('apply classification mismatch');
const sqlPath=resolve(output,'UNARMED-production-plan.sql');
writeFileSync(sqlPath,readFileSync(sqlPath,'utf8')+"drop table public.profiles;\n");
let tamperRejected=false;
try { execFileSync(process.execPath,[validator,output],{cwd:root,stdio:'pipe'}); } catch { tamperRejected=true; }
if(!tamperRejected) throw new Error('validator accepted SQL bytes after the unarmed artifact');
console.log('G3 builder refusal/classification tests PASS');
