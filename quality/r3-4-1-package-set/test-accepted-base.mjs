#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const acceptedMigrationPath = resolve(
  root,
  'supabase/migrations/20261005000000_r3_4_immutable_proposal_versions.sql',
);
const decisionPath = resolve(
  root,
  'docs/product/platform-build/R3_4_1_PACKAGE_SET_COMMITMENT_DECISION.md',
);

const acceptedMigration = readFileSync(acceptedMigrationPath);
const acceptedSha256 = createHash('sha256').update(acceptedMigration).digest('hex');
const decision = readFileSync(decisionPath, 'utf8');

assert.equal(
  acceptedSha256,
  '86f438fe3a4516093534faf45d74bff4020dc68e9e40014f912e7152685678a3',
  'accepted R3-4 migration bytes changed; R3-4.1 must be additive',
);
assert.match(decision, /DATABASE COMMAND LOCAL CANDIDATE \/ APPLICATION INTEGRATION PENDING/);
assert.match(decision, /Existing `crm_proposal_version\.v1` rows remain byte-for-byte unchanged/);
assert.match(decision, /new migration after accepted R3-4/);
assert.match(decision, /must not edit or replay/);

console.log('R3-4.1 accepted R3-4 base and additive-only entry contract PASS');
