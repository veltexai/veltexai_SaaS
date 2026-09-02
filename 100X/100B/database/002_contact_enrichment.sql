-- 100B contact-enrichment foundation. Provider-neutral. Depends on 100A (001).
-- Unapplied at authoring time; review and apply manually. Does NOT weaken 100A: it only
-- ADDS a dedicated read-only worker role and a read policy on internal_prospects.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100b_worker') then
    create role veltex_100b_worker nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100b_worker to authenticator;

create table if not exists public.prospect_contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  prospect_id uuid not null references public.internal_prospects(id) on delete restrict,
  first_name text,
  last_name text,
  full_name text,
  title text,
  role_category text not null check (role_category in ('owner','founder','president','chief_executive','general_manager','operations','sales_bd','estimator','office_manager','generic_mailbox','other')),
  email text,
  normalized_email text,
  email_verification_status text not null check (email_verification_status in ('verified','accept_all','unknown','invalid','unverified')),
  phone text,
  linkedin_url text,
  is_current_contact boolean not null default false,
  outreach_eligibility text not null check (outreach_eligibility in ('ready_for_outreach','needs_enrichment','unverified','identity_conflict','suppressed','already_contacted','customer','ineligible','provider_error')),
  eligibility_reason text not null,
  suppression_status text not null default 'none' check (suppression_status in ('none','unsubscribed','hard_bounce','do_not_contact','global_suppression')),
  suppression_reason text,
  first_discovered_at timestamptz not null,
  last_verified_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);
create index if not exists prospect_contacts_prospect_idx on public.prospect_contacts (prospect_id);
create index if not exists prospect_contacts_email_idx on public.prospect_contacts (prospect_id, normalized_email) where normalized_email is not null;
create index if not exists prospect_contacts_eligibility_idx on public.prospect_contacts (outreach_eligibility);

create table if not exists public.prospect_contact_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  contact_id uuid not null references public.prospect_contacts(id) on delete restrict,
  provider text not null check (provider in ('apollo','data_axle','csv_import','referral','fixture')),
  provider_record_id text not null,
  provider_verification_status text,
  provider_metadata jsonb,
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint prospect_contact_provider_record_key unique (provider, provider_record_id)
);
create index if not exists prospect_contact_sources_contact_idx on public.prospect_contact_sources (contact_id);

create table if not exists public.enrichment_workflow_state (
  workflow_id text primary key check (workflow_id = '100B'),
  cursor_index integer not null default 0 check (cursor_index >= 0),
  lock_run_id uuid,
  lock_expires_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now()
);
insert into public.enrichment_workflow_state (workflow_id) values ('100B') on conflict (workflow_id) do nothing;

