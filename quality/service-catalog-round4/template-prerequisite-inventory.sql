-- Read-only structural inventory for schema-faithful preview restoration.
-- No customer, subscription, template-content or credential rows are selected.
select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public'
and table_name in ('proposal_templates','template_tier_access') order by table_name,ordinal_position;

select c.relname, con.conname, pg_get_constraintdef(con.oid) as definition
from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('proposal_templates','template_tier_access') order by 1,2;

select tablename,indexname,indexdef from pg_indexes where schemaname='public'
and tablename in ('proposal_templates','template_tier_access') order by 1,2;

select tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('proposal_templates','template_tier_access') order by 1,2;

select c.relname,c.relrowsecurity,c.relforcerowsecurity,c.relacl
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
and c.relname in ('proposal_templates','template_tier_access');

select c.relname,t.tgname,pg_get_triggerdef(t.oid) as definition
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('proposal_templates','template_tier_access') and not t.tgisinternal;

select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,
p.proacl,pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('can_user_access_template','get_user_accessible_templates');
