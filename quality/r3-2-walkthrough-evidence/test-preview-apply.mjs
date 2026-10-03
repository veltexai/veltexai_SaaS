import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'veltex-r32-preview-'));
const a = join(dir, 'a.sql');
const b = join(dir, 'b.sql');
const run = (output) => spawnSync(process.execPath,
  ['quality/r3-2-walkthrough-evidence/build-preview-apply.mjs', output],
  { encoding: 'utf8' });
try {
  const first = run(a); const second = run(b);
  if (first.status !== 0 || second.status !== 0) throw new Error(first.stderr || second.stderr);
  const one = readFileSync(a); const two = readFileSync(b);
  if (!one.equals(two)) throw new Error('preview artifact is not deterministic');
  const sql = one.toString('utf8');
  const required = [
    'begin;', 'commit;', 'R3_2_PREVIEW_APPLY_PASS',
    'R3-2 preview history mismatch', 'protected CRM table changed',
    'crm_walkthrough_evidence_commands', 'command_crm_walkthrough_evidence',
    'source_sha256:561ffe46d1039d8a7691e537a6af63a72142f6a3afc448f4dc58d78d0e0db59b',
  ];
  for (const fragment of required) if (!sql.includes(fragment)) throw new Error(`missing ${fragment}`);
  if ((sql.match(/^begin;$/gmu) || []).length !== 1
      || (sql.match(/^commit;$/gmu) || []).length !== 1) {
    throw new Error('artifact must contain exactly one outer transaction');
  }
  if ((sql.match(/insert into supabase_migrations\.schema_migrations/g) || []).length !== 1) {
    throw new Error('artifact must write exactly one history row');
  }
  console.log(`R3-2 preview artifact deterministic: ${one.length} bytes ${createHash('sha256').update(one).digest('hex')}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