create table if not exists public.enrichment_diagnostics (
  id bigint generated always as identity primary key,
  workflow_id text not null check (workflow_id = '100B'),
  run_id uuid not null,
  level text not null check (level in ('info','warn','error')),
  event text not null,
  data jsonb,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists enrichment_diagnostics_run_idx on public.enrichment_diagnostics (run_id, created_at);

create or replace function public.acquire_100b_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare acquired boolean;
begin
  update public.enrichment_workflow_state set lock_run_id=requested_run_id, lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100B' and (lock_run_id is null or lock_expires_at <= pg_catalog.now()) returning true into acquired;
  return coalesce(acquired,false);
end $$;

create or replace function public.renew_100b_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare renewed boolean;
begin
  update public.enrichment_workflow_state set lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100B' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now() returning true into renewed;
  return coalesce(renewed,false);
end $$;

create or replace function public.release_100b_lock(requested_run_id uuid)
returns void language sql security definer set search_path = pg_catalog, public as $$
  update public.enrichment_workflow_state set lock_run_id=null, lock_expires_at=null, updated_at=pg_catalog.now()
  where workflow_id='100B' and lock_run_id=requested_run_id;
$$;

create or replace function public.set_100b_cursor(requested_run_id uuid, requested_cursor integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.enrichment_workflow_state set cursor_index=requested_cursor, updated_at=pg_catalog.now()
  where workflow_id='100B' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now() returning true into changed;
  return coalesce(changed,false);
end $$;

create or replace function public.touch_100b_source(requested_run_id uuid, requested_source_id uuid, requested_observed_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.prospect_contact_sources set last_observed_at=requested_observed_at
  where id=requested_source_id and exists (
    select 1 from public.enrichment_workflow_state
    where workflow_id='100B' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()
  ) returning true into changed;
  return coalesce(changed,false);
end $$;

create or replace function public.persist_100b_contact(requested_run_id uuid, contact_record jsonb, source_record jsonb, matched_contact_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare contact uuid; source_id uuid; contact_created boolean := false;
begin
  if not exists (select 1 from public.enrichment_workflow_state where workflow_id='100B' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='persist requires the live run-owned 100B lock';
  end if;
  if source_record->>'provider' not in ('apollo','hunter','data_axle','csv_import','referral','fixture') then
    raise exception using errcode='22023', message='100B rejects unapproved contact provider';
  end if;
  contact := matched_contact_id;
  if contact is null then
    insert into public.prospect_contacts (prospect_id,first_name,last_name,full_name,title,role_category,email,normalized_email,email_verification_status,phone,linkedin_url,is_current_contact,outreach_eligibility,eligibility_reason,suppression_status,suppression_reason,first_discovered_at,last_verified_at)
    values ((contact_record->>'prospect_id')::uuid,contact_record->>'first_name',contact_record->>'last_name',contact_record->>'full_name',contact_record->>'title',contact_record->>'role_category',contact_record->>'email',contact_record->>'normalized_email',contact_record->>'email_verification_status',contact_record->>'phone',contact_record->>'linkedin_url',(contact_record->>'is_current_contact')::boolean,contact_record->>'outreach_eligibility',contact_record->>'eligibility_reason',contact_record->>'suppression_status',contact_record->>'suppression_reason',(contact_record->>'first_discovered_at')::timestamptz,nullif(contact_record->>'last_verified_at','')::timestamptz)
    returning id into contact;
    contact_created := true;
  elsif not exists (select 1 from public.prospect_contacts where id=contact) then
    raise exception 'matched contact does not exist';
  end if;
  insert into public.prospect_contact_sources (contact_id,provider,provider_record_id,provider_verification_status,provider_metadata,first_observed_at,last_observed_at)
  values (contact,source_record->>'provider',source_record->>'provider_record_id',source_record->>'provider_verification_status',source_record->'provider_metadata',(source_record->>'first_observed_at')::timestamptz,(source_record->>'last_observed_at')::timestamptz)
  returning id into source_id;
  return pg_catalog.jsonb_build_object('contact_id',contact,'source_record_id',source_id,'contact_created',contact_created,'source_created',true);
end $$;

alter table public.prospect_contacts enable row level security;
alter table public.prospect_contact_sources enable row level security;
alter table public.enrichment_workflow_state enable row level security;
alter table public.enrichment_diagnostics enable row level security;
revoke all on public.prospect_contacts, public.prospect_contact_sources, public.enrichment_workflow_state, public.enrichment_diagnostics from public, anon, authenticated;
revoke all on function public.acquire_100b_lock(uuid,timestamptz), public.renew_100b_lock(uuid,timestamptz), public.release_100b_lock(uuid), public.set_100b_cursor(uuid,integer), public.touch_100b_source(uuid,uuid,timestamptz), public.persist_100b_contact(uuid,jsonb,jsonb,uuid) from public, anon, authenticated;

-- Additive read policy so the 100B worker can read 100A companies. Does not alter 100A's own policy.
drop policy if exists internal_prospects_100b_read on public.internal_prospects;
create policy internal_prospects_100b_read on public.internal_prospects for select to veltex_100b_worker using (true);
drop policy if exists prospect_contacts_100b_read on public.prospect_contacts;
create policy prospect_contacts_100b_read on public.prospect_contacts for select to veltex_100b_worker using (true);
drop policy if exists contact_sources_100b_read on public.prospect_contact_sources;
create policy contact_sources_100b_read on public.prospect_contact_sources for select to veltex_100b_worker using (true);
drop policy if exists enrichment_state_100b_read on public.enrichment_workflow_state;
create policy enrichment_state_100b_read on public.enrichment_workflow_state for select to veltex_100b_worker using (workflow_id='100B');
drop policy if exists enrichment_diag_100b_insert on public.enrichment_diagnostics;
create policy enrichment_diag_100b_insert on public.enrichment_diagnostics for insert to veltex_100b_worker with check (workflow_id='100B');

grant usage on schema public to veltex_100b_worker;
grant select on public.internal_prospects, public.prospect_contacts, public.prospect_contact_sources, public.enrichment_workflow_state to veltex_100b_worker;
grant insert on public.enrichment_diagnostics to veltex_100b_worker;
grant usage, select on sequence public.enrichment_diagnostics_id_seq to veltex_100b_worker;
grant execute on function public.acquire_100b_lock(uuid,timestamptz), public.renew_100b_lock(uuid,timestamptz), public.release_100b_lock(uuid), public.set_100b_cursor(uuid,integer), public.touch_100b_source(uuid,uuid,timestamptz), public.persist_100b_contact(uuid,jsonb,jsonb,uuid) to veltex_100b_worker;
