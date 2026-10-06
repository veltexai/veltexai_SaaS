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
assert.equal(createHash('sha256').update(first).digest('hex'), '2b81526cb8bb3db8ec5c5825ec900684ecc5e706a7b4fa38da65b097c152ddc1');
assert.equal((first.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((first.match(/^commit;$/gm) ?? []).length, 0);
assert.equal((first.match(/^rollback;$/gm) ?? []).length, 1);
assert.equal((first.match(/^-- STEP \d\/2 /gm) ?? []).length, 2);
assert.equal((first.match(/insert into supabase_migrations\.schema_migrations\(version,name,statements\)/g) ?? []).length, 2);
assert.match(first, /R3_1_ROLLBACK_PROOF:/);
assert.match(first, /d22b04c72c863cde6b2eaa04a61f0f322df11493968f4478afdacf5d7a97aa11/);
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
