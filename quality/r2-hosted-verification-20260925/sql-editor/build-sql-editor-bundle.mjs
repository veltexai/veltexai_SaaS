#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const fingerprint = readFileSync(resolve(here, '_pre_r2_fingerprint.fragment.sql'), 'utf8').trim();
const migrations = [
  '20260925002000_r2_organization_tenancy.sql',
  '20260925003000_r2_claude_security_remediation.sql',
  '20260925004000_r2_second_security_remediation.sql',
  '20260925005000_r2_third_security_remediation.sql',
  '20260925006000_r2_cleanup_guard_ordering.sql',
];

function migrationBody(name) {
  const source = readFileSync(resolve(root, 'supabase/migrations', name), 'utf8').trim();
  const beginMatches = source.match(/^begin;$/gim) ?? [];
  const commitMatches = source.match(/^commit;$/gim) ?? [];
  if (beginMatches.length !== 1 || commitMatches.length !== 1) {
    throw new Error(`${name} must contain exactly one BEGIN and one COMMIT`);
  }
  return source.replace(/^begin;\s*/im, '').replace(/\s*commit;\s*$/i, '').trim();
}

const bodies = migrations.map((name) => ({ name, body: migrationBody(name) }));
const migrationRecords = migrations.map((name) => ({
  version: name.slice(0, 14),
  name: name.replace(/^\d+_/, '').replace(/\.sql$/, ''),
}));
const sourceDigest = createHash('sha256')
  .update(bodies.map(({ name, body }) => `${name}\n${body}\n`).join(''))
  .digest('hex');

const sql = `-- GENERATED FILE: do not edit or commit.
-- SQL Editor variant of the guarded R2 preview atomic migration bundle.
-- Existing psql bundle builder remains authoritative.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- Identity is the recorded isolated-preview fingerprint, not a pasted ref.
-- Recorded preview name (not a database proof): wcnfhriosemgchmtwgof
-- Production ref warning is defense in depth only: iwoaaljitifloolszxlu
-- Baseline digest: b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f
-- Source SHA-256: ${sourceDigest}

${fingerprint}

begin;

do $$
begin
  if to_regclass('public.organizations') is not null then
    raise exception 'R2 preflight failed: public.organizations already exists';
  end if;
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = any (array[${migrationRecords.map(({ version }) => `'${version}'`).join(', ')}])
  ) then
    raise exception 'R2 preflight failed: one or more migration-history rows already exist';
  end if;
end $$;

${bodies.map(({ name, body }, index) => {
  const { version, name: migrationName } = migrationRecords[index];
  return `-- BEGIN ${name}\n${body}\ninsert into supabase_migrations.schema_migrations (version, statements, name)\nvalues ('${version}', array[]::text[], '${migrationName}');\n-- END ${name}`;
}).join('\n\n')}

do $$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null
     or to_regclass('public.organization_audit_log') is null
     or to_regclass('public.organization_event_outbox') is null
     or to_regclass('public.organization_event_inbox') is null then
    raise exception 'R2 postcondition failed: required organization tables missing';
  end if;
  if to_regprocedure('public.guard_organization_membership()') is null
     or to_regprocedure('public.guard_active_organization()') is null
     or to_regprocedure('public.read_tracked_proposal(text)') is null then
    raise exception 'R2 postcondition failed: required guards/RPC missing';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.active_organization_id is null
       or not exists (
         select 1 from public.organization_memberships m
         where m.user_id = p.id
           and m.organization_id = p.active_organization_id
       )
  ) then
    raise exception 'R2 postcondition failed: profile backfill/orphan mismatch';
  end if;
  if (
    select count(*)
    from supabase_migrations.schema_migrations
    where version = any (array[${migrationRecords.map(({ version }) => `'${version}'`).join(', ')}])
  ) <> ${migrationRecords.length} then
    raise exception 'R2 postcondition failed: migration-history rows missing';
  end if;
end $$;

commit;

select
  'sql_editor_r2_migration_bundle' as evidence_key,
  '${sourceDigest}'::text as source_sha256,
  (select count(*) from public.organizations) as organization_count,
  (select count(*) from public.organization_memberships) as membership_count,
  (select count(*) from public.profiles where active_organization_id is null) as null_active_organization_count;
`;

const output = process.argv[2] ?? resolve('/private/tmp', 'veltex-r2-sql-editor-atomic.sql');
writeFileSync(output, sql, { encoding: 'utf8', mode: 0o600 });
console.log(JSON.stringify({ output, sourceDigest, migrations, status: 'PREPARED / NOT HOSTED-EXECUTED' }, null, 2));
