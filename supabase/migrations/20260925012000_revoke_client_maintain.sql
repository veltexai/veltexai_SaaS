-- PostgreSQL 17 added MAINTAIN. PG17-only grammar stays in dynamic SQL so the
-- canonical PG16 replay remains a parseable no-op.
do $$
declare
  unsafe_default_count integer;
  provider_variance_count integer;
  violation text;
begin
  if current_setting('server_version_num')::integer >= 170000 then
    if current_user <> 'postgres' then
      raise exception 'MAINTAIN repair requires current_user postgres';
    end if;

    select format('%s:%s', owner_role.rolname, c.relname) into violation
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_roles owner_role on owner_role.oid = c.relowner
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and owner_role.rolname <> 'postgres'
      and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.refclassid = 'pg_extension'::regclass and d.deptype = 'e')
    order by owner_role.rolname, c.relname limit 1;
    if violation is not null then
      raise exception 'non-extension public application relation is not postgres-owned: %', violation;
    end if;

    if exists (select 1 from pg_auth_members membership join pg_roles member_role on member_role.oid = membership.member where member_role.rolname in ('anon', 'authenticated')) then
      raise exception 'upward client role membership prevents safe MAINTAIN repair';
    end if;

    select count(*)::integer,
      count(*) filter (where owner_role.rolname = 'supabase_admin' and n.nspname = 'public' and defaults.defaclnamespace <> 0
        and grantee_role.rolname in ('anon', 'authenticated') and privilege.is_grantable = false)::integer
    into unsafe_default_count, provider_variance_count
    from pg_default_acl defaults join pg_roles owner_role on owner_role.oid = defaults.defaclrole
    left join pg_namespace n on n.oid = defaults.defaclnamespace
    cross join lateral aclexplode(defaults.defaclacl) privilege
    left join pg_roles grantee_role on grantee_role.oid = privilege.grantee
    where defaults.defaclobjtype = 'r' and (defaults.defaclnamespace = 0 or n.nspname = 'public')
      and privilege.privilege_type = 'MAINTAIN'
      and (privilege.grantee = 0 or grantee_role.rolname in ('anon', 'authenticated'));

    -- The postgres pair may already be absent on an idempotent replay; the
    -- dormant provider pair must remain exact.
    if unsafe_default_count not in (2, 4) or provider_variance_count <> 2 or not exists (select 1 from pg_roles where rolname = 'supabase_admin') then
      raise exception 'unexpected MAINTAIN default ACL topology: unsafe %, provider variance %', unsafe_default_count, provider_variance_count;
    end if;
    if exists (
      select 1 from pg_default_acl defaults join pg_roles owner_role on owner_role.oid = defaults.defaclrole
      left join pg_namespace n on n.oid = defaults.defaclnamespace
      cross join lateral aclexplode(defaults.defaclacl) privilege
      left join pg_roles grantee_role on grantee_role.oid = privilege.grantee
      where defaults.defaclobjtype = 'r' and (defaults.defaclnamespace = 0 or n.nspname = 'public')
        and privilege.privilege_type = 'MAINTAIN' and (privilege.grantee = 0 or grantee_role.rolname in ('anon', 'authenticated'))
        and not (
          owner_role.rolname = 'postgres' and n.nspname = 'public' and defaults.defaclnamespace <> 0
          and grantee_role.rolname in ('anon', 'authenticated') and privilege.is_grantable = false
        )
        and not (
          owner_role.rolname = 'supabase_admin' and n.nspname = 'public' and defaults.defaclnamespace <> 0
          and grantee_role.rolname in ('anon', 'authenticated') and privilege.is_grantable = false
        )
    ) then
      raise exception 'unsafe MAINTAIN default is outside the exact postgres/provider policy';
    end if;

    execute 'revoke maintain on all tables in schema public from public, anon, authenticated';
    execute 'alter default privileges for role postgres in schema public revoke maintain on tables from public, anon, authenticated';

    execute $effective$
      select format('%s:%s', client.rolname, c.relname)
      from pg_class c join pg_namespace n on n.oid = c.relnamespace cross join pg_roles client
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f') and client.rolname in ('anon', 'authenticated')
        and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.refclassid = 'pg_extension'::regclass and d.deptype = 'e')
        and has_table_privilege(client.oid, c.oid, 'MAINTAIN')
      order by client.rolname, c.relname limit 1
    $effective$ into violation;
    if violation is not null then raise exception 'effective client MAINTAIN remains after repair: %', violation; end if;

    execute $public_acl$
      select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) privilege
      where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
        and privilege.grantee = 0 and privilege.privilege_type = 'MAINTAIN'
      order by c.relname limit 1
    $public_acl$ into violation;
    if violation is not null then raise exception 'PUBLIC MAINTAIN remains after repair: %', violation; end if;

    select count(*)::integer into provider_variance_count
    from pg_default_acl defaults join pg_roles owner_role on owner_role.oid = defaults.defaclrole
    join pg_namespace n on n.oid = defaults.defaclnamespace cross join lateral aclexplode(defaults.defaclacl) privilege
    join pg_roles grantee_role on grantee_role.oid = privilege.grantee
    where defaults.defaclobjtype = 'r' and n.nspname = 'public' and owner_role.rolname = 'supabase_admin'
      and grantee_role.rolname in ('anon', 'authenticated') and privilege.privilege_type = 'MAINTAIN' and privilege.is_grantable = false;
    if provider_variance_count <> 2 then raise exception 'supabase_admin provider variance changed during repair'; end if;
  end if;
end
$$;
