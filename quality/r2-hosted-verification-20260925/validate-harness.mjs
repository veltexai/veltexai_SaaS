import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const required = [
  'README.md', 'run-hosted.sh', 'run-last-owner-concurrency.sh',
  'HOSTED_APP_CHECKLIST.md', 'sql/r2-hosted-matrix.sql',
  'sql/last-owner-setup.sql', 'sql/last-owner-cleanup.sql',
];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`missing ${file}`);
}
const all = required.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
for (const marker of [
  'fourth-remediation', 'owner', 'admin', 'estimator', 'viewer', 'non-member',
  'anonymous', 'service-role', 'active_organization_id', 'creator attribution',
  'last-owner', 'append-only', 'idempotency', 'proposal-content', 'signup',
  'PDF', 'tracked-link', 'iwoaaljitifloolszxlu',
]) {
  if (!all.toLowerCase().includes(marker.toLowerCase())) throw new Error(`missing coverage marker: ${marker}`);
}
for (const runner of ['run-hosted.sh', 'run-last-owner-concurrency.sh']) {
  const text = fs.readFileSync(path.join(root, runner), 'utf8');
  if (!text.includes('R2_EXPECTED_PROJECT_REF') || !text.includes('Refusing production project')) {
    throw new Error(`${runner} lacks preview guard`);
  }
}
console.log('R2 harness static validation PASS');
