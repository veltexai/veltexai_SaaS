#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const migrationsDir = resolve(root, "supabase/migrations");
const firstReplayVersion = "031";
const firstR2Version = "20260925002000";

const allMigrations = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const versionOf = (name) => name.split("_", 1)[0];
const nameOf = (name) => name.replace(/^\d+_/, "").replace(/\.sql$/, "");

const existingVersions = allMigrations
  .filter((name) => name < `${firstReplayVersion}_` || versionOf(name) === "20250901194222")
  .map(versionOf);
const replayMigrations = allMigrations.filter((name) => {
  const version = versionOf(name);
  return name >= `${firstReplayVersion}_`
    && name < `${firstR2Version}_`
    && version !== "20250901194222";
});
const replayVersions = replayMigrations.map(versionOf);

if (new Set(allMigrations.map(versionOf)).size !== allMigrations.length) {
  throw new Error("Executable migration versions must be unique before building a replay bundle");
}
if (existingVersions.length !== 29 || replayVersions.length !== 23) {
  throw new Error(`Unexpected preview chain partition: ${existingVersions.length} existing, ${replayVersions.length} replay`);
}
if (!replayMigrations.includes("034_free_trial_no_credit_card.sql")) {
  throw new Error("Canonical 034 migration is absent from the replay chain");
}

function bodyOf(name) {
  const source = readFileSync(resolve(migrationsDir, name), "utf8").trim();
  const begins = source.match(/^\s*begin\s*;\s*$/gim) ?? [];
  const commits = source.match(/^\s*commit\s*;\s*$/gim) ?? [];
  if (begins.length !== commits.length || begins.length > 1) {
    throw new Error(`${name} has unsupported transaction boundaries`);
  }
  if (begins.length === 0) return source;
  return source
    .replace(/^\s*begin\s*;\s*$/im, "")
    .replace(/^\s*commit\s*;\s*$/im, "")
    .trim();
}

const bodies = replayMigrations.map((file) => ({ file, body: bodyOf(file) }));
const sourceDigest = createHash("sha256")
  .update(bodies.map(({ file, body }) => `${file}\n${body}\n`).join(""))
  .digest("hex");
const sqlList = (values) => values.map((value) => `'${value}'`).join(", ");

const sql = `-- GENERATED FILE: do not edit or commit.
-- Fresh isolated-preview prerequisite replay for R2.
-- Production is not an authorized target.
-- Expected preview: ynzkwctwlssjcsjmahey (operator-selection warning only).
-- Source SHA-256: ${sourceDigest}

begin;

do $$
declare
  actual_existing integer;
  actual_replay integer;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.proposals') is null
     or to_regclass('supabase_migrations.schema_migrations') is null then
    raise exception 'Prerequisite replay refused: required baseline objects are absent';
  end if;
  if to_regclass('public.organizations') is not null then
    raise exception 'Prerequisite replay refused: R2 is already present';
  end if;
  if exists (select 1 from public.profiles) or exists (select 1 from public.proposals) then
    raise exception 'Prerequisite replay refused: fresh preview is not empty';
  end if;

  select count(*) into actual_existing
  from supabase_migrations.schema_migrations
  where version = any (array[${sqlList(existingVersions)}]);
  select count(*) into actual_replay
  from supabase_migrations.schema_migrations
  where version = any (array[${sqlList(replayVersions)}]);

  if actual_existing <> ${existingVersions.length} then
    raise exception 'Prerequisite replay refused: expected 29 baseline history rows, found %', actual_existing;
  end if;
  if actual_replay <> 0 then
    raise exception 'Prerequisite replay refused: one or more replay versions already exist';
  end if;
end $$;

${bodies.map(({ file, body }) => {
  const version = versionOf(file);
  return `-- BEGIN ${file}\n${body}\ninsert into supabase_migrations.schema_migrations (version, statements, name)\nvalues ('${version}', array[]::text[], '${nameOf(file)}');\n-- END ${file}`;
}).join("\n\n")}

do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations
      where version = any (array[${sqlList(replayVersions)}])) <> ${replayVersions.length} then
    raise exception 'Prerequisite replay postcondition failed: history rows are incomplete';
  end if;
  if to_regclass('public.location_pricing_markets') is null
     or to_regclass('public.location_pricing_service_rates') is null then
    raise exception 'Prerequisite replay postcondition failed: location-pricing tables are absent';
  end if;
  if to_regprocedure('public.can_user_access_template(uuid,uuid)') is null
     or to_regprocedure('public.get_user_accessible_templates(uuid)') is null then
    raise exception 'Prerequisite replay postcondition failed: hardened template functions are absent';
  end if;
end $$;

commit;

select
  'fresh_preview_prerequisite_replay' as evidence_key,
  '${sourceDigest}'::text as source_sha256,
  (select count(*) from supabase_migrations.schema_migrations
   where version = any (array[${sqlList(replayVersions)}])) as replayed_history_rows;
`;

const output = process.argv[2] ?? resolve("/private/tmp", "veltex-r2-prerequisite-replay.sql");
writeFileSync(output, sql, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({
  output,
  sourceDigest,
  existingVersions,
  replayMigrations,
  status: "PREPARED / NOT HOSTED-EXECUTED",
}, null, 2));
