import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL(
  '../../supabase/migrations/20261012000000_r3_5_c0_4_acceptance_surfaces.sql', import.meta.url,
), 'utf8');
const route = readFileSync(new URL(
  '../../app/api/public/proposal-room/acceptance/route.ts', import.meta.url,
), 'utf8');
const page = readFileSync(new URL('../../app/proposal-room/page.tsx', import.meta.url), 'utf8');
const boardRoute = readFileSync(new URL(
  '../../app/api/orgs/[organizationId]/crm/opportunities/route.ts', import.meta.url,
), 'utf8');
const definerAssertions = readFileSync(new URL(
  '../service-catalog-round4/db-harness/sql/30_assertions.sql', import.meta.url,
), 'utf8');

for (const fragment of [
  'create or replace function public.read_crm_customer_proposal_room_internal',
  'create or replace function public.read_crm_acceptance_summaries',
  "'acceptanceEnabled',acceptance_enabled",
  "acceptance_enabled:=coalesce(token_row.purpose='accept_proposal'",
  "'receipt',case when receipt_row.id is null then null",
  "c.role in ('owner','admin','viewer')",
  "c.role='estimator'",
  "case when c.role<>'viewer' then v.selected_subtotal_minor end",
  "case when c.role<>'viewer' then v.full_offered_total_minor end",
]) assert.ok(migration.includes(fragment), `missing migration contract: ${fragment}`);

assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
assert.match(migration, /revoke all on function public\.read_crm_customer_proposal_room_internal\(text\)[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(migration, /revoke all on function public\.read_crm_acceptance_summaries\(uuid\)[\s\S]*from public,anon;[\s\S]*grant execute[\s\S]*to authenticated,service_role/);
assert.ok(migration.indexOf('select r.* into receipt_row')
  < migration.indexOf('if receipt_row.id is null then'),
  'receipt refresh must be resolved before live-token rejection');
assert.doesNotMatch(migration, /signer_entered_(?:name|email)/,
  'customer and operator projections must not expose signer-entered identity');
assert.match(route, /command_crm_accept_proposal_version_internal/);
assert.match(route, /p_session_hmac_sha256: digestCustomerActionValue/);
assert.doesNotMatch(route, /console\.(?:log|warn|error)/);
assert.match(page, /Nothing is selected automatically/);
assert.match(page, /This records proposal\/package acceptance only/);
assert.match(page, /Accepted package details/);
assert.match(page, /Receipt SHA-256[\s\S]*break-all font-mono text-xs/,
  'receipt identifiers must wrap within the genuine 390px viewport');
assert.match(page, /acceptanceRequestKey/);
assert.match(page, /min-h-11/);
assert.match(boardRoute, /read_crm_acceptance_summaries/);
assert.match(boardRoute, /!Array\.isArray\(acceptances\.data\)/);
assert.match(definerAssertions, /'read_crm_acceptance_summaries\(uuid\)'/,
  'authenticated acceptance summary reader must be explicitly definer-allowlisted');

console.log('C0.4 acceptance surfaces static contract passes');
