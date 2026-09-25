-- Focused non-row metadata assertion after the legacy-view migration.
-- Does not repeat the completed R0 role matrix or select customer data.
do $$
declare caller text;
begin
  if not exists(select 1 from pg_class where oid='public.enhanced_proposals'::regclass
    and 'security_invoker=true'=any(coalesce(reloptions,array[]::text[]))) then
    raise exception 'Legacy proposal view can bypass caller RLS';
  end if;
  foreach caller in array array['anon','authenticated'] loop
    if has_table_privilege(caller,'public.enhanced_proposals','select')
       or has_any_column_privilege(caller,'public.enhanced_proposals','select') then
      raise exception 'Client % can read legacy proposal view',caller;
    end if;
  end loop;
  if not has_table_privilege('service_role','public.enhanced_proposals','select') then
    raise exception 'Trusted reporting access missing';
  end if;
end $$;
select 'legacy proposal view access restricted' as result;
