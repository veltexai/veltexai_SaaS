-- R2 organization/tenancy foundation.
-- Additive migration: legacy user_id ownership is retained during compatibility.
begin;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'estimator', 'viewer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_memberships_user_idx
  on public.organization_memberships(user_id, organization_id);

alter table public.profiles add column active_organization_id uuid
  references public.organizations(id) on delete set null;

-- SECURITY DEFINER helpers never accept a caller-supplied user id. They bind
-- identity to auth.uid() and expose only membership facts needed by RLS.
create function public.is_organization_member(target_organization uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.organization_memberships m
    where m.organization_id = target_organization and m.user_id = auth.uid()
  );
$$;

create function public.organization_role(target_organization uuid)
returns text language sql stable security definer
set search_path = pg_catalog, public as $$
  select m.role from public.organization_memberships m
  where m.organization_id = target_organization and m.user_id = auth.uid();
$$;

create function public.can_manage_organization(target_organization uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select coalesce(public.organization_role(target_organization) in ('owner', 'admin'), false);
$$;

create function public.can_edit_organization_work(target_organization uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select coalesce(public.organization_role(target_organization) in ('owner', 'admin', 'estimator'), false);
$$;

revoke all on function public.is_organization_member(uuid) from public, anon;
revoke all on function public.organization_role(uuid) from public, anon;
revoke all on function public.can_manage_organization(uuid) from public, anon;
revoke all on function public.can_edit_organization_work(uuid) from public, anon;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;
grant execute on function public.organization_role(uuid) to authenticated, service_role;
grant execute on function public.can_manage_organization(uuid) to authenticated, service_role;
grant execute on function public.can_edit_organization_work(uuid) to authenticated, service_role;

-- Every existing profile receives a private organization. This keeps every
-- existing record visible to exactly its historical owner after backfill.
do $$
declare p record; new_organization uuid;
begin
  for p in select id, company_name, full_name from public.profiles order by created_at, id loop
    if not exists (select 1 from public.organization_memberships where user_id = p.id) then
      insert into public.organizations(name, slug, created_by)
      values (
        coalesce(nullif(trim(p.company_name), ''), nullif(trim(p.full_name), ''), 'My cleaning company'),
        'org-' || replace(p.id::text, '-', ''),
        p.id
      ) returning id into new_organization;
      insert into public.organization_memberships(organization_id, user_id, role)
      values (new_organization, p.id, 'owner');
    end if;
  end loop;
end $$;

update public.profiles p set active_organization_id = (
  select m.organization_id from public.organization_memberships m
  where m.user_id = p.id order by (m.role = 'owner') desc, m.created_at limit 1
) where active_organization_id is null;

-- New profiles receive their organization after the existing signup trigger
-- creates the profile. The function is not client executable.
create function public.create_default_organization_for_profile()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare new_organization uuid;
begin
  insert into public.organizations(name, slug, created_by)
  values (
    coalesce(nullif(trim(new.company_name), ''), nullif(trim(new.full_name), ''), 'My cleaning company'),
    'org-' || replace(new.id::text, '-', ''),
    new.id
  ) returning id into new_organization;
  insert into public.organization_memberships(organization_id, user_id, role)
  values (new_organization, new.id, 'owner');
  update public.profiles set active_organization_id = new_organization where id = new.id;
  return new;
end $$;
revoke all on function public.create_default_organization_for_profile() from public, anon, authenticated;
create trigger create_default_organization_after_profile
  after insert on public.profiles for each row
  execute function public.create_default_organization_for_profile();

-- Active organization must always be one of the user's memberships.
create function public.guard_active_organization()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if new.active_organization_id is not null and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = new.active_organization_id and m.user_id = new.id
  ) then
    raise exception 'active organization must be a current membership' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_active_organization() from public, anon, authenticated;
create trigger guard_profile_active_organization
  before insert or update of active_organization_id on public.profiles
  for each row execute function public.guard_active_organization();

-- Prevent organization reassignment, unauthorized owner grants and removal of
-- the last owner. Server-side invitations can use service_role after validating
-- the invitation token and intended role.
create function public.guard_organization_membership()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare acting_role text; owner_count integer; bootstrap_owner boolean;
begin
  if tg_op = 'UPDATE' and new.organization_id is distinct from old.organization_id then
    raise exception 'membership organization cannot be changed' using errcode = '42501';
  end if;
  bootstrap_owner := tg_op = 'INSERT' and new.role = 'owner'
    and exists (
      select 1 from public.organizations o
      where o.id = new.organization_id and o.created_by = new.user_id
    )
    and not exists (
      select 1 from public.organization_memberships m
      where m.organization_id = new.organization_id
    );
  if not bootstrap_owner and not (
    current_setting('role', true) = 'service_role'
    or (
      coalesce(current_setting('role', true), 'none') = 'none'
      and session_user in ('service_role', 'postgres', 'supabase_admin')
    )
  ) then
    acting_role := public.organization_role(coalesce(new.organization_id, old.organization_id));
    if acting_role not in ('owner', 'admin') then
      raise exception 'membership management requires owner or admin' using errcode = '42501';
    end if;
    if coalesce(new.role, '') = 'owner' and acting_role <> 'owner' then
      raise exception 'only an owner can grant owner role' using errcode = '42501';
    end if;
    if tg_op in ('UPDATE', 'DELETE') and old.role = 'owner'
       and (tg_op = 'DELETE' or new.role <> 'owner') and acting_role <> 'owner' then
      raise exception 'only an owner can revoke owner role' using errcode = '42501';
    end if;
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
create trigger guard_organization_membership_changes
  before insert or update or delete on public.organization_memberships
  for each row execute function public.guard_organization_membership();

-- Introduce organization ownership without deleting legacy creator attribution.
alter table public.proposals add column organization_id uuid references public.organizations(id) on delete restrict;
update public.proposals p set organization_id = (
  select m.organization_id from public.organization_memberships m
  where m.user_id = p.user_id order by (m.role = 'owner') desc, m.created_at limit 1
) where organization_id is null;
alter table public.proposals alter column organization_id set not null;
create index proposals_organization_idx on public.proposals(organization_id, created_at desc);

alter table public.business_service_profiles add column organization_id uuid references public.organizations(id) on delete restrict;
update public.business_service_profiles b set organization_id = (
  select m.organization_id from public.organization_memberships m
  where m.user_id = b.user_id order by (m.role = 'owner') desc, m.created_at limit 1
) where organization_id is null;
alter table public.business_service_profiles alter column organization_id set not null;
create unique index business_service_profiles_organization_idx
  on public.business_service_profiles(organization_id);

alter table public.company_profiles add column organization_id uuid references public.organizations(id) on delete restrict;
update public.company_profiles c set organization_id = (
  select m.organization_id from public.organization_memberships m
  where m.user_id = c.user_id order by (m.role = 'owner') desc, m.created_at limit 1
) where organization_id is null;

alter table public.user_branding_settings add column organization_id uuid references public.organizations(id) on delete restrict;
update public.user_branding_settings b set organization_id = (
  select m.organization_id from public.organization_memberships m
  where m.user_id = b.user_id order by (m.role = 'owner') desc, m.created_at limit 1
) where organization_id is null;

do $$ begin
  if exists (select 1 from public.company_profiles where organization_id is null)
     or exists (select 1 from public.user_branding_settings where organization_id is null) then
    raise exception 'organization backfill found company/branding rows without a valid user owner';
  end if;
end $$;
alter table public.company_profiles alter column organization_id set not null;
alter table public.user_branding_settings alter column organization_id set not null;
create unique index company_profiles_organization_idx on public.company_profiles(organization_id);
create unique index user_branding_settings_organization_idx on public.user_branding_settings(organization_id);

-- Compatibility bridge for clients deployed before R2: derive the tenant from
-- the authenticated creator's active membership when organization_id is absent.
create function public.assign_active_organization()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare candidate uuid;
begin
  if new.organization_id is null then
    select p.active_organization_id into candidate from public.profiles p
    where p.id = auth.uid();
    if candidate is null or not public.can_edit_organization_work(candidate) then
      raise exception 'an active editable organization is required' using errcode = '42501';
    end if;
    new.organization_id := candidate;
  end if;
  return new;
end $$;
revoke all on function public.assign_active_organization() from public, anon, authenticated;
create trigger assign_proposal_organization before insert on public.proposals
  for each row execute function public.assign_active_organization();
create trigger assign_business_profile_organization before insert on public.business_service_profiles
  for each row execute function public.assign_active_organization();
create trigger assign_company_profile_organization before insert on public.company_profiles
  for each row execute function public.assign_active_organization();
create trigger assign_branding_organization before insert on public.user_branding_settings
  for each row execute function public.assign_active_organization();

-- Shared event infrastructure. Browser roles cannot forge audit entries or
-- delivery state. Service processes claim outbox events and deduplicate inbox.
create table public.organization_audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null check (length(action) between 1 and 120),
  entity_type text not null check (length(entity_type) between 1 and 120),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);
