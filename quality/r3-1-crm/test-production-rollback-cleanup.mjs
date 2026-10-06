#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const generator = resolve(import.meta.dirname, 'build-production-rollback-cleanup.mjs');
const capture = '/private/tmp/veltex-r3-1-production-preflight.json';
const dir = mkdtempSync(join(tmpdir(), 'veltex-r31-cleanup-'));
const run = (capturePath, outputPath) => spawnSync(process.execPath, [generator, capturePath, outputPath], { cwd: root, encoding: 'utf8' });
const outputs = [join(dir, 'one.sql'), join(dir, 'two.sql')];

for (const output of outputs) {
  const result = run(capture, output);
  assert.equal(result.status, 0, result.stderr);
}
const first = readFileSync(outputs[0], 'utf8');
assert.equal(first, readFileSync(outputs[1], 'utf8'), 'generation must be deterministic');
assert.equal(createHash('sha256').update(first).digest('hex'), '3458a39249e7e4a49321feab315de6df21e9d32bacbd4efea92914d0a438f2c8');
assert.equal((first.match(/^begin transaction read only;$/gm) ?? []).length, 1);
assert.equal((first.match(/^rollback;$/gm) ?? []).length, 1);
assert.equal((first.match(/^commit;$/gm) ?? []).length, 0);
assert.match(first, /cleanup_pass/);
assert.match(first, /planned_history_count/);
assert.match(first, /CRM relation residue persisted/);
assert.match(first, /iwoaaljitifloolszxlu/);

const changed = JSON.parse(readFileSync(capture, 'utf8'));
changed.migration_history.count = 65;
const changedPath = join(dir, 'changed.json');
writeFileSync(changedPath, JSON.stringify(changed));
const refused = run(changedPath, join(dir, 'refused.sql'));
assert.notEqual(refused.status, 0);
assert.match(refused.stderr, /capture bytes do not match/);

console.log(`R3-1 production rollback cleanup generator PASS (${Buffer.byteLength(first)} bytes, ${createHash('sha256').update(first).digest('hex')})`);
