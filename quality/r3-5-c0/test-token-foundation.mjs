#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const migration = readFileSync(resolve(root,
  'supabase/migrations/20261008000000_r3_5_c0_customer_action_tokens.sql'), 'utf8');

for (const marker of [
  'create table public.crm_proposal_action_eligibility_events',
  'create table public.crm_customer_action_tokens',
  'create table public.crm_customer_action_token_revocations',
  'create table public.crm_customer_action_token_commands',
  'create table public.crm_customer_action_rate_buckets',
  "'review_proposal','respond_proposal','accept_proposal'",
  "token_hmac_sha256 ~ '^[a-f0-9]{64}$'",
  "expires_at<=issued_at+interval '7 days'",
  'guard_crm_customer_action_append_only',
  'command_crm_issue_customer_action_token_internal',
  'command_crm_revoke_customer_action_token_internal',
  'read_crm_customer_action_token_status',
  "version_row.schema_version<>'crm_proposal_version.v2'",
  'version_row.package_count<>(select count(*)',
  "created_token.designated_approver_email_hmac_sha256 is not null,false,true",
  "created_token.designated_approver_email_hmac_sha256 is not null,true,false",
  "'proposal.customer_action_token_issued'",
  "'proposal.customer_action_token_revoked'",
  't.proposal_version_id=p_proposal_version',
]) assert.ok(migration.includes(marker), `missing ${marker}`);

assert.equal((migration.match(/^begin;$/gm) ?? []).length, 1);
assert.equal((migration.match(/^commit;$/gm) ?? []).length, 1);
assert.match(migration,
  /revoke all on public\.crm_proposal_action_eligibility_events,[\s\S]*public\.crm_customer_action_rate_buckets[\s\S]*from public,anon,authenticated,service_role/);
assert.match(migration,
  /revoke all on function public\.command_crm_issue_customer_action_token_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(migration,
  /revoke all on function public\.command_crm_revoke_customer_action_token_internal[\s\S]*from public,anon,authenticated;[\s\S]*grant execute[\s\S]*to service_role/);
assert.match(migration,
  /revoke all on function public\.read_crm_customer_action_token_status\(uuid,uuid\)[\s\S]*from public,anon,service_role;[\s\S]*grant execute[\s\S]*to authenticated/);

const issueBody = migration.slice(
  migration.indexOf('create function public.command_crm_issue_customer_action_token_internal'),
  migration.indexOf('create function public.command_crm_revoke_customer_action_token_internal'),
);
assert.ok(issueBody.indexOf('select m.role into actor_role')
  < issueBody.indexOf('select c.* into command_row'),
  'issue authorization must precede receipt lookup');
assert.doesNotMatch(issueBody,
  /return query[\s\S]{0,300}token_hmac_sha256/i,
  'issue response must not expose the token digest');
assert.doesNotMatch(migration,
  /\b(raw_token|bearer_token|access_token)\s+(text|bytea|varchar|jsonb)\b/i,
  'migration must not define a raw bearer column or parameter');
assert.doesNotMatch(migration, /grant\s+(select|insert|update|delete|all)[\s\S]*crm_customer_action_tokens[\s\S]*to\s+(anon|authenticated)/i);

console.log('R3-5 C0.1 private token foundation PASS');