create index organization_audit_log_lookup_idx
  on public.organization_audit_log(organization_id, occurred_at desc);

create table public.organization_event_outbox (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  event_id uuid not null default gen_random_uuid(),
  event_type text not null check (length(event_type) between 1 and 160),
  aggregate_type text not null check (length(aggregate_type) between 1 and 120),
  aggregate_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  delivered_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  unique (organization_id, event_id)
);
create index organization_event_outbox_pending_idx
  on public.organization_event_outbox(available_at, occurred_at)
  where delivered_at is null;

create table public.organization_event_inbox (
  consumer text not null,
  event_id uuid not null,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  received_at timestamptz not null default now(),
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  primary key (consumer, event_id)
);

create function public.guard_organization_owned_record()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
declare old_data jsonb; new_data jsonb;
begin
  old_data := to_jsonb(old);
  new_data := to_jsonb(new);
  if tg_op = 'UPDATE' and new_data->>'organization_id' is distinct from old_data->>'organization_id' then
    raise exception 'organization ownership cannot be changed in place' using errcode = '42501';
  end if;
  if tg_table_name = 'organizations' and tg_op = 'UPDATE'
     and new_data->>'created_by' is distinct from old_data->>'created_by' then
    raise exception 'organization creator attribution is immutable' using errcode = '42501';
  end if;
  if tg_table_name in ('proposals', 'business_service_profiles', 'company_profiles', 'user_branding_settings') and tg_op = 'UPDATE'
     and new_data->>'user_id' is distinct from old_data->>'user_id' then
    raise exception 'creator attribution cannot be changed in place' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_organization_owned_record() from public, anon, authenticated;
