import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIKE_ATTEMPT_CEILING,
  claimNext,
  createStore,
  deliver,
  enqueue,
  fail,
  pendingRows,
  runLeaseContractScenario,
} from './u8-local-spike/outbox-claimer.mjs';

const root = path.dirname(new URL(import.meta.url).pathname);
const docs = path.resolve(root, '../../docs/product/platform-build');
const required = [
  'README.md', 'run-hosted.sh', 'run-last-owner-concurrency.sh',
  'build-preview-migration-bundle.mjs',
  'HOSTED_APP_CHECKLIST.md', 'sql/r2-hosted-matrix.sql',
  'sql/last-owner-setup.sql', 'sql/last-owner-cleanup.sql',
  'run-u1-benchmark.sh', 'sql/u1-membership-rls-benchmark.sql',
  'u8-preview-runtime-inventory-20260926.json',
  'sql-editor/README.md', 'sql-editor/00-preview-guard.sql',
  'sql-editor/_guard.fragment.sql', 'sql-editor/_pre_r2_fingerprint.fragment.sql',
  'sql-editor/_post_r2_fingerprint.fragment.sql',
  'sql-editor/build-sql-editor-bundle.mjs',
  'sql-editor/emit-sql-editor-checks.mjs', 'sql-editor/dry-run.mjs',
  'sql-editor/02-hosted-matrix.sql', 'sql-editor/03-last-owner-single-session.sql',
  'sql-editor/04-u1-benchmark.sql',
  'u8-local-spike/README.md', 'u8-local-spike/outbox-claimer.mjs',
  'u8-local-spike/outbox-claimer.test.mjs', 'u8-local-spike/run-u8-local-spike.mjs',
];
const requiredDocs = [
  'R2_U1_MEMBERSHIP_RLS_BENCHMARK.md',
  'R2_U8_RUNTIME_READINESS.md',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`missing ${file}`);
}
for (const file of requiredDocs) {
  if (!fs.existsSync(path.join(docs, file))) throw new Error(`missing docs ${file}`);
}
const all = required.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
for (const marker of [
  'f761469', 'owner', 'admin', 'estimator', 'viewer', 'non-member',
  'anonymous', 'service-role', 'active_organization_id', 'creator attribution',
  'last-owner', 'append-only', 'idempotency', 'proposal-content', 'signup',
  'PDF', 'tracked-link', 'iwoaaljitifloolszxlu',
]) {
  if (!all.toLowerCase().includes(marker.toLowerCase())) throw new Error(`missing coverage marker: ${marker}`);
}
const bundleBuilder = fs.readFileSync(path.join(root, 'build-preview-migration-bundle.mjs'), 'utf8');
for (const marker of [
  'supabase_migrations.schema_migrations',
  'migration-history rows already exist',
  'migration-history rows missing',
  'database does not match recorded isolated-preview baseline',
  'committed pre-R2 migration history is incomplete',
  'b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f',
]) {
  if (!bundleBuilder.includes(marker)) throw new Error(`bundle builder missing ${marker}`);
}
const hostedRunner = fs.readFileSync(path.join(root, 'run-hosted.sh'), 'utf8');
if (!hostedRunner.includes('R2_CANDIDATE_COMMIT') || hostedRunner.includes('r2-fourth-remediation')) {
  throw new Error('hosted runner does not require an exact candidate commit');
}
for (const runner of ['run-hosted.sh', 'run-last-owner-concurrency.sh', 'run-u1-benchmark.sh']) {
  const text = fs.readFileSync(path.join(root, runner), 'utf8');
  if (!text.includes('R2_EXPECTED_PROJECT_REF') && runner !== 'run-u1-benchmark.sh') {
    throw new Error(`${runner} lacks preview guard`);
  }
  if (!text.includes('Refusing production project')) {
    throw new Error(`${runner} lacks preview guard`);
  }
  if (!text.includes("tr '[:upper:]' '[:lower:]'")) {
    throw new Error(`${runner} is not Bash-3-compatible and case-hardened against mixed-case production refs`);
  }
}
const u1Runner = fs.readFileSync(path.join(root, 'run-u1-benchmark.sh'), 'utf8');
if (!u1Runner.includes('R2_U1_EXECUTE') || !u1Runner.includes('dry-run') || !u1Runner.includes('iwoaaljitifloolszxlu')) {
  throw new Error('U1 runner lacks dry-run / execute / production guards');
}
if (!u1Runner.includes('R2_EXPECTED_PROJECT_REF')) {
  throw new Error('U1 runner lacks preview ref guard');
}
const u1Sql = fs.readFileSync(path.join(root, 'sql/u1-membership-rls-benchmark.sql'), 'utf8');
const u1Required = [
  'begin;', 'rollback;', 'EXPLAIN (ANALYZE, BUFFERS', 'organization_memberships',
  'proposal_additional_services', 'pdf_exports', 'organization_event_outbox',
  'event_sequence', 'r2-u1-', '93000000', 'example.test',
  'grant select, insert on u1_evidence to authenticated, service_role',
  'q4a_addon_visibility_rls', 'q5_pdf_export_visibility_rls',
  "reset role;\ntable u1_baseline;",
];
if (/insert into public\.pdf_exports\s*\([^)]*(file_url|file_path)/is.test(u1Sql)) {
  throw new Error('U1 SQL uses a removed pdf_exports path column');
}
for (const marker of u1Required) {
  if (!u1Sql.toLowerCase().includes(marker.toLowerCase())) {
    throw new Error(`U1 SQL missing ${marker}`);
  }
}
if ((u1Sql.match(/\$\$/g) || []).length % 2 !== 0) {
  throw new Error('U1 SQL has unbalanced $$ dollar quotes');
}
if (/begin;/i.test(u1Sql) === false || /rollback;/i.test(u1Sql) === false) {
  throw new Error('U1 SQL must open a transaction and roll back');
}
if (u1Sql.toLowerCase().includes('commit;')) {
  throw new Error('U1 SQL must not commit fixtures');
}
const u1Doc = fs.readFileSync(path.join(docs, 'R2_U1_MEMBERSHIP_RLS_BENCHMARK.md'), 'utf8');
const u8Doc = fs.readFileSync(path.join(docs, 'R2_U8_RUNTIME_READINESS.md'), 'utf8');
for (const [name, text] of [['U1 doc', u1Doc], ['U8 doc', u8Doc]]) {
  if (!text.includes('PREPARED / NOT EXECUTED')) throw new Error(`${name} missing PREPARED status`);
}
if (!u8Doc.includes('best-effort cron is not sufficient') && !u8Doc.includes('not sufficient for contractual handoffs')) {
  throw new Error('U8 memo does not record the Prompt 2 cron prohibition');
}
if (!u8Doc.includes('U8 remains OPEN') || !u8Doc.includes('terminal-DLQ')) {
  throw new Error('U8 memo prematurely closes the runtime decision');
}
if (!u8Doc.includes('LOCAL SPIKE EXECUTED') || !u8Doc.includes('runtime choice remains OPEN')) {
  throw new Error('U8 memo does not record the local spike while leaving the runtime OPEN');
}
if (!u8Doc.includes('lease token') && !u8Doc.includes('claim token')) {
  throw new Error('U8 memo does not record immutable lease/claim tokens');
}
const BASELINE_DIGEST = 'b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f';
const sqlEditorTexts = [
  'sql-editor/00-preview-guard.sql',
  'sql-editor/_guard.fragment.sql',
  'sql-editor/_pre_r2_fingerprint.fragment.sql',
  'sql-editor/_post_r2_fingerprint.fragment.sql',
  'sql-editor/build-sql-editor-bundle.mjs',
  'sql-editor/02-hosted-matrix.sql',
  'sql-editor/03-last-owner-single-session.sql',
  'sql-editor/04-u1-benchmark.sql',
  'sql-editor/README.md',
].map((file) => fs.readFileSync(path.join(root, file), 'utf8'));
const sqlEditorPack = sqlEditorTexts.join('\n');
if (sqlEditorPack.includes("'PREVIEW_REF_HERE'") || /preview_ref <> 'wcnfhriosemgchmtwgof'/.test(sqlEditorPack)) {
  throw new Error('SQL Editor pack still uses a pasted GUC/ref as database identity');
}
if (!sqlEditorPack.includes(BASELINE_DIGEST)) {
  throw new Error('SQL Editor pack missing recorded proposal-content fingerprint');
}
if (/four-role/.test(sqlEditorPack) && !/uninvited-role denial/.test(sqlEditorPack)) {
  throw new Error('SQL Editor pack overstates a positive four-role matrix');
}
if (fs.readFileSync(path.join(root, 'sql-editor/dry-run.mjs'), 'utf8').includes('production_refused')) {
  throw new Error('SQL Editor dry-run still claims a JS production-refusal proof');
}
if (fs.readFileSync(path.join(root, 'sql-editor/README.md'), 'utf8').includes('named session guard')) {
  throw new Error('SQL Editor README still treats a session GUC as identity');
}
const sqlEditorBundle = fs.readFileSync(path.join(root, 'sql-editor/build-sql-editor-bundle.mjs'), 'utf8');
for (const marker of [
  'supabase_migrations.schema_migrations',
  'array[]::text[]',
  'PREPARED / NOT HOSTED-EXECUTED',
  BASELINE_DIGEST,
  'iwoaaljitifloolszxlu',
  '_pre_r2_fingerprint.fragment.sql',
]) {
  if (!sqlEditorBundle.includes(marker)) {
    throw new Error(`SQL Editor bundle builder missing ${marker}`);
  }
}
const u8Spike = [
  'u8-local-spike/outbox-claimer.mjs',
  'u8-local-spike/run-u8-local-spike.mjs',
  'u8-local-spike/README.md',
].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
if (/create extension|npm install|qstash|inngest|enable pg_cron|enable pgmq/i.test(u8Spike)
    && /does not install or enable/i.test(u8Spike) === false) {
  throw new Error('U8 local spike appears to enable a hosted runtime');
}
if (!u8Spike.includes("runtime_choice: 'OPEN'") && !u8Spike.includes('runtime_choice: OPEN') && !u8Spike.includes('Runtime choice: **OPEN**')) {
  throw new Error('U8 local spike does not keep the runtime choice OPEN');
}
for (const forbidden of ['create extension', 'pg_cron.schedule', 'supabase functions deploy']) {
  if (u8Spike.includes(forbidden)) {
    throw new Error(`U8 local spike contains hosted mutation ${forbidden}`);
  }
}
if (/lock\.workerId !== workerId|lock\.workerId != workerId/.test(u8Spike)) {
  throw new Error('U8 claimer still lets the same worker reclaim an unexpired lease');
}
if (!u8Spike.includes('stale_lease') || !u8Spike.includes('token')) {
  throw new Error('U8 claimer is missing immutable lease-token checks');
}
if (SPIKE_ATTEMPT_CEILING !== 4 || !u8Spike.includes('injectFaultAfterInbox')) {
  throw new Error('U8 spike lacks a four-attempt ceiling or inbox/outbox fault injection');
}
if (/psql runners are unchanged|Existing psql runners are unchanged/.test([
  fs.readFileSync(path.join(root, 'README.md'), 'utf8'),
  fs.readFileSync(path.join(docs, 'R2_U8_RUNTIME_READINESS.md'), 'utf8'),
  fs.readFileSync(path.resolve(root, '../../docs/OPERATING_STATE_AND_DECISION_LEDGER.md'), 'utf8'),
].join('\n'))) {
  throw new Error('docs still claim the psql runners are unchanged');
}
{
  const store = createStore();
  const now = 10;
  enqueue(store, {
    id: 'unsafe', organization_id: 'org', event_id: 'e', event_type: 't',
    aggregate_type: 'a', aggregate_id: '1', payload: {},
  }, now);
  const first = claimNext(store, now, 'A');
  if (claimNext(store, now, 'A') != null || pendingRows(store, now).length !== 0) {
    throw new Error('U8 claimer allows same-worker unexpired reclaim');
  }
  const later = now + 2_000;
  const second = claimNext(store, later, 'B');
  let staleDelivered = false;
  try {
    deliver(store, first, 'c', 'a'.repeat(64), later);
    staleDelivered = true;
  } catch (error) {
    if (error.code !== 'stale_lease') throw error;
  }
  if (staleDelivered || second.row.delivered_at != null) {
    throw new Error('U8 claimer accepted a stale success');
  }
  try {
    fail(store, first, 'stale', later);
    throw new Error('U8 claimer accepted a stale failure');
  } catch (error) {
    if (error.code !== 'stale_lease') throw error;
  }
  const evidence = runLeaseContractScenario();
  if (evidence.runtime_choice !== 'OPEN' || evidence.residue_after_cleanup !== 0) {
    throw new Error('U8 lease contract left residue or closed the runtime');
  }
  if (evidence.attempt_ceiling !== 4 || evidence.retry_delays_ms.join(',') !== '100,200,400') {
    throw new Error('U8 retry ceiling is not the observed 4-attempt 100/200/400/DLQ sequence');
  }
}
const u8Inventory = JSON.parse(fs.readFileSync(path.join(root, 'u8-preview-runtime-inventory-20260926.json'), 'utf8'));
if (u8Inventory.project_ref === 'iwoaaljitifloolszxlu' || u8Inventory.production_touched !== false) {
  throw new Error('U8 inventory is not isolated-preview evidence');
}
if (u8Inventory.extensions?.pg_net?.installed !== '0.20.4' || u8Inventory.extensions?.pgmq?.installed !== null) {
  throw new Error('U8 inventory does not match the recorded read-only preview result');
}
const sqlEditorDryRun = spawnSync(process.execPath, [path.join(root, 'sql-editor/dry-run.mjs')], {
  encoding: 'utf8',
});
if (sqlEditorDryRun.status !== 0) {
  throw new Error(`SQL Editor dry-run failed: ${sqlEditorDryRun.stderr || sqlEditorDryRun.stdout}`);
}
if ((sqlEditorDryRun.stdout || '').includes('production_refused')) {
  throw new Error('SQL Editor dry-run output claims a JS production-refusal proof');
}
const emitCheck = spawnSync(process.execPath, [path.join(root, 'sql-editor/emit-sql-editor-checks.mjs'), '--check'], {
  encoding: 'utf8',
});
if (emitCheck.status !== 0) {
  throw new Error(`SQL Editor generator parity failed: ${emitCheck.stderr || emitCheck.stdout}`);
}
console.log('R2 harness static validation PASS');
