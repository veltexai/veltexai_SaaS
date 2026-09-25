-- R2 Claude security remediation.
-- Team mutation stays fail-closed until invitation consent and seat billing ship.
begin;

-- A profile with no tenant-owned work must be deletable. Tenant-owned records
-- continue to block deletion through their organization ON DELETE RESTRICT FKs.
alter table public.organizations drop constraint organizations_created_by_fkey;
alter table public.organizations add constraint organizations_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete cascade;

-- Profile deletion may remove a private, empty bootstrap tenant. Audit/event
-- rows created by the bootstrap are cleared first; any real tenant-owned work
-- still blocks the organization delete through its RESTRICT foreign key.
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
    delete from public.organization_event_inbox where organization_id = tenant_id;
    delete from public.organization_event_outbox where organization_id = tenant_id;
    delete from public.organization_audit_log where organization_id = tenant_id;
    perform set_config('r2.private_cleanup', tenant_id::text, true);
    delete from public.organizations where id = tenant_id;
  end loop;
  return old;
end $$;
revoke all on function public.delete_empty_private_organization() from public, anon, authenticated;
drop trigger if exists delete_empty_private_organization_before_profile on public.profiles;
create trigger delete_empty_private_organization_before_profile
  before delete on public.profiles for each row
  execute function public.delete_empty_private_organization();

-- No one may create live cross-tenant access before consent-bound invitations
-- and seat billing are implemented. Bootstrap remains trigger-internal.
drop policy if exists memberships_manager_insert on public.organization_memberships;
drop policy if exists memberships_manager_update on public.organization_memberships;
drop policy if exists memberships_manager_delete on public.organization_memberships;
revoke insert, update, delete, truncate on public.organization_memberships from public, anon, authenticated;

create or replace function public.guard_organization_membership()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare bootstrap_owner boolean; tenant_id uuid; owner_count integer;
begin
  tenant_id := case when tg_op = 'INSERT' then new.organization_id else old.organization_id end;
  perform 1 from public.organizations where id = tenant_id for update;
  bootstrap_owner := tg_op = 'INSERT' and new.role = 'owner'
    and exists (select 1 from public.organizations o
                where o.id = new.organization_id and o.created_by = new.user_id)
    and not exists (select 1 from public.organization_memberships m
                    where m.organization_id = new.organization_id);
  if tg_op = 'DELETE'
     and current_setting('r2.private_cleanup', true) = old.organization_id::text
     and exists (select 1 from public.organizations o
                 where o.id = old.organization_id and o.created_by = old.user_id)
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

-- Viewers cannot read raw proposal JSON because it contains costs, wages and
-- margins. A redacted projection can be introduced as a later reviewed API.
drop policy if exists proposals_organization_read on public.proposals;
create policy proposals_organization_read on public.proposals
  for select to authenticated using (public.can_edit_organization_work(organization_id));

-- Remove creator-only policies that allow attaching rows to a proposal owned
-- by another tenant. Every dependent row inherits the parent proposal tenant.
drop policy if exists "Users can view own pdf exports" on public.pdf_exports;
drop policy if exists "Users can create own pdf exports" on public.pdf_exports;
drop policy if exists "Users can delete own pdf exports" on public.pdf_exports;
drop policy if exists pdf_exports_organization_read on public.pdf_exports;
drop policy if exists pdf_exports_organization_insert on public.pdf_exports;
drop policy if exists pdf_exports_organization_delete on public.pdf_exports;
create policy pdf_exports_organization_read on public.pdf_exports
  for select to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
create policy pdf_exports_organization_insert on public.pdf_exports
  for insert to authenticated with check (
    user_id = auth.uid() and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
    )
  );
create policy pdf_exports_organization_delete on public.pdf_exports
  for delete to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_manage_organization(p.organization_id)
  ));
revoke all on public.pdf_exports from anon;
revoke truncate on public.pdf_exports from public, authenticated;

drop policy if exists admin_all_pas on public.proposal_additional_services;
drop policy if exists "Admins can manage proposal add-ons" on public.proposal_additional_services;
drop policy if exists owner_pas_select on public.proposal_additional_services;
drop policy if exists owner_pas_insert on public.proposal_additional_services;
drop policy if exists owner_pas_update on public.proposal_additional_services;
drop policy if exists owner_pas_delete on public.proposal_additional_services;
drop policy if exists proposal_addons_organization_read on public.proposal_additional_services;
drop policy if exists proposal_addons_organization_insert on public.proposal_additional_services;
drop policy if exists proposal_addons_organization_update on public.proposal_additional_services;
drop policy if exists proposal_addons_organization_delete on public.proposal_additional_services;
create policy proposal_addons_organization_read on public.proposal_additional_services
  for select to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
create policy proposal_addons_organization_insert on public.proposal_additional_services
  for insert to authenticated with check (
    created_by = auth.uid() and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
    )
  );
create policy proposal_addons_organization_update on public.proposal_additional_services
  for update to authenticated
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ))
  with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
create policy proposal_addons_organization_delete on public.proposal_additional_services
  for delete to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));

-- Public delivery entitlement follows the immutable organization billing
-- owner, not whichever collaborator originally created a proposal.
create or replace function public.tracked_proposal_has_paid_access(token text) returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select coalesce(
    case
      when pr.subscription_status = 'free_trial' then false
      when latest.status is not null then latest.status = 'active'
      else pr.subscription_status = 'active'
    end,
    false
  )
  from public.proposal_tracking t
  join public.proposals p on p.id = t.proposal_id
  join public.organizations o on o.id = p.organization_id
  join public.profiles pr on pr.id = o.created_by
  left join lateral (
    select s.status from public.subscriptions s
    where s.user_id = o.created_by and s.status in ('active', 'trialing')
    order by s.created_at desc limit 1
  ) latest on true
  where t.tracking_id = token and length(token) >= 20;
$$;
revoke all on function public.tracked_proposal_has_paid_access(text) from public;
grant execute on function public.tracked_proposal_has_paid_access(text) to anon, authenticated;

-- Do not turn anonymous engagement counters into tenant audit/outbox noise.
-- Membership audit records preserve the exact old/new role transition.
create or replace function public.record_organization_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare row_data jsonb; tenant_id uuid; record_id text; verb text; details jsonb;
begin
  if tg_table_name = 'proposals' and tg_op = 'UPDATE' and auth.uid() is null
     and (to_jsonb(new) - array['view_count','last_viewed_at','updated_at'])
       = (to_jsonb(old) - array['view_count','last_viewed_at','updated_at']) then
    return new;
  end if;
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  tenant_id := case when tg_table_name = 'organizations'
    then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
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

-- Explicitly deny destructive/direct tracking and infrastructure operations.
revoke insert, update, delete, truncate on public.proposal_tracking from anon, authenticated;
grant select on public.proposal_tracking to authenticated;
revoke insert, update, delete, truncate on public.organization_audit_log from public, anon, authenticated;
revoke all on public.organization_event_outbox, public.organization_event_inbox from public, anon, authenticated;
create index if not exists organization_event_outbox_delivery_order_idx
  on public.organization_event_outbox(available_at, occurred_at, id)
  where delivered_at is null;

commit;