create trigger guard_organization_identity before update on public.organizations
  for each row execute function public.guard_organization_owned_record();
create trigger guard_proposal_organization before update on public.proposals
  for each row execute function public.guard_organization_owned_record();
create trigger guard_business_profile_organization before update on public.business_service_profiles
  for each row execute function public.guard_organization_owned_record();
create trigger guard_company_profile_organization before update on public.company_profiles
  for each row execute function public.guard_organization_owned_record();
create trigger guard_branding_organization before update on public.user_branding_settings
  for each row execute function public.guard_organization_owned_record();

-- Auditing and outbox insertion happen in the same transaction as the source
-- mutation. No browser grant exists on either destination table.
create function public.record_organization_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare row_data jsonb; tenant_id uuid; record_id text; verb text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  tenant_id := case when tg_table_name = 'organizations'
    then (row_data->>'id')::uuid else (row_data->>'organization_id')::uuid end;
  record_id := coalesce(row_data->>'id', row_data->>'user_id', tenant_id::text);
  verb := lower(tg_op);
  insert into public.organization_audit_log(
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    tenant_id, auth.uid(), tg_table_name || '.' || verb, tg_table_name, record_id,
    jsonb_build_object('operation', tg_op)
  );
  insert into public.organization_event_outbox(
    organization_id, event_type, aggregate_type, aggregate_id, payload
  ) values (
    tenant_id, tg_table_name || '.' || verb, tg_table_name, record_id,
    jsonb_build_object('operation', tg_op, 'record_id', record_id)
  );
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke all on function public.record_organization_change() from public, anon, authenticated;
create trigger audit_organization_change after update on public.organizations
  for each row execute function public.record_organization_change();
create trigger audit_membership_change after insert or update or delete on public.organization_memberships
  for each row execute function public.record_organization_change();
create trigger audit_proposal_change after insert or update or delete on public.proposals
  for each row execute function public.record_organization_change();
create trigger audit_business_profile_change after insert or update or delete on public.business_service_profiles
  for each row execute function public.record_organization_change();
create trigger audit_company_profile_change after insert or update or delete on public.company_profiles
  for each row execute function public.record_organization_change();
create trigger audit_branding_change after insert or update or delete on public.user_branding_settings
  for each row execute function public.record_organization_change();

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_audit_log enable row level security;
alter table public.organization_event_outbox enable row level security;
alter table public.organization_event_inbox enable row level security;

create policy organizations_member_read on public.organizations
  for select to authenticated using (public.is_organization_member(id));
create policy organizations_manager_update on public.organizations
  for update to authenticated using (public.can_manage_organization(id))
  with check (public.can_manage_organization(id));

create policy memberships_member_read on public.organization_memberships
  for select to authenticated using (public.is_organization_member(organization_id));
create policy memberships_manager_insert on public.organization_memberships
  for insert to authenticated with check (public.can_manage_organization(organization_id));
create policy memberships_manager_update on public.organization_memberships
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy memberships_manager_delete on public.organization_memberships
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy organization_audit_manager_read on public.organization_audit_log
  for select to authenticated using (public.can_manage_organization(organization_id));

-- Replace only operational ownership policies; public token-scoped proposal
-- RPCs remain separately controlled by the existing R0 hardening.
drop policy if exists "Users can view own proposals" on public.proposals;
drop policy if exists "Users can create own proposals" on public.proposals;
drop policy if exists "Users can update own proposals" on public.proposals;
drop policy if exists "Users can delete own proposals" on public.proposals;
drop policy if exists "Users can view own enhanced proposals" on public.proposals;
drop policy if exists "Users can create own enhanced proposals" on public.proposals;
drop policy if exists "Users can update own enhanced proposals" on public.proposals;
drop policy if exists "Users can delete own enhanced proposals" on public.proposals;
drop policy if exists catalog_owner_guard on public.proposals;
create policy catalog_owner_guard on public.proposals as restrictive for all to public
  using (public.is_organization_member(organization_id))
  with check (public.can_edit_organization_work(organization_id));
