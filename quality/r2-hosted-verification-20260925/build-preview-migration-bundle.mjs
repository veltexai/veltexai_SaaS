#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTIVE_BASELINE_FILE, activeBaseline } from './preview-baseline-active.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const migrations = [
  "20260925002000_r2_organization_tenancy.sql",
  "20260925003000_r2_claude_security_remediation.sql",
  "20260925004000_r2_second_security_remediation.sql",
  "20260925005000_r2_third_security_remediation.sql",
  "20260925006000_r2_cleanup_guard_ordering.sql",
];

function migrationBody(name) {
  const path = resolve(root, "supabase/migrations", name);
  const source = readFileSync(path, "utf8").trim();
  const beginMatches = source.match(/^begin;$/gim) ?? [];
  const commitMatches = source.match(/^commit;$/gim) ?? [];
  if (beginMatches.length !== 1 || commitMatches.length !== 1) {
    throw new Error(`${name} must contain exactly one BEGIN and one COMMIT`);
  }
  if (!/^begin;$/im.test(source) || !/commit;\s*$/i.test(source)) {
    throw new Error(`${name} has an unexpected transaction boundary`);
  }
  return source
    .replace(/^begin;\s*/im, "")
    .replace(/\s*commit;\s*$/i, "")
    .trim();
}

const bodies = migrations.map((name) => ({ name, body: migrationBody(name) }));
const migrationRecords = migrations.map((name) => ({
  version: name.slice(0, 14),
  name: name.replace(/^\d+_/, "").replace(/\.sql$/, ""),
}));
const prerequisiteVersions = [...new Set(
  readdirSync(resolve(root, "supabase/migrations"))
    .filter((name) => name.endsWith(".sql") && name < migrations[0])
    .map((name) => name.split("_")[0]),
)];
if (prerequisiteVersions.length !== activeBaseline.prerequisite_migration_count) {
  throw new Error(`active baseline expects ${activeBaseline.prerequisite_migration_count} prerequisite migrations, found ${prerequisiteVersions.length}`);
}
const expectedProfileCount = activeBaseline.profile_count;
const expectedProposalCount = activeBaseline.proposal_count;
const expectedProposalDigest = activeBaseline.proposal_content_sha256;
const sourceDigest = createHash("sha256")
  .update(bodies.map(({ name, body }) => `${name}\n${body}\n`).join(""))
  .digest("hex");

const sql = `-- GENERATED FILE: do not edit.
-- R2 isolated-preview atomic migration bundle.
-- Source SHA-256: ${sourceDigest}
-- Refuse production at the runner/UI selection layer before executing.
begin;

do $$
declare
  actual_profile_count bigint;
  actual_proposal_count bigint;
  actual_proposal_digest text;
begin
  if to_regclass('public.organizations') is not null then
    raise exception 'R2 preflight failed: public.organizations already exists';
  end if;
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = any (array[${migrationRecords.map(({ version }) => `'${version}'`).join(", ")}])
  ) then
    raise exception 'R2 preflight failed: one or more migration-history rows already exist';
  end if;
  if (
    select count(*)
    from supabase_migrations.schema_migrations
    where version = any (array[${prerequisiteVersions.map((version) => `'${version}'`).join(", ")}])
  ) <> ${prerequisiteVersions.length} then
    raise exception 'R2 preflight failed: committed pre-R2 migration history is incomplete';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> ${prerequisiteVersions.length}
     or exists (
       select 1 from supabase_migrations.schema_migrations
       where version <> all (array[${prerequisiteVersions.map((version) => `'${version}'`).join(", ")}])
     ) then
    raise exception 'R2 preflight failed: migration history is not the exact recorded 52-version prerequisite set';
  end if;
  if to_regclass('public.proposal_templates') is null
     or to_regclass('public.template_tier_access') is null
     or to_regprocedure('public.can_user_access_template(uuid,uuid)') is null then
    raise exception 'R2 preflight failed: repaired migration-029 objects are incomplete';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid = 'public.can_user_access_template(uuid,uuid)'::regprocedure
      and p.prosecdef
      and p.proconfig @> array['search_path=public']
  ) or position(
    'active-free-trial exception for Executive Premium'
    in coalesce(obj_description('public.can_user_access_template(uuid,uuid)'::regprocedure), '')
  ) = 0 then
    raise exception 'R2 preflight failed: post-040 template access hardening is absent';
  end if;

  select count(*) into actual_profile_count from public.profiles;
  select count(*) into actual_proposal_count from public.proposals;
  select encode(
    digest(
      coalesce(string_agg(id::text || ':' || coalesce(generated_content, ''), '|' order by id), ''),
      'sha256'
    ),
    'hex'
  ) into actual_proposal_digest
  from public.proposals;

  if actual_profile_count <> ${expectedProfileCount}
     or actual_proposal_count <> ${expectedProposalCount}
     or actual_proposal_digest <> '${expectedProposalDigest}' then
    raise exception 'R2 preflight failed: database does not match recorded isolated-preview baseline';
  end if;
end $$;

${bodies.map(({ name, body }, index) => {
  const { version, name: migrationName } = migrationRecords[index];
  return `-- BEGIN ${name}\n${body}\ninsert into supabase_migrations.schema_migrations (version, statements, name)\nvalues ('${version}', array[]::text[], '${migrationName}');\n-- END ${name}`;
}).join("\n\n")}

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
    where version = any (array[${migrationRecords.map(({ version }) => `'${version}'`).join(", ")}])
  ) <> ${migrationRecords.length} then
    raise exception 'R2 postcondition failed: migration-history rows missing';
  end if;
end $$;

commit;

select
  '${sourceDigest}'::text as source_sha256,
  (select count(*) from public.organizations) as organization_count,
  (select count(*) from public.organization_memberships) as membership_count,
  (select count(*) from public.profiles where active_organization_id is null) as null_active_organization_count;
`;

const output = process.argv[2] ?? resolve("/private/tmp", "veltex-r2-preview-atomic.sql");
writeFileSync(output, sql, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({
  output,
  sourceDigest,
  migrations,
  prerequisiteVersions,
  previewBaseline: {
    file: ACTIVE_BASELINE_FILE,
    projectRef: activeBaseline.project_ref,
    prerequisiteMigrationCount: activeBaseline.prerequisite_migration_count,
    profileCount: expectedProfileCount,
    proposalCount: expectedProposalCount,
    proposalDigest: expectedProposalDigest,
  },
}, null, 2));
