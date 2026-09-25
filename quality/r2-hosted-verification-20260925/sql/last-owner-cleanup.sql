delete from public.organization_memberships where organization_id='92000000-0000-4000-8000-000000000001';
delete from public.organizations where id='92000000-0000-4000-8000-000000000001';
delete from public.organizations where created_by in ('92000000-0000-4000-8000-000000000011','92000000-0000-4000-8000-000000000012');
delete from auth.users where id in ('92000000-0000-4000-8000-000000000011','92000000-0000-4000-8000-000000000012');
