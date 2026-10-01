#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const dir=resolve(process.argv[2]??'/private/tmp/veltex-r2-production-plan');
const manifest=JSON.parse(readFileSync(resolve(dir,'manifest.json'),'utf8'));
const sql=readFileSync(resolve(dir,'UNARMED-production-plan.sql'),'utf8');
if(manifest.target!=='production iwoaaljitifloolszxlu'||manifest.productionAuthorized!==false||manifest.armed!==false) throw new Error('manifest safety contract failed');
if(manifest.steps.length!==32) throw new Error(`expected 32 steps, got ${manifest.steps.length}`);
if(!sql.includes("raise exception 'UNARMED G3 ARTIFACT")) throw new Error('unarmed refusal missing');
if(/\b(commit|insert|update|delete|alter|create|drop|truncate)\b/i.test(sql.replace(/\/\*[\s\S]*\*\//g,''))) throw new Error('unarmed SQL contains mutation outside its manifest comment');
for(const step of manifest.steps){
  const source=readFileSync(resolve('supabase/migrations',step.file),'utf8');
  const digest=createHash('sha256').update(source).digest('hex');
  if(digest!==step.source_sha256) throw new Error(`source drift: ${step.file}`);
  if(!['verify-recorded','reconcile-history','apply'].includes(step.mode)) throw new Error(`invalid mode: ${step.file}`);
}
console.log(`G3 unarmed plan validated: ${manifest.steps.length} source-pinned steps; production mutation impossible`);

