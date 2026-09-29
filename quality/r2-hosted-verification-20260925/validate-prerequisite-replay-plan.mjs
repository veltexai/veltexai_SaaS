#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const outputDir = resolve("/private/tmp/veltex-r2-prerequisite-replay-validation");
execFileSync(process.execPath, [resolve("quality/r2-hosted-verification-20260925/build-prerequisite-replay-plan.mjs"), outputDir], { stdio: "pipe" });
const manifest = JSON.parse(readFileSync(resolve(outputDir, "manifest.json"), "utf8"));

if (manifest.steps.length !== 23) throw new Error("Expected exactly 23 replay steps");
if (manifest.steps[3].file !== "034_free_trial_no_credit_card.sql") throw new Error("Canonical 034 is not step 4");
if (new Set(manifest.steps.map((step) => step.version)).size !== 23) throw new Error("Replay versions are not unique");

const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const normalizedBody = (source) => {
  const begins = source.match(/^\s*begin\s*;\s*$/gim) ?? [];
  if (begins.length === 0) return source.trim();
  return source.replace(/^\s*begin\s*;\s*$/im, "").replace(/^\s*commit\s*;\s*$/im, "").trim();
};
const splitTransactionMigration = "20260913000000_commercial_quick_weekly_frequencies.sql";
// The earlier draft invented this table name. The two funnel view names are
// intentionally not banned: they are created verbatim by migrations 039/041.
const forbiddenIdentifiers = ["addon_services"];

function validateAssertionIdentifiers(postconditions, source, artifact) {
  for (const wrong of forbiddenIdentifiers) {
    if (postconditions.some((check) => check.includes(wrong))) {
      throw new Error(`${artifact} contains rejected assertion identifier ${wrong}`);
    }
  }
  const sourceLower = source.toLowerCase();
  const assertionText = postconditions.join(" ");
  const assertedObjects = [...assertionText.matchAll(/public\.([a-z][a-z0-9_]*)/g)].map((match) => match[1]);
  const assertedNames = [...assertionText.matchAll(/(?:table_name|tablename|column_name|conname|policyname|tgname|dataset_key|market_code|dataset_version)='([^']+)'/g)].map((match) => match[1]);
  for (const identifier of new Set([...assertedObjects, ...assertedNames])) {
    if (!sourceLower.includes(identifier.toLowerCase())) {
      throw new Error(`${artifact} asserts identifier absent from its committed migration: ${identifier}`);
    }
  }
}

