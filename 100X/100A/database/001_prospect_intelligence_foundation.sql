-- 100A foundation. Unapplied at authoring time; review and apply manually.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100a_worker') then
    create role veltex_100a_worker nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100a_worker to authenticator;

create table if not exists public.internal_prospects (
  id uuid primary key default extensions.gen_random_uuid(),
  company_name text not null,
  website text,
  website_domain text,
  primary_phone text,
  normalized_phone text,
  company_type text not null check (company_type in ('commercial_janitorial','commercial_cleaning','office_cleaning','building_cleaning','maid_service','residential_cleaning')),
  prospect_status text not null default 'discovered' check (prospect_status in ('discovered','identity_review')),
  first_discovered_at timestamptz not null,
  last_updated_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists internal_prospects_domain_idx on public.internal_prospects (website_domain) where website_domain is not null;
create index if not exists internal_prospects_phone_idx on public.internal_prospects (normalized_phone) where normalized_phone is not null;
create index if not exists internal_prospects_name_idx on public.internal_prospects (lower(company_name));

create table if not exists public.prospect_source_records (
  id uuid primary key default extensions.gen_random_uuid(),
  prospect_id uuid not null references public.internal_prospects(id) on delete restrict,
  provider text not null check (provider in ('google_places','apollo','data_axle','csv_import','referral','website')),
  provider_record_id text not null,
  source_geography text,
  source_query text,
  provider_url text,
  observed_company_name text not null,
  observed_website text,
  observed_phone text,
  observed_address text,
  city text,
  state text,
  qualification_result jsonb not null,
  qualification_method text not null check (qualification_method in ('rules','ai')),
  qualification_version text not null,
  first_observed_at timestamptz not null,
  last_observed_at timestamptz not null,
  provider_metadata jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  constraint prospect_source_provider_record_key unique (provider, provider_record_id)
);
create index if not exists prospect_source_prospect_idx on public.prospect_source_records (prospect_id);
create index if not exists prospect_source_name_location_idx on public.prospect_source_records (lower(observed_company_name), lower(city), lower(state));
create index if not exists prospect_source_city_state_idx on public.prospect_source_records (lower(city), lower(state));

create table if not exists public.acquisition_workflow_state (
  workflow_id text primary key check (workflow_id = '100A'),
  cursor_index integer not null default 0 check (cursor_index >= 0),
  lock_run_id uuid,
  lock_expires_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now()
);
insert into public.acquisition_workflow_state (workflow_id) values ('100A') on conflict (workflow_id) do nothing;

create table if not exists public.acquisition_diagnostics (
  id bigint generated always as identity primary key,
  workflow_id text not null check (workflow_id = '100A'),
  run_id uuid not null,
  level text not null check (level in ('info','warn','error')),
  event text not null,
  data jsonb,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists acquisition_diagnostics_run_idx on public.acquisition_diagnostics (run_id, created_at);

create or replace function public.acquire_100a_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare acquired boolean;
begin
  update public.acquisition_workflow_state set lock_run_id=requested_run_id, lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100A' and (lock_run_id is null or lock_expires_at <= pg_catalog.now()) returning true into acquired;
  return coalesce(acquired,false);
end $$;

create or replace function public.renew_100a_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare renewed boolean;
begin
  update public.acquisition_workflow_state set lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100A' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now() returning true into renewed;
  return coalesce(renewed,false);
end $$;

create or replace function public.release_100a_lock(requested_run_id uuid)
returns void language sql security definer set search_path = pg_catalog, public as $$
  update public.acquisition_workflow_state set lock_run_id=null, lock_expires_at=null, updated_at=pg_catalog.now()
  where workflow_id='100A' and lock_run_id=requested_run_id;
$$;

create or replace function public.set_100a_cursor(requested_run_id uuid, requested_cursor integer)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.acquisition_workflow_state set cursor_index=requested_cursor, updated_at=pg_catalog.now()
  where workflow_id='100A' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now() returning true into changed;
  return coalesce(changed,false);
end $$;

create or replace function public.touch_100a_source(requested_run_id uuid, requested_source_id uuid, requested_observed_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  update public.prospect_source_records set last_observed_at=requested_observed_at
  where id=requested_source_id and exists (
    select 1 from public.acquisition_workflow_state
    where workflow_id='100A' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()
  ) returning true into changed;
  return coalesce(changed,false);
end $$;

create or replace function public.persist_100a_observation(requested_run_id uuid, canonical_record jsonb, source_record jsonb, matched_prospect_id uuid default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare prospect uuid; source_id uuid; canonical_created boolean := false;
begin
  if not exists (select 1 from public.acquisition_workflow_state where workflow_id='100A' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='persist requires the live run-owned 100A lock';
  end if;
  if source_record->>'provider' <> 'google_places' then
    raise exception using errcode='22023', message='100A accepts google_places observations only';
  end if;
  prospect := matched_prospect_id;
  if prospect is null then
    insert into public.internal_prospects (company_name,website,website_domain,primary_phone,normalized_phone,company_type,prospect_status,first_discovered_at,last_updated_at)
    values (canonical_record->>'company_name',canonical_record->>'website',canonical_record->>'website_domain',canonical_record->>'primary_phone',canonical_record->>'normalized_phone',canonical_record->>'company_type',canonical_record->>'prospect_status',(canonical_record->>'first_discovered_at')::timestamptz,(canonical_record->>'last_updated_at')::timestamptz)
    returning id into prospect;
    canonical_created := true;
  elsif not exists (select 1 from public.internal_prospects where id=prospect) then
    raise exception 'matched prospect does not exist';
  end if;
  insert into public.prospect_source_records (prospect_id,provider,provider_record_id,source_geography,source_query,provider_url,observed_company_name,observed_website,observed_phone,observed_address,city,state,qualification_result,qualification_method,qualification_version,first_observed_at,last_observed_at,provider_metadata)
  values (prospect,source_record->>'provider',source_record->>'provider_record_id',source_record->>'source_geography',source_record->>'source_query',source_record->>'provider_url',source_record->>'observed_company_name',source_record->>'observed_website',source_record->>'observed_phone',source_record->>'observed_address',source_record->>'city',source_record->>'state',source_record->'qualification',source_record->'qualification'->>'method',source_record->'qualification'->>'version',(source_record->>'first_observed_at')::timestamptz,(source_record->>'last_observed_at')::timestamptz,source_record->'provider_metadata') returning id into source_id;
  return pg_catalog.jsonb_build_object('prospect_id',prospect,'source_record_id',source_id,'canonical_created',canonical_created,'source_created',true);
end $$;

alter table public.internal_prospects enable row level security;
alter table public.prospect_source_records enable row level security;
alter table public.acquisition_workflow_state enable row level security;
alter table public.acquisition_diagnostics enable row level security;
revoke all on public.internal_prospects, public.prospect_source_records, public.acquisition_workflow_state, public.acquisition_diagnostics from public, anon, authenticated;
revoke all on function public.acquire_100a_lock(uuid,timestamptz), public.renew_100a_lock(uuid,timestamptz), public.release_100a_lock(uuid), public.set_100a_cursor(uuid,integer), public.touch_100a_source(uuid,uuid,timestamptz), public.persist_100a_observation(uuid,jsonb,jsonb,uuid) from public, anon, authenticated;

drop policy if exists internal_prospects_100a_read on public.internal_prospects;
create policy internal_prospects_100a_read on public.internal_prospects for select to veltex_100a_worker using (true);
drop policy if exists prospect_sources_100a_read on public.prospect_source_records;
create policy prospect_sources_100a_read on public.prospect_source_records for select to veltex_100a_worker using (true);
drop policy if exists workflow_state_100a_read on public.acquisition_workflow_state;
create policy workflow_state_100a_read on public.acquisition_workflow_state for select to veltex_100a_worker using (workflow_id='100A');
drop policy if exists diagnostics_100a_insert on public.acquisition_diagnostics;
create policy diagnostics_100a_insert on public.acquisition_diagnostics for insert to veltex_100a_worker with check (workflow_id='100A');

grant usage on schema public to veltex_100a_worker;
grant select on public.internal_prospects, public.prospect_source_records, public.acquisition_workflow_state to veltex_100a_worker;
grant insert on public.acquisition_diagnostics to veltex_100a_worker;
grant usage, select on sequence public.acquisition_diagnostics_id_seq to veltex_100a_worker;
grant execute on function public.acquire_100a_lock(uuid,timestamptz), public.renew_100a_lock(uuid,timestamptz), public.release_100a_lock(uuid), public.set_100a_cursor(uuid,integer), public.touch_100a_source(uuid,uuid,timestamptz), public.persist_100a_observation(uuid,jsonb,jsonb,uuid) to veltex_100a_worker;
