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
assert.ok(sql.indexOf("if selected_count<>cardinality(p_selected_association_ids) then")<sql.indexOf('if existing.id is not null then'),
  'the complete caller identifier set must be validated before exact replay');
assert.ok(sql.indexOf("'veltex-r3-5-c0-token-set',t.organization_id::text,t.proposal_version_id::text")<sql.indexOf("latest_state is distinct from 'enabled'"),
  'acceptance must serialize with token issue/revocation before live eligibility is checked');
assert.match(sql,/perform 1 from public\.proposals p[\s\S]*for update;[\s\S]*newer\.version_number>v\.version_number/,
  'acceptance must lock the proposal and reject any superseding version');
assert.match(sql,/'accepted_at_utc',to_char\(accepted_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS\.US"Z"'\)/,
  'receipt time must have a timezone-independent canonical representation');
console.log('C0.3 atomic acceptance static contract passes');
