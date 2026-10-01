(select jsonb_agg(jsonb_build_object('role',role_name,'kind',kind,'object',object_name,'privilege',privilege,'allowed',allowed)
 order by role_name collate "C",kind collate "C",object_name collate "C",privilege collate "C") from (
  select r.role_name,'schema'::text kind,'public'::text object_name,p.privilege,
    has_schema_privilege(r.role_name,'public',p.privilege) allowed
  from (values('anon'),('authenticated'),('service_role')) r(role_name)
  cross join (values('USAGE'),('CREATE')) p(privilege)
  union all
  select r.role_name,case when c.relkind='S' then 'sequence' else 'relation' end,c.relname,p.privilege,
    case when c.relkind='S' then has_sequence_privilege(r.role_name,c.oid,p.privilege)
         when p.privilege='MAINTAIN' and current_setting('server_version_num')::int<170000 then false
         else has_table_privilege(r.role_name,c.oid,p.privilege) end
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
  cross join lateral (select privilege from unnest(case when c.relkind='S' then array['USAGE','SELECT','UPDATE']
    else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] end) privilege) p
  where n.nspname='public' and c.relkind in ('r','p','v','m','S')
    and not exists(select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
  union all
  select r.role_name,'function',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')','EXECUTE',
    has_function_privilege(r.role_name,p.oid,'EXECUTE')
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join (values('anon'),('authenticated'),('service_role')) r(role_name)
  where n.nspname='public' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
) matrix)
