-- R2 third security remediation.
-- Corrects private-account deletion ordering and closes remaining lifecycle noise.
begin;

-- Empty-account cleanup deletes the bootstrap organization while the profile
-- row is itself being removed.  These two references must therefore be checked
-- at transaction end, after both rows are gone.  NO ACTION remains fail-closed
-- for any organization or active-profile reference that survives the statement.
alter table public.organizations drop constraint if exists organizations_created_by_fkey;
alter table public.organizations add constraint organizations_created_by_fkey
  foreign key (created_by) references public.profiles(id)
  on delete no action deferrable initially deferred;

alter table public.profiles drop constraint if exists profiles_active_organization_id_fkey;
alter table public.profiles add constraint profiles_active_organization_id_fkey
  foreign key (active_organization_id) references public.organizations(id)
  on delete no action deferrable initially deferred;

-- A private bootstrap tenant may disappear only with its sole owner and only
-- when every tenant-owned RESTRICT reference permits it.  Infrastructure rows
-- are removed first so no audit record can retain a deleted organization id.
create or replace function public.delete_empty_private_organization()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare tenant_id uuid;
begin
  for tenant_id in
    select o.id from public.organizations o
    where o.created_by = old.id
      and (select count(*) from public.organization_memberships m
           where m.organization_id = o.id) = 1
      and exists (
        select 1 from public.organization_memberships m
        where m.organization_id = o.id and m.user_id = old.id and m.role = 'owner'
      )
  loop
    perform set_config('r2.private_cleanup', tenant_id::text, true);
    delete from public.organization_event_inbox where organization_id = tenant_id;
    delete from public.organization_event_outbox where organization_id = tenant_id;
    delete from public.organization_audit_log where organization_id = tenant_id;
    delete from public.organizations where id = tenant_id;
  end loop;
  return old;
end $$;
revoke all on function public.delete_empty_private_organization() from public, anon, authenticated;

-- A service process may stage an organization and its bootstrap owner in one
-- transaction, but an ownerless tenant can never commit.
create or replace function public.require_organization_owner()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.organizations o where o.id = new.id) then
    return null;
  end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = new.id
      and m.user_id = new.created_by
      and m.role = 'owner'
  ) then
    raise exception 'organization must commit with its creator as owner'
      using errcode = '23514';
  end if;
  return null;
end $$;
revoke all on function public.require_organization_owner() from public, anon, authenticated;
drop trigger if exists require_organization_owner_on_commit on public.organizations;
create constraint trigger require_organization_owner_on_commit
  after insert or update of created_by on public.organizations
  deferrable initially deferred for each row
  execute function public.require_organization_owner();

-- View counters are delivery telemetry, not organization mutations.  Suppress
-- audit/outbox noise whether the public recipient is anonymous or signed in as
-- a user who is not a member of the proposal organization.
create or replace function public.record_organization_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare row_data jsonb; tenant_id uuid; record_id text; verb text; details jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  tenant_id := case when tg_table_name = 'organizations'
    then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
  if tg_op = 'DELETE' and pg_trigger_depth() >= 2
     and current_setting('r2.private_cleanup', true) = tenant_id::text then
    return old;
  end if;
  if tg_table_name = 'proposals' and tg_op = 'UPDATE'
     and (to_jsonb(new) - array['view_count','last_viewed_at','updated_at'])
       = (to_jsonb(old) - array['view_count','last_viewed_at','updated_at']) then
    return new;
  end if;
  record_id := coalesce(row_data->>'id', row_data->>'user_id', tenant_id::text);
  verb := lower(tg_op);
  details := jsonb_build_object('operation', tg_op);
  if tg_table_name = 'organization_memberships' then
    details := details || jsonb_build_object(
      'old_role', case when tg_op = 'INSERT' then null else old.role end,
      'new_role', case when tg_op = 'DELETE' then null else new.role end
    );
  end if;
  insert into public.organization_audit_log(
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (tenant_id, auth.uid(), tg_table_name || '.' || verb,
    tg_table_name, record_id, details);
  insert into public.organization_event_outbox(
    organization_id, event_type, aggregate_type, aggregate_id, payload
  ) values (tenant_id, tg_table_name || '.' || verb, tg_table_name, record_id,
    details || jsonb_build_object('record_id', record_id));
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.record_organization_change() from public, anon, authenticated;

commit;
