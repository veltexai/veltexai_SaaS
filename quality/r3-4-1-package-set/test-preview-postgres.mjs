#!/usr/bin/env node

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const migrationsDir = resolve(root, 'supabase/migrations');
const pgBin = process.env.PG_BIN || dirname(execFileSync('/usr/bin/which', ['initdb'], { encoding: 'utf8' }).trim());
const work = mkdtempSync(resolve(tmpdir(), 'veltex-r341-preview-artifact-'));
const data = resolve(work, 'data');
const port = Number(process.env.R3_4_1_PREVIEW_PGPORT || 56800 + (process.pid % 300));
const run = (file, args) => execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
const psql = (args) => run(resolve(pgBin, 'psql'), ['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h',work,'-p',String(port),'-d','veltex_r341_preview',...args]);
let started = false;
try {
  run(resolve(pgBin, 'initdb'), ['-D',data,'-A','trust','-U',process.env.USER || 'postgres']);
  run(resolve(pgBin, 'pg_ctl'), ['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']);
  started = true;
  run(resolve(pgBin, 'createdb'), ['-h',work,'-p',String(port),'veltex_r341_preview']);
  psql(['-f',resolve(root,'quality/service-catalog-round4/db-harness/sql/00_supabase_shim.sql')]);
  psql(['-c',`create schema supabase_migrations; create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`]);
  const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  assert.equal(migrations.length,70);
  for (const migration of migrations.slice(0,-1)) {
    psql(['-f',resolve(migrationsDir,migration)]);
    const version = migration.split('_')[0];
    const name = migration.replace(/^[0-9]+_/,'').replace(/\.sql$/,'').replaceAll("'","''");
    psql(['-c',`insert into supabase_migrations.schema_migrations values('${version}','${name}',array[]::text[])`]);
  }
  const output = psql(['-f','/private/tmp/veltex-r3-4-1-preview-apply.sql']);
  assert.match(output,/R3_4_1_PREVIEW_APPLY_PASS\|70\|0\|0/);
  const proof = psql(['-c',`select count(*)||'|'||count(*) filter(where version='20261006000000') from supabase_migrations.schema_migrations`]).trim();
  assert.equal(proof,'70|1');
  console.log('R3-4.1 exact guarded Preview artifact disposable PostgreSQL PASS');
} finally {
  if (started) try { run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']); } catch {}
  rmSync(work,{recursive:true,force:true});
}
