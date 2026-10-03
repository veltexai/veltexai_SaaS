#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const generator = resolve(import.meta.dirname, 'build-production-rollback-proof.mjs');
const capture = '/private/tmp/veltex-r3-1-production-preflight.json';
const dir = mkdtempSync(join(tmpdir(), 'veltex-r31-proof-'));
const one = join(dir, 'one.sql');
const two = join(dir, 'two.sql');
const run = (capturePath, outputPath) => spawnSync(process.execPath, [generator, capturePath, outputPath], { cwd: root, encoding: 'utf8' });

for (const output of [one, two]) {
  const result = run(capture, output);
  assert.equal(result.status, 0, result.stderr);
}
const first = readFileSync(one, 'utf8');
const second = readFileSync(two, 'utf8');
assert.equal(first, second, 'generation must be deterministic');
assert.equal(createHash('sha256').update(first).digest('hex'), '66753c9e38c1b4fcda2f84da0aa6025f55669af9a5a2d2b60b88c2604b2bde8f');
assert.equal((first.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((first.match(/^commit;$/gm) ?? []).length, 0);
assert.equal((first.match(/^rollback;$/gm) ?? []).length, 1);
assert.equal((first.match(/^-- STEP \d\/2 /gm) ?? []).length, 2);
assert.equal((first.match(/insert into supabase_migrations\.schema_migrations\(version,name,statements\)/g) ?? []).length, 2);
assert.match(first, /R3_1_ROLLBACK_PROOF:/);
assert.match(first, /c573f62044b1bed9fc27947acb0e3fab701947d58786acbc0f2a93fd022a3cd5/);
assert.match(first, /526b56f0bd32c542f77b89e61df79eed18304e7cccd4b06d5c458fa3273ea795/);
assert.match(first, /85fac17469510408ab777a04101c585850fd5774874e0fb01c663c8fddd3cf18/);
assert.doesNotMatch(first, /^\+/m);
assert.doesNotMatch(first, /<<<<<<<|=======|>>>>>>>/);

const changed = JSON.parse(readFileSync(capture, 'utf8'));
changed.row_counts.profiles += 1;
const changedPath = join(dir, 'changed.json');
writeFileSync(changedPath, JSON.stringify(changed));
const refused = run(changedPath, join(dir, 'refused.sql'));
assert.notEqual(refused.status, 0);
assert.match(refused.stderr, /capture bytes do not match/);

console.log(`R3-1 production rollback-proof generator PASS (${Buffer.byteLength(first)} bytes)`);
