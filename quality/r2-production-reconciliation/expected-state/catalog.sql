-- Emit one canonical JSON array of OID-free atoms for the public schema.
-- psql must run this with tuples-only/unaligned output (-AtX).
with
tables as (
  select jsonb_build_object('kind','table','identity',c.relname,'value',jsonb_build_object(
    'persistence',c.relpersistence,'rls',c.relrowsecurity,'rls_forced',c.relforcerowsecurity,
    'replica_identity',c.relreplident,'partitioned',c.relkind='p',
    'reloptions',coalesce((select jsonb_agg(opt order by opt) from unnest(c.reloptions) opt),'[]'::jsonb))) atom
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')
    and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
), columns as (
  select jsonb_build_object('kind','column','identity',c.relname||'.'||a.attname,'value',jsonb_build_object(
    'position',a.attnum,'type',pg_catalog.format_type(a.atttypid,a.atttypmod),
    'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,
    'collation',case when a.attcollation=0 then null else coll.collname end,
    'default',case when d.oid is null then null else pg_get_expr(d.adbin,d.adrelid,false) end)) atom
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace
  left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  left join pg_collation coll on coll.oid=a.attcollation
  where n.nspname='public' and c.relkind in ('r','p','v','m') and a.attnum>0 and not a.attisdropped
    and not exists (select 1 from pg_depend x where x.classid='pg_class'::regclass and x.objid=c.oid and x.deptype='e')
), constraints as (
  select jsonb_build_object('kind','constraint','identity',c.relname||'.'||x.conname,'value',jsonb_build_object(
    'type',x.contype,'definition',pg_get_constraintdef(x.oid,true),'deferrable',x.condeferrable,
    'deferred',x.condeferred,'validated',x.convalidated)) atom
  from pg_constraint x join pg_class c on c.oid=x.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and not exists (select 1 from pg_depend d where d.classid='pg_constraint'::regclass and d.objid=x.oid and d.deptype='e')
), indexes as (
  select jsonb_build_object('kind','index','identity',i.relname,'value',jsonb_build_object(
    'table',t.relname,'definition',pg_get_indexdef(i.oid,0,true),'unique',x.indisunique,
    'primary',x.indisprimary,'valid',x.indisvalid,'ready',x.indisready,'live',x.indislive)) atom
  from pg_index x join pg_class i on i.oid=x.indexrelid join pg_class t on t.oid=x.indrelid
  join pg_namespace n on n.oid=t.relnamespace where n.nspname='public'
    and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=i.oid and d.deptype='e')
), functions as (
  select jsonb_build_object('kind','function','identity',p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
    'value',jsonb_build_object('definition',pg_get_functiondef(p.oid),'kind',p.prokind,
      'result',pg_get_function_result(p.oid),'language',l.lanname,
      'security_definer',p.prosecdef,'leakproof',p.proleakproof,'parallel',p.proparallel,
      'volatility',p.provolatile,'strict',p.proisstrict,'config',coalesce(to_jsonb(p.proconfig),'[]'::jsonb))) atom
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where n.nspname='public'
    and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
), views as (
  select jsonb_build_object('kind',case c.relkind when 'm' then 'materialized_view' else 'view' end,
    'identity',c.relname,'value',jsonb_build_object('definition',pg_get_viewdef(c.oid,true),
      'reloptions',coalesce((select jsonb_agg(opt order by opt) from unnest(c.reloptions) opt),'[]'::jsonb))) atom
  from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('v','m')
    and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
), triggers as (
  select jsonb_build_object('kind','trigger','identity',c.relname||'.'||t.tgname,'value',jsonb_build_object(
    'definition',pg_get_triggerdef(t.oid,true),'enabled',t.tgenabled)) atom
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and not t.tgisinternal
), policies as (
  select jsonb_build_object('kind','policy','identity',tablename||'.'||policyname,'value',jsonb_build_object(
    'permissive',permissive,'roles',to_jsonb(roles),'command',cmd,'using',qual,'check',with_check)) atom
  from pg_policies where schemaname='public'
), acls as (
  select jsonb_build_object('kind','acl','identity',o.object_kind||':'||o.object_identity||':'||
      case when a.grantee=o.owner_oid then 'OBJECT_OWNER' else coalesce(r.rolname,'PUBLIC') end||':'||a.privilege_type,
    'value',jsonb_build_object('object_kind',o.object_kind,'object',o.object_identity,
      'grantee',case when a.grantee=o.owner_oid then 'OBJECT_OWNER' else coalesce(r.rolname,'PUBLIC') end,
      'privilege',a.privilege_type,'grantable',a.is_grantable)) atom
  from (
    select (case c.relkind when 'S' then 'sequence' when 'v' then 'view' when 'm' then 'materialized_view' else 'table' end)::text object_kind,
      c.relname::text object_identity, c.relowner owner_oid,
      coalesce(c.relacl,acldefault(case when c.relkind='S' then 'S'::"char" else 'r'::"char" end,c.relowner)) acl
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p','v','m','S')
      and not exists (select 1 from pg_depend d where d.classid='pg_class'::regclass and d.objid=c.oid and d.deptype='e')
    union all
    select 'function'::text,(p.proname||'('||pg_get_function_identity_arguments(p.oid)||')')::text,p.proowner,
      coalesce(p.proacl,acldefault('f',p.proowner))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e')
    union all
    select 'schema'::text,'public'::text,n.nspowner,coalesce(n.nspacl,acldefault('n',n.nspowner))
    from pg_namespace n where n.nspname='public'
  ) o cross join lateral aclexplode(o.acl) a left join pg_roles r on r.oid=a.grantee
), types as (
  select jsonb_build_object('kind','type','identity',t.typname,'value',jsonb_strip_nulls(jsonb_build_object(
    'type_kind',t.typtype,'category',t.typcategory,'not_null',t.typnotnull,
    'base_type',case when t.typbasetype<>0 then format_type(t.typbasetype,t.typtypmod) end,
    'default',t.typdefault,'enum_labels',(select jsonb_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid=t.oid)))) atom
  from pg_type t join pg_namespace n on n.oid=t.typnamespace
  where n.nspname='public' and t.typtype in ('d','e')
    and not exists (select 1 from pg_depend d where d.classid='pg_type'::regclass and d.objid=t.oid and d.deptype='e')
), sequences as (
  select jsonb_build_object('kind','sequence','identity',s.sequencename,'value',jsonb_build_object(
    'data_type',s.data_type,'start',s.start_value,'minimum',s.min_value,'maximum',s.max_value,
    'increment',s.increment_by,'cycle',s.cycle,'cache',s.cache_size,'owned_by',ownership.owned_by)) atom
  from pg_sequences s
  left join lateral (
    select tc.relname||'.'||a.attname owned_by
    from pg_class sc
    join pg_namespace sn on sn.oid=sc.relnamespace
    join pg_depend d on d.classid='pg_class'::regclass and d.objid=sc.oid and d.deptype in ('a','i')
    join pg_class tc on tc.oid=d.refobjid
    join pg_attribute a on a.attrelid=tc.oid and a.attnum=d.refobjsubid
    where sn.nspname=s.schemaname and sc.relname=s.sequencename
  ) ownership on true
  where s.schemaname='public'
), extensions as (
  select jsonb_build_object('kind','extension','identity',e.extname,'value',jsonb_build_object(
    'schema',n.nspname,'version',e.extversion,'relocatable',e.extrelocatable)) atom
  from pg_extension e join pg_namespace n on n.oid=e.extnamespace
  where n.nspname='public'
), atoms as (
  select atom from tables union all select atom from columns union all select atom from constraints
  union all select atom from indexes union all select atom from functions union all select atom from views
  union all select atom from triggers union all select atom from policies union all select atom from acls
  union all select atom from types union all select atom from sequences union all select atom from extensions
), hashed as (
  select atom || jsonb_build_object(
    'value_sha256',encode(digest((atom->'value')::text,'sha256'),'hex')
  ) atom from atoms
), uniqueness as (
  select 1 / case when count(*)=count(distinct (atom->>'kind')||':'||(atom->>'identity')) then 1 else 0 end ok from atoms
)
-- CATALOG_TERMINAL_QUERY
select coalesce(jsonb_agg(atom order by atom->>'kind',atom->>'identity'),'[]'::jsonb)::text
from hashed cross join uniqueness where uniqueness.ok=1;
