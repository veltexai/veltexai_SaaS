import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'veltex-r33-preview-'));
const a = join(dir, 'a.sql');
const b = join(dir, 'b.sql');
const run = (output) => spawnSync(process.execPath,
  ['quality/r3-3-estimate-linkage/build-preview-apply.mjs', output],
  { encoding: 'utf8' });
try {
  const first = run(a); const second = run(b);
  if (first.status !== 0 || second.status !== 0) throw new Error(first.stderr || second.stderr);
  const one = readFileSync(a); const two = readFileSync(b);
  if (!one.equals(two)) throw new Error('preview artifact is not deterministic');
  const sql = one.toString('utf8');
  const required = [
    'begin;', 'commit;', 'R3_3_PREVIEW_APPLY_PASS',
    'R3-3 preview history mismatch', 'protected CRM table changed',
    'crm_estimate_runs', 'crm_estimate_run_commands',
    'command_crm_estimate_run_internal', 'guard_crm_estimate_selection',
    'source_sha256:a6bd7e47ee1fb2747af523a6bb281390b05939290d5e0ea8ec4c953fabf312d8',
    "has_function_privilege('authenticated','public.command_crm_estimate_run_internal",
    "not has_function_privilege('service_role','public.command_crm_estimate_run_internal",
  ];
  for (const fragment of required) if (!sql.includes(fragment)) throw new Error(`missing ${fragment}`);
  if ((sql.match(/^begin;$/gmu) || []).length !== 1
      || (sql.match(/^commit;$/gmu) || []).length !== 1) {
    throw new Error('artifact must contain exactly one outer transaction');
  }
  if ((sql.match(/insert into supabase_migrations\.schema_migrations/g) || []).length !== 1) {
    throw new Error('artifact must write exactly one history row');
  }
  console.log(`R3-3 preview artifact deterministic: ${one.length} bytes ${createHash('sha256').update(one).digest('hex')}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
