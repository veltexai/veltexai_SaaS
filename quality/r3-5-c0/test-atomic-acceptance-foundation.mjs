import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql=readFileSync(new URL('../../supabase/migrations/20261011000000_r3_5_c0_3_atomic_acceptance.sql',import.meta.url),'utf8');
for(const fragment of [
  'create table public.crm_proposal_acceptance_receipts',
  'create function public.command_crm_accept_proposal_version_internal',
  "t.purpose<>'accept_proposal'",
  "latest_state is distinct from 'enabled'",
  "'veltex-c0-acceptance-v1'",
  "'proposal.acceptance_received'",
  "acceptance_method='customer_acceptance'",
  "perform set_config('veltex.acceptance_receipt_id'",
]) assert.ok(sql.includes(fragment),`missing ${fragment}`);
assert.match(sql,/revoke all on public\.crm_proposal_acceptance_receipts[\s\S]*from public,anon,authenticated,service_role/);
assert.match(sql,/revoke all on function public\.command_crm_accept_proposal_version_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(sql,/before update or delete on public\.crm_proposal_acceptance_receipts/);
assert.match(sql,/before truncate on public\.crm_proposal_acceptance_receipts/);
assert.ok(!/grant (?:select|insert|update|delete|truncate|all)[\s\S]*crm_proposal_acceptance_receipts[\s\S]*to (?:anon|authenticated|service_role)/i.test(sql));
assert.ok(sql.indexOf('if existing.id is not null then')<sql.indexOf('or latest_state is distinct from'),
  'exact replay must be checked before success-time revocation and eligibility changes');
console.log('C0.3 atomic acceptance static contract passes');
