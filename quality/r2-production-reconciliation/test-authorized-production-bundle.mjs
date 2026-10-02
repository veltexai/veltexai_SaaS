#!/usr/bin/env node

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const work = mkdtempSync(resolve(tmpdir(), 'veltex-r2-authorized-bundle-'));
const builder = resolve(here, 'build-authorized-production-bundle.mjs');
const manifest = '/private/tmp/veltex-r2-production-plan-v4/manifest.json';
const reviewed = '/private/tmp/veltex-r2-production-classified-v4.json';
const final = '/private/tmp/veltex-r2-production-classified-v4-final-drift.json';
const authorization = resolve(here, 'production-authorization-20261001.json');
const postflightContract = resolve(here, 'production-postflight-contract-20261001.json');
for (const path of [manifest, reviewed, final, authorization, postflightContract]) readFileSync(path);

const run = (name, args = [manifest, reviewed, final, authorization], contract = postflightContract) => {
  const output = resolve(work, `${name}.sql`);
  execFileSync(process.execPath, [builder, ...args, output, contract], { cwd: root, stdio: 'pipe' });
  return readFileSync(output, 'utf8');
};
const expectFailure = (name, mutate) => {
  const files = { manifest: resolve(work, `${name}-manifest.json`), reviewed: resolve(work, `${name}-reviewed.json`), final: resolve(work, `${name}-final.json`), authorization: resolve(work, `${name}-authorization.json`), postflight: resolve(work, `${name}-postflight.json`) };
  cpSync(manifest, files.manifest); cpSync(reviewed, files.reviewed); cpSync(final, files.final); cpSync(authorization, files.authorization);
  cpSync(postflightContract, files.postflight);
  mutate(files);
  assert.throws(() => run(name, [files.manifest, files.reviewed, files.final, files.authorization], files.postflight));
};

const sqlA = run('a');
const sqlB = run('b');
assert.equal(sqlA, sqlB, 'authorized artifact must be deterministic');
assert.equal((sqlA.match(/^begin;$/gim) ?? []).length, 1, 'artifact requires exactly one outer BEGIN');
assert.equal((sqlA.match(/^commit;$/gim) ?? []).length, 1, 'artifact requires exactly one outer COMMIT');
assert.equal((sqlA.match(/^insert into supabase_migrations\.schema_migrations/gim) ?? []).length, 35, 'every reviewed step records one history row');
assert.equal((sqlA.match(/^-- STEP \d+\/35 /gim) ?? []).length, 35);
assert.match(sqlA, /current_user must be postgres/);
assert.match(sqlA, /migration history drifted/);
assert.match(sqlA, /frozen row counts drifted/);
assert.match(sqlA, /exact live catalog differs from authorized fingerprint/);
assert.match(sqlA, /effective privileges differ from authorized fingerprint/);
assert.match(sqlA, /protected content digests differ from authorized fingerprint/);
assert.match(sqlA, /exhaustive postflight differs from rollback proof/);
assert.ok(sqlA.indexOf('exhaustive postflight differs from rollback proof') < sqlA.lastIndexOf('commit;'));
assert.match(sqlA, /active_organization_owner_id/);
assert.equal((sqlA.match(/jsonb_build_object\('organization_owner_id',o\.created_by\)/g)??[]).length,2,'proposal and branding organization ids normalize through stable owners');
assert.match(sqlA, /o\.created_by is distinct from p\.user_id/);
assert.match(sqlA, /o\.created_by is distinct from b\.user_id/);
assert.match(sqlA, /count\(\*\) from public\.organizations\) <> 86/);
assert.match(sqlA, /lock table supabase_migrations\.schema_migrations in share row exclusive mode/);
assert.match(sqlA, /in share row exclusive mode/);
assert.match(sqlA, /organization backfill mismatch/);
assert.match(sqlA, /private routine exposed to service_role/);
assert.match(sqlA, /client MAINTAIN remains/);
assert.doesNotMatch(sqlA, /UNARMED G3 ARTIFACT/);
assert.doesNotMatch(sqlA, /^\+/m,'generated SQL must not contain diff-marker prefixes');
assert.ok(sqlA.indexOf('apply-normalize-equivalent-drift') < sqlA.indexOf('20260925013000_production_schema_compatibility.sql'));
assert.equal(createHash('sha256').update(sqlA).digest('hex').length, 64);
const rollbackPath=resolve(work,'rollback.sql');
execFileSync(process.execPath,[builder,manifest,reviewed,final,authorization,rollbackPath,'--rollback-proof'],{cwd:root,stdio:'pipe'});
const rollbackSql=readFileSync(rollbackPath,'utf8');
assert.equal((rollbackSql.match(/^begin;$/gim)??[]).length,1);
assert.equal((rollbackSql.match(/^commit;$/gim)??[]).length,0);
assert.equal((rollbackSql.match(/^rollback;$/gim)??[]).length,1);
assert.match(rollbackSql,/R2_ROLLBACK_PROOF:/);
assert.match(rollbackSql,/'rollback_proof',true/);
assert.match(rollbackSql,/catalog_sha256/);
assert.match(rollbackSql,/effective_privileges_sha256/);
assert.doesNotMatch(rollbackSql,/^\+/m,'rollback SQL must not contain diff-marker prefixes');
assert.doesNotMatch(rollbackSql,/E'\\000'/,"rollback SQL must not construct forbidden PostgreSQL NUL text values");
assert.match(rollbackSql,/jsonb_build_array\(atom->>'kind',atom->>'identity',atom->>'value_sha256'\)::text/);

