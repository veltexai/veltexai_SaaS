#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
const here=dirname(new URL(import.meta.url).pathname); const root=resolve(here,'../../..');
const migration=resolve(root,'supabase/migrations/20260925012000_revoke_client_maintain.sql');
const run=(f,a,o={})=>execFileSync(f,a,{encoding:'utf8',stdio:['ignore','pipe','pipe'],...o});
const pgBin=process.env.PG17_BIN||dirname(run('/usr/bin/which',['initdb']).trim());
const major=Number(run(resolve(pgBin,'postgres'),['--version']).match(/PostgreSQL\) (\d+)/)?.[1]);
if(major!==17){console.log(JSON.stringify({status:'PENDING',required:'PostgreSQL 17',detected:major||null,reason:'set PG17_BIN to execute the provider-aware MAINTAIN repair gate'}));process.exit(0);}
const work=mkdtempSync(resolve(tmpdir(),'veltex-pg17-maintain-')); const data=resolve(work,'data'); const port=Number(process.env.PG17_MAINTAIN_TEST_PORT||55447);
const psql=(args,{user,...options}={})=>run(resolve(pgBin,'psql'),['-X','-A','-t','-q','-v','ON_ERROR_STOP=1','-h',work,'-p',String(port),'-d','postgres',...(user?['-U',user]:[]),...args],options);
const rejected=(pattern,user)=>assert.throws(()=>psql(['-f',migration],user?{user}:{}),pattern);
let started=false;
try{
  run(resolve(pgBin,'initdb'),['-D',data,'-A','trust','-U','postgres']);
  run(resolve(pgBin,'pg_ctl'),['-D',data,'-o',`-p ${port} -k ${work} -c listen_addresses=''`,'-l',resolve(work,'postgres.log'),'start']);started=true;
  psql(['-c',`create role anon; create role authenticated; create role service_role; create role supabase_admin; create role other_owner; create role wrong_identity login; grant anon to service_role;
    create table public.before_repair(id integer); grant maintain on public.before_repair to public, anon, authenticated;
    alter default privileges for role postgres in schema public grant maintain on tables to anon, authenticated;
    alter default privileges for role supabase_admin in schema public grant maintain on tables to anon, authenticated;`]);
  psql(['-f',migration]); psql(['-f',migration]);
  psql(['-c','create table public.after_repair(id integer)']);
  assert.equal(psql(['-c',`select count(*) from pg_class c cross join pg_roles r where c.relnamespace='public'::regnamespace
    and c.relname in ('before_repair','after_repair') and r.rolname in ('anon','authenticated') and has_table_privilege(r.oid,c.oid,'MAINTAIN')`]).trim(),'0');

  psql(['-c','alter default privileges for role postgres grant maintain on tables to anon']);
  rejected(/unexpected MAINTAIN default ACL topology|outside the exact postgres\/provider policy/);
  psql(['-c','alter default privileges for role postgres revoke maintain on tables from anon']);

  psql(['-c','alter default privileges for role postgres in schema public grant maintain on tables to public']);
  rejected(/unexpected MAINTAIN default ACL topology|outside the exact postgres\/provider policy/);
  psql(['-c','alter default privileges for role postgres in schema public revoke maintain on tables from public']);

  psql(['-c',`alter default privileges for role supabase_admin in schema public revoke maintain on tables from anon;
    alter default privileges for role supabase_admin in schema public grant maintain on tables to anon with grant option`]);
  rejected(/unexpected MAINTAIN default ACL topology|outside the exact postgres\/provider policy/);
  psql(['-c',`alter default privileges for role supabase_admin in schema public revoke maintain on tables from anon;
    alter default privileges for role supabase_admin in schema public grant maintain on tables to anon`]);

  psql(['-c','alter default privileges for role other_owner in schema public grant maintain on tables to anon']);
  rejected(/unexpected MAINTAIN default ACL topology|outside the exact postgres\/provider policy/);
  psql(['-c','alter default privileges for role other_owner in schema public revoke maintain on tables from anon']);

  psql(['-c','create table public.provider_created(id integer); alter table public.provider_created owner to supabase_admin']);
  rejected(/not postgres-owned/); psql(['-c','drop table public.provider_created']);
  rejected(/requires current_user postgres/,'wrong_identity');
  console.log(JSON.stringify({status:'PASS',postgres_major:17,exact_provider_variance:true,idempotent:true,future_table_denied:true,global_public_grantable_other_owner_relation_identity_failures:true}));
} finally {if(started)try{run(resolve(pgBin,'pg_ctl'),['-D',data,'stop','-m','fast']);}catch{} rmSync(work,{recursive:true,force:true});}
