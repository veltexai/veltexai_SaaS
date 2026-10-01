#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const root=resolve(dirname(new URL(import.meta.url).pathname),'../..');
const dir=resolve(process.argv[2]??'/private/tmp/veltex-r2-production-plan');
const manifest=JSON.parse(readFileSync(resolve(dir,'manifest.json'),'utf8'));
const manifestText=readFileSync(resolve(dir,'manifest.json'),'utf8');
const sql=readFileSync(resolve(dir,'UNARMED-production-plan.sql'),'utf8');
const reviewedSourceHashes=JSON.parse(readFileSync(resolve(root,'quality/r2-production-reconciliation/reviewed-source-sha256.json'),'utf8'));
const exactFiles=Object.keys(reviewedSourceHashes);
if(manifest.contract_version!==2||manifest.target!=='production iwoaaljitifloolszxlu'||manifest.productionAuthorized!==false||manifest.armed!==false) throw new Error('manifest safety contract failed');
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
  if(!['verify-recorded','reconcile-history','apply'].includes(step.mode)) throw new Error(`invalid mode: ${step.file}`);
}
console.log(`G3 unarmed plan validated: ${manifest.steps.length} independently pinned steps; production mutation impossible`);
