import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'veltex-r34-preview-'));
const a = join(dir, 'a.sql');
const b = join(dir, 'b.sql');
const run = (output) => spawnSync(process.execPath,
  ['quality/r3-4-proposal-versions/build-preview-apply.mjs', output],
  { encoding: 'utf8' });
try {
  const first = run(a); const second = run(b);
  if (first.status !== 0 || second.status !== 0) throw new Error(first.stderr || second.stderr);
  const one = readFileSync(a); const two = readFileSync(b);
  if (!one.equals(two)) throw new Error('preview artifact is not deterministic');
  const sql = one.toString('utf8');
  const required = [
    'begin;', 'commit;', 'R3_4_PREVIEW_APPLY_PASS',
    'R3-4 preview history mismatch', 'protected R3 CRM content changed',
    'crm_proposal_versions', 'crm_proposal_version_commands',
    'command_crm_publish_proposal_version_internal', 'guard_crm_proposal_binding',
    'guard_crm_package_proposal_version_pointer',
    'source_sha256:86f438fe3a4516093534faf45d74bff4020dc68e9e40014f912e7152685678a3',
    "has_function_privilege('authenticated','public.command_crm_publish_proposal_version_internal",
    "not has_function_privilege('service_role','public.command_crm_publish_proposal_version_internal",
  ];
  for (const fragment of required) if (!sql.includes(fragment)) throw new Error(`missing ${fragment}`);
  if ((sql.match(/^begin;$/gmu) || []).length !== 1
      || (sql.match(/^commit;$/gmu) || []).length !== 1) {
    throw new Error('artifact must contain exactly one outer transaction');
  }
  if ((sql.match(/insert into supabase_migrations\.schema_migrations/g) || []).length !== 1) {
    throw new Error('artifact must write exactly one history row');
  }
  console.log(`R3-4 preview artifact deterministic: ${one.length} bytes ${createHash('sha256').update(one).digest('hex')}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
