-- Synthetic fixtures used in round 3 (exact). Two synthetic auth users (owner/other), a v2 catalog
-- proposal with planted sentinels (access "Lockbox 4821", wage-derived labor_rate 31.25, client email
-- pat@example.test, cost snapshot) and two tracking tokens (UUID and legacy track_<ms>_<rand> format).
-- All values are fictitious; .test/.example domains only.
-- The disposable cluster is initialized under the local macOS account, so the
-- SECURITY DEFINER signup function is locally owned by that account rather
-- than Supabase's `postgres` owner. Disable only the entitlement trigger while
-- installing these synthetic fixtures; production migrations and guards are
-- unchanged, and all other profile/bootstrap triggers continue to execute.
alter table public.profiles disable trigger profiles_protect_entitlements;
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','owner@example.test'),('22222222-2222-4222-8222-222222222222','other@example.test');
update public.profiles set subscription_status='active' where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
alter table public.profiles enable trigger profiles_protect_entitlements;
insert into public.company_profiles(user_id,organization_id,company_name)
select '11111111-1111-4111-8111-111111111111', active_organization_id, 'Keystone Cleaning'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.proposals(id,user_id,organization_id,title,client_name,client_email,contact_phone,service_location,facility_size,service_type,service_frequency,generated_content,service_specific_data,pricing_data)
select '33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',active_organization_id,'Turnover','Pat','pat@example.test','555','12 Elm',1500,'residential','one-time',
E'## Cover\nProperty: house.\nAccess: Lockbox 4821 side door.\nYour price: $280',
'{"catalogJob":{"catalogVersion":"2026-09-22.2","access":"Lockbox 4821","costs":{"wage":25}},"catalogSnapshot":{"version":"2026-09-22.2"},"estimateSnapshot":{"base":{"cost":191}}}','{"price_range":{"low":280,"high":280},"assumptions":{"labor_rate":31.25}}'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.proposal_tracking(proposal_id,tracking_id,delivery_method,recipient_email,subject,message) values ('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','online','pat@example.test','s','m'),('33333333-3333-4333-8333-333333333333','track_1790000000000_abc123xyz','online','pat@example.test','s','m');
