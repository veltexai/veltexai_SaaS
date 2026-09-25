insert into auth.users(id,email) values
 ('92000000-0000-4000-8000-000000000011','r2-concurrent-a@example.test'),
 ('92000000-0000-4000-8000-000000000012','r2-concurrent-b@example.test');
insert into public.organizations(id,name,slug,created_by) values
 ('92000000-0000-4000-8000-000000000001','R2 concurrency fixture','r2-concurrency-fixture','92000000-0000-4000-8000-000000000011');
insert into public.organization_memberships(organization_id,user_id,role) values
 ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000011','owner'),
 ('92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000012','owner');

