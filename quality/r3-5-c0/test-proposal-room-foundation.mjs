#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const sql = readFileSync(resolve(root,
  'supabase/migrations/20261010000000_r3_5_c0_2_proposal_room.sql'), 'utf8');

for (const fragment of [
  'create table public.crm_customer_action_sessions',
  'create table public.crm_customer_action_exchange_rate_buckets',
  'create table public.crm_proposal_responses',
  'create function public.exchange_crm_customer_action_token_internal',
  'create function public.read_crm_customer_proposal_room_internal',
  'create function public.command_crm_customer_proposal_response_internal',
  "'acceptanceEnabled',false",
  "'question','change_requested','declined'",
  "'veltex-c0-acceptance-v1'",
]) assert.ok(sql.includes(fragment), `missing C0.2 fragment: ${fragment}`);

assert.match(sql, /revoke all on public\.crm_customer_action_sessions,[\s\S]*public\.crm_customer_action_exchange_rate_buckets,public\.crm_proposal_responses[\s\S]*from public,anon,authenticated,service_role/);
assert.match(sql, /revoke all on function public\.exchange_crm_customer_action_token_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(sql, /revoke all on function public\.read_crm_customer_proposal_room_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(sql, /revoke all on function public\.command_crm_customer_proposal_response_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.doesNotMatch(sql, /grant execute[\s\S]*to anon/);
assert.doesNotMatch(sql, /accept_crm|acceptance_receipt|update public\.crm_site_work_packages/);
assert.doesNotMatch(sql, /user_agent|browser_fingerprint|ip_address|raw_token/i);
assert.match(sql, /insert into public\.crm_customer_action_exchange_rate_buckets[\s\S]*on conflict\(key_version,token_hmac_sha256,window_started_at\) do update/);
assert.match(sql, /if token_row\.id is null then\s+return null/);

for (const table of ['crm_customer_action_sessions', 'crm_proposal_responses']) {
  assert.ok(sql.includes(`guard_${table}_append_only`));
  assert.ok(sql.includes(`guard_${table}_truncate`));
}

console.log('R3-5 C0.2 proposal-room foundation PASS');
