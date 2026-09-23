-- Synthetic fixtures used in round 3 (exact). Two synthetic auth users (owner/other), a v2 catalog
-- proposal with planted sentinels (access "Lockbox 4821", wage-derived labor_rate 31.25, client email
-- pat@example.test, cost snapshot) and two tracking tokens (UUID and legacy track_<ms>_<rand> format).
-- All values are fictitious; .test/.example domains only.
insert into auth.users(id,email) values ('11111111-1111-4111-8111-111111111111','owner@example.test'),('22222222-2222-4222-8222-222222222222','other@example.test');
update public.profiles set subscription_status='active' where id in ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into public.company_profiles(user_id,company_name) values ('11111111-1111-4111-8111-111111111111','Keystone Cleaning');
insert into public.proposals(id,user_id,title,client_name,client_email,contact_phone,service_location,facility_size,service_type,service_frequency,generated_content,service_specific_data,pricing_data)
values ('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Turnover','Pat','pat@example.test','555','12 Elm',1500,'residential','one-time',
E'## Cover\nProperty: house.\nAccess: Lockbox 4821 side door.\nYour price: $280',
'{"catalogJob":{"catalogVersion":"2026-09-22.2","access":"Lockbox 4821","costs":{"wage":25}},"catalogSnapshot":{"version":"2026-09-22.2"},"estimateSnapshot":{"base":{"cost":191}}}','{"price_range":{"low":280,"high":280},"assumptions":{"labor_rate":31.25}}');
insert into public.proposal_tracking(proposal_id,tracking_id,delivery_method,recipient_email,subject,message) values ('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','online','pat@example.test','s','m'),('33333333-3333-4333-8333-333333333333','track_1790000000000_abc123xyz','online','pat@example.test','s','m');
