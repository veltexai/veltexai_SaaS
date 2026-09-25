-- R2 cleanup guard ordering correction.
-- During an organization DELETE cascade, the organization row is no longer
-- visible to the membership trigger. The cleanup authorization must therefore
-- rely on trigger nesting, the private organization token and the sole-owner
-- invariant, not a lookup of the row currently being deleted.
begin;

create or replace function public.guard_organization_membership()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare bootstrap_owner boolean; tenant_id uuid; owner_count integer;
begin
  tenant_id := case when tg_op = 'INSERT' then new.organization_id else old.organization_id end;
  perform 1 from public.organizations where id = tenant_id for update;
  bootstrap_owner := tg_op = 'INSERT' and new.role = 'owner'
    and pg_trigger_depth() >= 2
    and exists (select 1 from public.organizations o
                where o.id = new.organization_id and o.created_by = new.user_id)
    and not exists (select 1 from public.organization_memberships m
                    where m.organization_id = new.organization_id);
  if tg_op = 'DELETE'
     and pg_trigger_depth() >= 2
     and current_setting('r2.private_cleanup', true) = old.organization_id::text
     and (select count(*) from public.organization_memberships m
          where m.organization_id = old.organization_id) = 1 then
    return old;
  end if;
  if not bootstrap_owner then
    raise exception 'team memberships are disabled until invitation consent and seat billing ship'
      using errcode = '42501';
  end if;
  if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner') then
    select count(*) into owner_count from public.organization_memberships
    where organization_id = old.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'organization must retain at least one owner' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.guard_organization_membership() from public, anon, authenticated;

commit;
