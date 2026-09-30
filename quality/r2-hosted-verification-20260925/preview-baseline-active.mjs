import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ACTIVE_BASELINE_FILE = 'preview-baseline-ynzkwctwlssjcsjmahey-20260930.json';
export const activeBaseline = JSON.parse(
  readFileSync(resolve(here, ACTIVE_BASELINE_FILE), 'utf8'),
);

const required = {
  project_ref: 'ynzkwctwlssjcsjmahey',
  prerequisite_migration_count: 52,
  profile_count: 0,
  proposal_count: 0,
  proposal_content_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  organizations_table: null,
  membership_guard: null,
  proposal_templates_table: 'present',
  template_tier_access_table: 'present',
  hardened_template_access_function: 'present',
  r2_migration_history_rows: 0,
  production_touched: false,
};

for (const [key, expected] of Object.entries(required)) {
  if (activeBaseline[key] !== expected) {
    throw new Error(`active preview baseline ${key} must equal ${JSON.stringify(expected)}`);
  }
}
