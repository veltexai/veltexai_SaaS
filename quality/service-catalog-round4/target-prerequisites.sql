-- Read-only, fail-closed structural preflight. Does not select application rows or secrets.
-- Run before the catalog migrations in a freshly provisioned or drifted target.
do $$
declare item record; actual text;
begin
  for item in select * from (values
    ('marketing_funnel_events','id','uuid'),
    ('marketing_funnel_events','event_name','text'),
    ('marketing_funnel_events','user_id','uuid'),
    ('marketing_funnel_events','properties','jsonb'),
    ('marketing_funnel_events','occurred_at','timestamp with time zone'),
    ('marketing_attribution','user_id','uuid'),
    ('marketing_attribution','first_touch','jsonb'),
    ('profiles','id','uuid'),
    ('profiles','is_internal','boolean'),
    ('proposals','service_specific_data','jsonb')
  ) as requirements(table_name,column_name,data_type) loop
    select c.data_type into actual from information_schema.columns c
      where c.table_schema='public' and c.table_name=item.table_name and c.column_name=item.column_name;
    if actual is distinct from item.data_type then
      raise exception 'Release prerequisite public.%.% requires %, found %; reconcile target drift before catalog migration',
        item.table_name,item.column_name,item.data_type,coalesce(actual,'MISSING');
    end if;
  end loop;
end $$;
select 'catalog structural prerequisites present' as result;
