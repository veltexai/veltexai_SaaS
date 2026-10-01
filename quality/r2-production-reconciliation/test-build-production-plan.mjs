#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
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
let refused=false;
try { execFileSync(process.execPath,[resolve(root,'quality/r2-production-reconciliation/build-production-plan.mjs'),'/private/tmp/veltex-r2-production-plan-test-pending',resolve(root,'quality/r2-production-reconciliation/production-fingerprint.template.json')],{stdio:'pipe'}); } catch { refused=true; }
if(!refused) throw new Error('pending fingerprint unexpectedly built');
const versions=['031','032','033','034','035','036','037','038','039','040','041','20260908000000','20260913000000','20260922000000','20260922010000','20260924000000','20260924010000','20260924010500','20260924011000','20260924012000','20260924013000','20260925000000','20260925001000'];
template.captured_at='2026-09-30T00:00:00Z';
for(const key of Object.keys(template.content_digests)) template.content_digests[key]='0'.repeat(64);
template.steps=Object.fromEntries(versions.map((version,index)=>[version,{history:false,complete:index<5}]));
template.r2_absent=true;
template.review={status:'PASS',reviewer:'synthetic-test-only',reviewed_at:'2026-09-30T00:00:00Z'};
const fixture=resolve(temp,'reviewed.json'); writeFileSync(fixture,JSON.stringify(template));
const output='/private/tmp/veltex-r2-production-plan-test-reviewed';
execFileSync(process.execPath,[resolve(root,'quality/r2-production-reconciliation/build-production-plan.mjs'),output,fixture],{stdio:'pipe'});
execFileSync(process.execPath,[resolve(root,'quality/r2-production-reconciliation/validate-production-plan.mjs'),output],{cwd:root,stdio:'inherit'});
const manifest=JSON.parse(readFileSync(resolve(output,'manifest.json'),'utf8'));
if(manifest.steps.filter(s=>s.mode==='reconcile-history').length!==5) throw new Error('classification mismatch');
if(manifest.steps.filter(s=>s.mode==='apply').length!==27) throw new Error('apply classification mismatch');
console.log('G3 builder refusal/classification tests PASS');