create policy proposals_organization_read on public.proposals
  for select to authenticated using (public.is_organization_member(organization_id));
create policy proposals_organization_insert on public.proposals
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and user_id = auth.uid()
  );
create policy proposals_organization_update on public.proposals
  for update to authenticated using (public.can_edit_organization_work(organization_id))
  with check (public.can_edit_organization_work(organization_id));
create policy proposals_organization_delete on public.proposals
  for delete to authenticated using (public.can_manage_organization(organization_id));

-- Dependent proposal records inherit the proposal's tenant boundary. Anonymous
-- tracking remains RPC-only and receives no direct table grant.
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
create policy proposal_tracking_organization_access on public.proposal_tracking
  for all to authenticated
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_organization_member(p.organization_id)
  ))
  with check (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
  ));

drop policy if exists catalog_owner_guard on public.proposal_views;
create policy catalog_owner_guard on public.proposal_views as restrictive for all to public
  using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_organization_member(p.organization_id)
  ))
  with check (false);
create policy proposal_views_organization_read on public.proposal_views
  for select to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_organization_member(p.organization_id)
  ));

create policy pdf_exports_organization_read on public.pdf_exports
  for select to authenticated using (exists (
    select 1 from public.proposals p
    where p.id = proposal_id and public.is_organization_member(p.organization_id)
  ));
create policy pdf_exports_organization_insert on public.pdf_exports
  for insert to authenticated with check (
    user_id = auth.uid() and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and public.can_edit_organization_work(p.organization_id)
    )
  );

drop policy if exists business_service_profiles_read on public.business_service_profiles;
drop policy if exists business_service_profiles_insert on public.business_service_profiles;
drop policy if exists business_service_profiles_update on public.business_service_profiles;
create policy business_service_profiles_organization_read on public.business_service_profiles
  for select to authenticated using (public.is_organization_member(organization_id));
create policy business_service_profiles_organization_insert on public.business_service_profiles
  for insert to authenticated with check (
    public.can_manage_organization(organization_id) and user_id = auth.uid()
  );
create policy business_service_profiles_organization_update on public.business_service_profiles
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

drop policy if exists "Users can view own company profile" on public.company_profiles;
drop policy if exists "Users can insert own company profile" on public.company_profiles;
drop policy if exists "Users can update own company profile" on public.company_profiles;
drop policy if exists "Users can delete own company profile" on public.company_profiles;
create policy company_profiles_organization_read on public.company_profiles
  for select to authenticated using (public.is_organization_member(organization_id));
create policy company_profiles_organization_insert on public.company_profiles
  for insert to authenticated with check (
    public.can_manage_organization(organization_id) and user_id = auth.uid()
  );
create policy company_profiles_organization_update on public.company_profiles
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy company_profiles_organization_delete on public.company_profiles
  for delete to authenticated using (public.can_manage_organization(organization_id));

drop policy if exists "Users can view own branding settings" on public.user_branding_settings;
drop policy if exists "Users can insert own branding settings" on public.user_branding_settings;
drop policy if exists "Users can update own branding settings" on public.user_branding_settings;
drop policy if exists "Users can delete own branding settings" on public.user_branding_settings;
drop policy if exists "Admins can view all branding settings" on public.user_branding_settings;
create policy branding_organization_read on public.user_branding_settings
  for select to authenticated using (public.is_organization_member(organization_id));
create policy branding_organization_insert on public.user_branding_settings
  for insert to authenticated with check (
    public.can_manage_organization(organization_id) and user_id = auth.uid()
  );
create policy branding_organization_update on public.user_branding_settings
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy branding_organization_delete on public.user_branding_settings
  for delete to authenticated using (public.can_manage_organization(organization_id));

grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select on public.organization_audit_log to authenticated;
grant select, insert, update, delete on public.proposal_tracking to authenticated;
grant select on public.proposal_views to authenticated;
revoke insert, update, delete on public.organization_audit_log from anon, authenticated;
revoke all on public.organization_event_outbox from public, anon, authenticated;
revoke all on public.organization_event_inbox from public, anon, authenticated;
grant all on public.organization_audit_log, public.organization_event_outbox,
  public.organization_event_inbox to service_role;
revoke all on public.organizations, public.organization_memberships from anon;

create trigger organizations_updated_at before update on public.organizations
  for each row execute function public.handle_updated_at();
create trigger organization_memberships_updated_at before update on public.organization_memberships
  for each row execute function public.handle_updated_at();

commit;
