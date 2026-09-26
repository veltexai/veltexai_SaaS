import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const docs = path.resolve(root, '../../docs/product/platform-build');
const required = [
  'README.md', 'run-hosted.sh', 'run-last-owner-concurrency.sh',
  'build-preview-migration-bundle.mjs',
  'HOSTED_APP_CHECKLIST.md', 'sql/r2-hosted-matrix.sql',
  'sql/last-owner-setup.sql', 'sql/last-owner-cleanup.sql',
  'run-u1-benchmark.sh', 'sql/u1-membership-rls-benchmark.sql',
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
];
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
console.log('R2 harness static validation PASS');