for (const key of ['rollback_proof','history_count','history_sha256','catalog_count','catalog_sha256','effective_privileges_sha256','content_digests_sha256','data_invariants_sha256']) {
  expectFailure(`postflight-${key}-drift`, ({ postflight: path }) => {
    const x=JSON.parse(readFileSync(path));
    x.postflight[key] = typeof x.postflight[key] === 'boolean' ? false : typeof x.postflight[key] === 'number' ? x.postflight[key] + 1 : '0'.repeat(64);
    writeFileSync(path, JSON.stringify(x));
  });
}
expectFailure('postflight-extra-key', ({ postflight: path }) => { const x=JSON.parse(readFileSync(path)); x.postflight.extra=true; writeFileSync(path,JSON.stringify(x)); });
expectFailure('rollback-artifact-binding-drift', ({ authorization: path }) => { const x=JSON.parse(readFileSync(path)); x.rollback_artifact_sha256='0'.repeat(64); writeFileSync(path,JSON.stringify(x)); });
expectFailure('rollback-evidence-binding-drift', ({ authorization: path }) => { const x=JSON.parse(readFileSync(path)); x.rollback_evidence_sha256='0'.repeat(64); writeFileSync(path,JSON.stringify(x)); });

expectFailure('bad-approval', ({ authorization: path }) => { const x=JSON.parse(readFileSync(path)); x.status='PENDING'; writeFileSync(path, JSON.stringify(x)); });
expectFailure('wrong-project', ({ authorization: path }) => { const x=JSON.parse(readFileSync(path)); x.project_ref='ynzkwctwlssjcsjmahey'; writeFileSync(path, JSON.stringify(x)); });
expectFailure('stale-final-binding', ({ authorization: path }) => { const x=JSON.parse(readFileSync(path)); x.final_fingerprint_sha256='0'.repeat(64); writeFileSync(path, JSON.stringify(x)); });
expectFailure('fingerprint-drift', ({ final: path }) => { const x=JSON.parse(readFileSync(path)); x.row_counts.profiles++; writeFileSync(path, JSON.stringify(x)); });
expectFailure('manifest-mode-drift', ({ manifest: path, authorization: authPath }) => {
  const x=JSON.parse(readFileSync(path)); x.steps[0].mode='apply'; writeFileSync(path, JSON.stringify(x));
  const auth=JSON.parse(readFileSync(authPath)); auth.reviewed_fingerprint_sha256=createHash('sha256').update(readFileSync(reviewed)).digest('hex'); writeFileSync(authPath,JSON.stringify(auth));
});

console.log('authorized production bundle deterministic/refusal tests PASS');
