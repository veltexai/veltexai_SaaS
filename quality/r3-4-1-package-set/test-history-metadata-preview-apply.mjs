#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'veltex-r341-history-preview-'));
const a = join(dir, 'a.sql'); const b = join(dir, 'b.sql');
const run = (out) => spawnSync(process.execPath,
  ['quality/r3-4-1-package-set/build-history-metadata-preview-apply.mjs', out],
  { encoding: 'utf8' });
try {
  const first = run(a); const second = run(b);
  if (first.status || second.status) throw new Error(first.stderr || second.stderr);
  const one = readFileSync(a); const two = readFileSync(b);
  if (!one.equals(two)) throw new Error('history metadata Preview artifact is not deterministic');
  const sql = one.toString('utf8');
  for (const fragment of [
    'R3_4_1_HISTORY_METADATA_PREVIEW_APPLY_PASS',
    'ynzkwctwlssjcsjmahey',
    'e85a362ae476c99eb8518c5340bf18466e2e57d8',
    'source_sha256:2016dfa7101b3d5e377f046eb292d804188837aa647d5d5bcff09b9dd5d737e8',
    'proposal history reader is already replaced',
    'proposal history metadata definition postcondition failed',
    'proposal history privilege postcondition failed',
  ]) if (!sql.includes(fragment)) throw new Error(`missing ${fragment}`);
  if ((sql.match(/^begin;$/gmu) || []).length !== 1
      || (sql.match(/^commit;$/gmu) || []).length !== 1) {
    throw new Error('artifact must have one outer transaction');
  }
  if ((sql.match(/insert into supabase_migrations\.schema_migrations/g) || []).length !== 1) {
    throw new Error('artifact must write one history row');
  }
  console.log(`R3-4.1 history metadata Preview artifact deterministic: ${one.length} bytes ${
    createHash('sha256').update(one).digest('hex')}`);
} finally { rmSync(dir, { recursive: true, force: true }); }
