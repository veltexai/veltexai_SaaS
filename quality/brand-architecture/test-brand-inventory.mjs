#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const dir = mkdtempSync(join(tmpdir(), 'veltex-brand-inventory-'));
const outputs = [join(dir, 'one.json'), join(dir, 'two.json')];
for (const output of outputs) {
  const run = spawnSync(process.execPath, [resolve(import.meta.dirname, 'inventory-brand-references.mjs'), output], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
}
assert.equal(readFileSync(outputs[0], 'utf8'), readFileSync(outputs[1], 'utf8'));
const inventory = JSON.parse(readFileSync(outputs[0], 'utf8'));
assert.equal(inventory.contract_version, 1);
assert.ok(inventory.references.length > 0);
assert.ok(inventory.references.some((item) => item.classification === 'customer_facing_candidate'));
assert.ok(inventory.references.some((item) => item.classification === 'historical_or_governance'));
assert.ok(inventory.references.every((item, index, all) => index === 0
  || all[index - 1].path.localeCompare(item.path) < 0
  || (all[index - 1].path === item.path && all[index - 1].line <= item.line)));
console.log(`Brand inventory PASS (${inventory.references.length} references)`);
