import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationsDir = path.join(root, "supabase/migrations");
const archiveDir = path.join(root, "supabase/migrations_archive");

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const versions = new Map();
for (const file of files) {
  const version = file.split("_", 1)[0];
  const entries = versions.get(version) ?? [];
  entries.push(file);
  versions.set(version, entries);
}

const duplicates = [...versions.entries()].filter(([, entries]) => entries.length > 1);
if (duplicates.length > 0) {
  throw new Error(
    `Duplicate executable migration versions:\n${duplicates
      .map(([version, entries]) => `- ${version}: ${entries.join(", ")}`)
      .join("\n")}`,
  );
}

const canonical034 = "034_free_trial_no_credit_card.sql";
if (!files.includes(canonical034)) {
  throw new Error(`Canonical migration missing: ${canonical034}`);
}

const archived034 = path.join(archiveDir, "034_fix_trial_display_after_proposals_exhausted.sql");
const archivedBody = await readFile(archived034);
const archivedChecksum = createHash("sha256").update(archivedBody).digest("hex");
const expectedChecksum = "874732f2e5a8cdd5b3e0c3e482c91330cbf60da523e2a0b3f64d2e1fa35b3f09";

if (archivedChecksum !== expectedChecksum) {
  throw new Error(
    `Archived 034 checksum changed: expected ${expectedChecksum}, received ${archivedChecksum}`,
  );
}

console.log(`Migration chain validation passed: ${files.length} unique executable versions.`);