function validateSafetyStructure(sql, step) {
  const preconditionStructures = [
    /if to_regclass\('public\.profiles'\) is null\s+or to_regclass\('public\.proposals'\) is null\s+or to_regclass\('supabase_migrations\.schema_migrations'\) is null then/,
    /if to_regclass\('public\.organizations'\) is not null then/,
    /if exists \(select 1 from public\.profiles\) or exists \(select 1 from public\.proposals\) then/,
    /if actual_history <> \d+ then/,
    /if \(select count\(\*\) from supabase_migrations\.schema_migrations where version = any\(array\[/,
    /if exists \(select 1 from supabase_migrations\.schema_migrations where version = any\(array\[/,
  ];
  const requiredStructures = [
    /-- POSTCONDITION:[\s\S]*?if not \(/,
    /if exists \(select 1 from supabase_migrations\.schema_migrations where version='[^']+'\) then/,
  ];
  for (const required of requiredStructures) {
    if (!required.test(sql)) {
      throw new Error(`${step.artifact} has a missing or disabled executable safety guard: ${required}`);
    }
  }
  const preconditionCount = (sql.match(/-- PRECONDITION: exact prior history, empty preview data, no R2 schema\./g) ?? []).length;
  const expectedPreconditions = step.preservesSplitTransaction ? 2 : 1;
  if (preconditionCount !== expectedPreconditions) {
    throw new Error(`${step.artifact} expected ${expectedPreconditions} executable precondition block(s), found ${preconditionCount}`);
  }
  const marker = "-- PRECONDITION: exact prior history, empty preview data, no R2 schema.";
  let from = 0;
  for (let occurrence = 1; occurrence <= expectedPreconditions; occurrence += 1) {
    const start = sql.indexOf(marker, from);
    const next = sql.indexOf(marker, start + marker.length);
    const endMarker = occurrence === expectedPreconditions ? "-- POSTCONDITION:" : marker;
    const end = occurrence === expectedPreconditions ? sql.indexOf(endMarker, start) : next;
    const block = sql.slice(start, end);
    for (const required of preconditionStructures) {
      if (!required.test(block)) {
        throw new Error(`${step.artifact} precondition ${occurrence} has a missing or disabled executable guard: ${required}`);
      }
    }
    from = start + marker.length;
  }
}

for (const step of manifest.steps) {
  const sql = readFileSync(resolve(outputDir, step.artifact), "utf8");
  const source = readFileSync(resolve("supabase/migrations", step.file), "utf8");
  if (!sql.includes(`-- ${manifest.target.replace("isolated", "Isolated")} only; production is not authorized.`)) {
    throw new Error(`${step.artifact} target header does not match the manifest`);
  }
  const postcondition = sql.indexOf("-- POSTCONDITION:");
  const history = sql.indexOf("-- HISTORY IS RECORDED ONLY AFTER THE POSTCONDITION SUCCEEDS.");
  const historyInsert = sql.indexOf("insert into supabase_migrations.schema_migrations", history);
  if (postcondition < 0 || history < 0 || history < postcondition) {
    throw new Error(`${step.artifact} records history before its postcondition`);
  }
  if (historyInsert < history) throw new Error(`${step.artifact} is missing its postcondition-gated history insert`);
  if (!sql.includes("preview application data is not empty") || !sql.includes("production is not authorized")) {
    throw new Error(`${step.artifact} is missing preview safety guards`);
  }
  validateSafetyStructure(sql, step);
  if (sha256(source) !== step.sourceSha256) throw new Error(`${step.artifact} source hash does not match committed migration`);
  const bodyStartMarker = step.preservesSplitTransaction
    ? "-- EXACT RAW MIGRATION SOURCE (internal transaction split preserved).\n"
    : "-- EXACT MIGRATION BODY (outer transaction wrapper removed only).\n";
  const bodyStart = sql.indexOf(bodyStartMarker) + bodyStartMarker.length;
  const bodyEnd = step.preservesSplitTransaction
    ? sql.lastIndexOf("\n\nbegin;", postcondition)
    : sql.indexOf("\n\n-- POSTCONDITION:", bodyStart);
  const generatedBody = sql.slice(bodyStart, bodyEnd);
  const expectedBody = step.preservesSplitTransaction ? source.trim() : normalizedBody(source);
  if (bodyStart < bodyStartMarker.length || generatedBody !== expectedBody) {
    throw new Error(`${step.artifact} body is not the exact committed migration body`);
  }
  if (step.preservesSplitTransaction !== (step.file === splitTransactionMigration)) {
    throw new Error(`${step.artifact} has an incorrect split-transaction manifest flag`);
  }
  if (step.preservesSplitTransaction) {
    const sourceLower = source.toLowerCase();
    const preconditionCommit = sql.lastIndexOf("commit;", bodyStart);
    const rawBegin = bodyStart + sourceLower.indexOf("begin;");
    const rawCommit = bodyStart + sourceLower.indexOf("commit;");
    const rawValidate = bodyStart + sourceLower.indexOf("validate constraint");
    const repeatedPrecondition = sql.indexOf("-- PRECONDITION: exact prior history, empty preview data, no R2 schema.", rawValidate);
    const postconditionBegin = sql.lastIndexOf("begin;", postcondition);
    if (!(preconditionCommit < bodyStart && bodyStart < rawBegin && rawBegin < rawCommit
        && rawCommit < rawValidate && rawValidate < postconditionBegin
        && postconditionBegin < repeatedPrecondition && repeatedPrecondition < postcondition)) {
      throw new Error(`${step.artifact} does not preserve precondition/raw split/postcondition ordering`);
    }
  }
  validateAssertionIdentifiers(step.postconditions, source, step.artifact);
}

// Mutations must disable real SQL predicates, not merely change the nearby
// error text. Each mutated artifact must be rejected structurally.
const firstStep = manifest.steps[0];
const firstSql = readFileSync(resolve(outputDir, firstStep.artifact), "utf8");
const assertMutationRejected = (original, mutated, step, label) => {
  if (mutated === original) throw new Error(`Mutation fixture did not match: ${label}`);
  let rejected = false;
  try {
    validateSafetyStructure(mutated, step);
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`Executable safety-guard mutation unexpectedly passed: ${label}`);
};
for (const [needle, replacement] of [
  ["if to_regclass('public.profiles') is null", "if false and to_regclass('public.profiles') is null"],
  ["if to_regclass('public.organizations') is not null then", "if false and to_regclass('public.organizations') is not null then"],
  ["if exists (select 1 from public.profiles) or exists (select 1 from public.proposals) then", "if false then"],
  [`if actual_history <> ${firstStep.requiredBefore.length} then`, "if false then"],
  ["if (select count(*) from supabase_migrations.schema_migrations where version = any(array[", "if false and (select count(*) from supabase_migrations.schema_migrations where version = any(array["],
  ["if exists (select 1 from supabase_migrations.schema_migrations where version = any(array[", "if false and exists (select 1 from supabase_migrations.schema_migrations where version = any(array["],
  ["if not (", "if false and not ("],
  [`if exists (select 1 from supabase_migrations.schema_migrations where version='${firstStep.version}') then`, "if false then"],
]) {
  const mutated = firstSql.replace(needle, replacement);
  assertMutationRejected(firstSql, mutated, firstStep, needle);
}

// The split-transaction step repeats the entire precondition. Mutating either
// copy independently must fail so the second copy cannot mask a disabled first
// guard (or vice versa).
const splitStep = manifest.steps.find((step) => step.preservesSplitTransaction);
const splitSql = readFileSync(resolve(outputDir, splitStep.artifact), "utf8");
const splitNeedle = "if to_regclass('public.organizations') is not null then";
const firstSplitIndex = splitSql.indexOf(splitNeedle);
const secondSplitIndex = splitSql.indexOf(splitNeedle, firstSplitIndex + splitNeedle.length);
for (const [label, index] of [["split first precondition", firstSplitIndex], ["split repeated precondition", secondSplitIndex]]) {
  if (index < 0) throw new Error(`Mutation fixture did not match: ${label}`);
  const replacement = "if false and to_regclass('public.organizations') is not null then";
  const mutated = `${splitSql.slice(0, index)}${replacement}${splitSql.slice(index + splitNeedle.length)}`;
  assertMutationRejected(splitSql, mutated, splitStep, label);
}

// Mutation checks prove the validator rejects both the prior invented table
// and a plausible-but-wrong object that is absent from the committed source.
for (const mutation of [
  "to_regclass('public.addon_services') is not null",
  "to_regclass('public.uncommitted_funnel_view') is not null",
]) {
  let rejected = false;
  try {
    validateAssertionIdentifiers([mutation], readFileSync(resolve("supabase/migrations/031_enhance_addon_catalog.sql"), "utf8"), "mutation-test");
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`Validator mutation test unexpectedly accepted: ${mutation}`);
}

// Recursive cleanup must never accept a path outside one dedicated /private/tmp
// directory or replace a directory containing anything not in its manifest.
for (const unsafePath of [
  "/private/tmp/not-veltex-replay",
  "/private/tmp/veltex-r2-prerequisite-replay-unsafe/nested",
  "/private/tmp/veltex-r2-prerequisite-replay-../escape",
]) {
  let rejected = false;
  try {
    execFileSync(process.execPath, [resolve("quality/r2-hosted-verification-20260925/build-prerequisite-replay-plan.mjs"), unsafePath], { stdio: "pipe" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error(`Unsafe output path unexpectedly accepted: ${unsafePath}`);
}

const contaminatedDir = "/private/tmp/veltex-r2-prerequisite-replay-contaminated-test";
rmSync(contaminatedDir, { recursive: true, force: true });
mkdirSync(contaminatedDir, { recursive: true });
writeFileSync(resolve(contaminatedDir, "manifest.json"), JSON.stringify({ target: "isolated preview ynzkwctwlssjcsjmahey", productionAuthorized: false, steps: [] }));
writeFileSync(resolve(contaminatedDir, "user-file.txt"), "must survive");
let contaminatedRejected = false;
try {
  execFileSync(process.execPath, [resolve("quality/r2-hosted-verification-20260925/build-prerequisite-replay-plan.mjs"), contaminatedDir], { stdio: "pipe" });
} catch {
  contaminatedRejected = true;
}
if (!contaminatedRejected || readFileSync(resolve(contaminatedDir, "user-file.txt"), "utf8") !== "must survive") {
  throw new Error("Contaminated output directory was not rejected intact");
}
rmSync(contaminatedDir, { recursive: true, force: true });
rmSync(outputDir, { recursive: true, force: true });

console.log("Prerequisite replay plan validation passed: 23 ordered, guarded steps.");
