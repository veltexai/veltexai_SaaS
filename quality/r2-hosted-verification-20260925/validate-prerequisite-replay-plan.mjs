#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

for (const step of manifest.steps) {
  const sql = readFileSync(resolve(outputDir, step.artifact), "utf8");
  const source = readFileSync(resolve("supabase/migrations", step.file), "utf8");
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
  if (sha256(source) !== step.sourceSha256) throw new Error(`${step.artifact} source hash does not match committed migration`);
  const bodyStartMarker = "-- EXACT MIGRATION BODY (transaction wrapper removed only).\n";
  const bodyStart = sql.indexOf(bodyStartMarker) + bodyStartMarker.length;
  const generatedBody = sql.slice(bodyStart, sql.indexOf("\n\n-- POSTCONDITION:", bodyStart));
  if (bodyStart < bodyStartMarker.length || generatedBody !== normalizedBody(source)) {
    throw new Error(`${step.artifact} body is not the exact committed migration body`);
  }
  validateAssertionIdentifiers(step.postconditions, source, step.artifact);
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

console.log("Prerequisite replay plan validation passed: 23 ordered, guarded steps.");
