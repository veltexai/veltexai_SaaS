-- R2 second security remediation.
-- Restores tenant-safe delivery setup and closes lifecycle/branding/privacy gaps.
begin;

-- Organizations are created only by the profile bootstrap in R2. Clients may
-- read/update through RLS, but cannot create, remove or truncate tenants.
revoke insert, delete, truncate on public.organizations from public, anon, authenticated;

-- The cleanup exception is valid only while nested under the profile-delete
-- trigger. A caller-controlled GUC alone is never sufficient.
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

-- Cleanup cascades delete the bootstrap membership after audit/outbox rows were
-- cleared. Do not recreate those rows during that one nested cleanup path.
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
  if tg_table_name = 'proposals' and tg_op = 'UPDATE' and auth.uid() is null
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

-- A signed-in owner/admin/estimator may create delivery tracking only for an
-- editable proposal in their tenant. Direct update/delete remains RPC/server-only.
drop policy if exists catalog_owner_guard on public.proposal_tracking;
create policy catalog_owner_guard on public.proposal_tracking as restrictive for all to public
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_organization_member(p.organization_id)
  ))
  with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
drop policy if exists proposal_tracking_organization_access on public.proposal_tracking;
create policy proposal_tracking_organization_read on public.proposal_tracking
  for select to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
create policy proposal_tracking_organization_insert on public.proposal_tracking
  for insert to authenticated with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));
revoke update, delete, truncate on public.proposal_tracking from anon, authenticated;
grant select, insert on public.proposal_tracking to authenticated;

-- Public proposal identity is organization-owned, never creator-personal.
create or replace function public.read_tracked_proposal(token text) returns jsonb
language sql stable security definer set search_path = pg_catalog, public as $$
 select jsonb_build_object('proposal', jsonb_build_object(
   'id',p.id,'title',p.title,'client_name',p.client_name,'client_company',p.client_company,
   'service_location',p.service_location,'service_type',p.service_type,
   'service_frequency',p.service_frequency,'facility_size',p.facility_size,
   'generated_content',case when p.service_specific_data ? 'catalogJob' then regexp_replace(p.generated_content, E'(^|\n)Access:[^\n]*', '', 'g') else p.generated_content end,'pricing_enabled',p.pricing_enabled,
   'pricing_data',jsonb_build_object('price_range',p.pricing_data->'price_range'),
   'status',p.status,'created_at',p.created_at,
   'catalog_document',coalesce(p.service_specific_data ? 'catalogJob',false),
   'company_profiles',jsonb_build_object(
      'company_name',coalesce(c.company_name,o.name,'Cleaning company'),
      'logo_url',c.logo_url)),
   'tracking',jsonb_build_object('id',t.id,'tracking_id',t.tracking_id,'proposal_id',t.proposal_id,
   'delivery_method',t.delivery_method,'track_opens',t.track_opens,'track_downloads',t.track_downloads))
 from public.proposal_tracking t
 join public.proposals p on p.id=t.proposal_id
 join public.organizations o on o.id=p.organization_id
 left join public.company_profiles c on c.organization_id=p.organization_id
 where t.tracking_id=token and length(token)>=20 limit 1;
$$;
revoke all on function public.read_tracked_proposal(text) from public;
grant execute on function public.read_tracked_proposal(text) to anon, authenticated;

-- Raw service-cost profiles are restricted to operational editors. Viewers
-- receive no wage/cost/overhead fields through direct table access.
drop policy if exists business_service_profiles_organization_read on public.business_service_profiles;
create policy business_service_profiles_organization_read on public.business_service_profiles
  for select to authenticated using (public.can_edit_organization_work(organization_id));

-- UUID ordering is not event ordering. Persist a monotonic sequence and use it
-- after availability time when workers claim pending events.
alter table public.organization_event_outbox
  add column event_sequence bigint generated always as identity;
create unique index organization_event_outbox_event_sequence_idx
  on public.organization_event_outbox(event_sequence);
drop index if exists public.organization_event_outbox_delivery_order_idx;
create index organization_event_outbox_delivery_order_idx
  on public.organization_event_outbox(available_at, event_sequence)
  where delivered_at is null;

commit;
