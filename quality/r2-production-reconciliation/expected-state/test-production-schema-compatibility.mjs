#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const here=dirname(new URL(import.meta.url).pathname);
const root=resolve(here,'../../..');
const migration=readFileSync(resolve(root,'supabase/migrations/20260925013000_production_schema_compatibility.sql'),'utf8');
const webhook=readFileSync(resolve(root,'app/api/webhooks/stripe/route.ts'),'utf8');
const templateService=readFileSync(resolve(root,'lib/templates/template-service.ts'),'utf8');

assert.match(migration,/^begin;[\s\S]*commit;\s*$/);
assert.doesNotMatch(migration,/\b(?:insert|update|delete|truncate)\b\s+(?:into|public\.|from)/i,'compatibility migration must not rewrite application rows');
assert.match(migration,/alter column subscription_status set default 'pending'::text/i);
assert.match(migration,/add column if not exists preview_pdf_url text/i);
assert.match(migration,/add column if not exists city varchar\(100\)/i);
assert.match(migration,/proposal_templates\.preview_pdf_url has an incompatible shape/);
assert.match(migration,/proposals\.city has an incompatible shape/);
assert.match(migration,/billing_history_action_check[\s\S]*'subscription_start'::text[\s\S]*not valid/i);
assert.match(migration,/subscriptions_status_check[\s\S]*'trialing'::text[\s\S]*not valid/i);
assert.equal((migration.match(/validate constraint/g)??[]).length,2);
assert.match(migration,/create policy "Admins can view all billing history"[\s\S]*for select\s+to authenticated\s+using \(public\.is_admin\(\)\)/i);
assert.doesNotMatch(migration,/create policy "Admins can view all billing history"[\s\S]*\bto public\b/i);

assert.match(webhook,/action:\s*"subscription_start"/,'the widened billing action must remain application-required');
assert.match(webhook,/status\s*===\s*"trialing"/,'the widened subscription status must remain application-required');
assert.match(templateService,/preview_pdf_url/,'preview PDF compatibility field must remain application-required');

console.log('production schema compatibility contract PASS');
