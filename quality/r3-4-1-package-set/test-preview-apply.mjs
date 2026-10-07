import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'veltex-r341-preview-'));
const a = join(dir, 'a.sql'); const b = join(dir, 'b.sql');
const run = (out) => spawnSync(process.execPath, ['quality/r3-4-1-package-set/build-preview-apply.mjs', out], { encoding: 'utf8' });
try {
  const first = run(a); const second = run(b);
  if (first.status || second.status) throw new Error(first.stderr || second.stderr);
  const one = readFileSync(a); const two = readFileSync(b);
  if (!one.equals(two)) throw new Error('preview artifact is not deterministic');
  const sql = one.toString('utf8');
  for (const fragment of ['R3_4_1_PREVIEW_APPLY_PASS','ynzkwctwlssjcsjmahey','a98ca78f1d5527534a82f653edcd62e238951cac','source_sha256:1f7f2943813111590e6de914f4de8f455113522079e0258015d56b90587a4eb1','protected R3 CRM content changed','crm_proposal_version_packages','command_crm_publish_proposal_package_set_internal']) {
    if (!sql.includes(fragment)) throw new Error(`missing ${fragment}`);
  }
  if ((sql.match(/^begin;$/gmu)||[]).length!==1 || (sql.match(/^commit;$/gmu)||[]).length!==1) throw new Error('artifact must have one transaction');
  if ((sql.match(/insert into supabase_migrations\.schema_migrations/g)||[]).length!==1) throw new Error('artifact must write one history row');
  console.log(`R3-4.1 preview artifact deterministic: ${one.length} bytes ${createHash('sha256').update(one).digest('hex')}`);
} finally { rmSync(dir,{recursive:true,force:true}); }
