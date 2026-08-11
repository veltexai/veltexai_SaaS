-- 100C Instantly Campaign Sync foundation. Provider-neutral outbound sync. Depends on 100A (001)
-- and 100B (002). UNAPPLIED at authoring time; review and apply manually to the approved pilot only.
-- Does NOT weaken 001/002: it only ADDS a dedicated read-only worker role, additive read policies on
-- internal_prospects and prospect_contacts, and 100C-owned tables/functions. Instantly campaign state
-- is NEVER mixed into prospect_contacts. All mutations flow through run-lock-scoped SECURITY DEFINER
-- functions with a fixed search_path.
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100c_worker') then
    create role veltex_100c_worker nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100c_worker to authenticator;

-- Approved internal->Instantly campaign mapping + safety configuration (the DB-side allowlist).
create table if not exists public.campaign_configs (
  config_id text primary key,
  instantly_campaign_id uuid,
  label text not null,
  segment text not null,
  environment text not null,
  approved boolean not null default false,
  approval_reference text,
  expected_workspace_id text,
  allowed_states text[] not null default array['draft','paused'],
  daily_sync_cap integer not null default 1 check (daily_sync_cap > 0),
  total_pilot_cap integer not null default 1 check (total_pilot_cap > 0),
  active boolean not null default false,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);

-- Unique contact/campaign assignment + submission lifecycle (idempotency lives here).
create table if not exists public.campaign_contact_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  contact_id uuid not null references public.prospect_contacts(id) on delete restrict,
  campaign_config_id text not null references public.campaign_configs(config_id) on delete restrict,
  state text not null default 'reserved' check (state in ('eligible','reserved','submitting','submitted','skipped_duplicate','reconciliation_required','failed_retryable','failed_terminal','suppressed','cancelled')),
  provider_lead_id text,
  reason text,
  reserved_run_id uuid,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint campaign_contact_unique unique (contact_id, campaign_config_id)
);
create index if not exists campaign_assignments_campaign_idx on public.campaign_contact_assignments (campaign_config_id, state);

-- Append-only submission attempt history.
create table if not exists public.campaign_submission_attempts (
  id bigint generated always as identity primary key,
  assignment_id uuid not null references public.campaign_contact_assignments(id) on delete restrict,
  run_id uuid not null,
  outcome text not null,
  error_category text,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists campaign_attempts_assignment_idx on public.campaign_submission_attempts (assignment_id, created_at);

-- Internal contact/campaign pair -> Instantly lead id (one per assignment).
create table if not exists public.instantly_lead_mappings (
  id uuid primary key default extensions.gen_random_uuid(),
  assignment_id uuid not null references public.campaign_contact_assignments(id) on delete restrict,
  provider_lead_id text not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint instantly_lead_assignment_unique unique (assignment_id)
);

-- Provider-neutral event idempotency foundation for future 100D ingestion (append-only, replay-safe).
create table if not exists public.outbound_event_receipts (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null check (provider in ('instantly','fixture')),
  provider_event_id text not null,
  event_type text not null,
  campaign_config_id text references public.campaign_configs(config_id) on delete set null,
  contact_id uuid references public.prospect_contacts(id) on delete set null,
  suppresses boolean not null default false,
  occurred_at timestamptz not null,
  received_at timestamptz not null default pg_catalog.now(),
  constraint outbound_event_provider_unique unique (provider, provider_event_id)
);
create index if not exists outbound_event_contact_idx on public.outbound_event_receipts (contact_id, suppresses);

-- Durable, provider-neutral customer/suppression registry. Separate from 100B's suppression_status
-- and from the per-send event receipts. Existing-customer / active-trial exclude cold outreach; the
-- rest are hard suppressions. Append-only + auditable (source, reason, external reference, timestamp),
-- matched by normalized email and/or normalized company domain. 100A's prospect_status
-- (discovered|identity_review) CANNOT identify a customer, so customer exclusion lives here. Future
-- HubSpot / production-customer-DB ingestion targets apply_100c_suppression(...) (a clean interface);
-- those systems are NOT integrated in this phase.
create table if not exists public.outbound_suppression_registry (
  id uuid primary key default extensions.gen_random_uuid(),
  kind text not null check (kind in ('existing_customer','active_trial','unsubscribed','hard_bounce','spam_complaint','do_not_contact','manual_block','legal_compliance')),
  match_type text not null check (match_type in ('email','domain')),
  normalized_email text,
  normalized_domain text,
  source text not null,
  reason text,
  external_reference text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  check ((match_type = 'email' and normalized_email is not null) or (match_type = 'domain' and normalized_domain is not null))
);
create index if not exists outbound_suppression_email_idx on public.outbound_suppression_registry (normalized_email) where normalized_email is not null;
create index if not exists outbound_suppression_domain_idx on public.outbound_suppression_registry (normalized_domain) where normalized_domain is not null;
-- Idempotency for replayed ingestion (identical durable facts collapse to one row).
create unique index if not exists outbound_suppression_dedupe_idx on public.outbound_suppression_registry
  (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at);

-- Future ingestion interface (HubSpot / customer DB / manual). Idempotent, append-only. NOT granted
-- to the read-only sync worker — ingestion is a separate, later, authorized action.
create or replace function public.apply_100c_suppression(requested_kind text, requested_match_type text, requested_email text, requested_domain text, requested_source text, requested_reason text, requested_external_reference text, requested_occurred_at timestamptz)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare new_id uuid;
begin
  insert into public.outbound_suppression_registry (kind, match_type, normalized_email, normalized_domain, source, reason, external_reference, occurred_at)
  values (requested_kind, requested_match_type, lower(nullif(requested_email,'')), lower(nullif(requested_domain,'')), requested_source, requested_reason, requested_external_reference, requested_occurred_at)
  on conflict (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at) do nothing
  returning id into new_id;
  return pg_catalog.jsonb_build_object('inserted', new_id is not null);
end $$;

-- 100C run-owned lock / cursor.
create table if not exists public.campaign_sync_workflow_state (
  workflow_id text primary key check (workflow_id = '100C'),
  cursor_index integer not null default 0 check (cursor_index >= 0),
  lock_run_id uuid,
  lock_expires_at timestamptz,
  updated_at timestamptz not null default pg_catalog.now()
);
insert into public.campaign_sync_workflow_state (workflow_id) values ('100C') on conflict (workflow_id) do nothing;

create table if not exists public.campaign_sync_diagnostics (
  id bigint generated always as identity primary key,
  workflow_id text not null check (workflow_id = '100C'),
  run_id uuid not null,
  level text not null check (level in ('info','warn','error')),
  event text not null,
  data jsonb,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists campaign_sync_diag_run_idx on public.campaign_sync_diagnostics (run_id, created_at);

-- ---- Lock functions ----
create or replace function public.acquire_100c_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare acquired boolean;
begin
  update public.campaign_sync_workflow_state set lock_run_id=requested_run_id, lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100C' and (lock_run_id is null or lock_expires_at <= pg_catalog.now()) returning true into acquired;
  return coalesce(acquired,false);
end $$;

create or replace function public.renew_100c_lock(requested_run_id uuid, requested_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare renewed boolean;
begin
  update public.campaign_sync_workflow_state set lock_expires_at=requested_expires_at, updated_at=pg_catalog.now()
  where workflow_id='100C' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now() returning true into renewed;
  return coalesce(renewed,false);
end $$;

create or replace function public.release_100c_lock(requested_run_id uuid)
returns void language sql security definer set search_path = pg_catalog, public as $$
  update public.campaign_sync_workflow_state set lock_run_id=null, lock_expires_at=null, updated_at=pg_catalog.now()
  where workflow_id='100C' and lock_run_id=requested_run_id;
$$;

-- ---- Idempotent reservation ----
create or replace function public.reserve_100c_assignment(requested_run_id uuid, requested_contact_id uuid, requested_campaign_config_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare existing_id uuid; existing_state text; new_id uuid;
begin
  if not exists (select 1 from public.campaign_sync_workflow_state where workflow_id='100C' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='reserve requires the live run-owned 100C lock';
  end if;
  if not exists (select 1 from public.campaign_configs where config_id=requested_campaign_config_id and approved and active and instantly_campaign_id is not null) then
    raise exception using errcode='22023', message='campaign is not approved/active in the allowlist';
  end if;
  select id, state into existing_id, existing_state from public.campaign_contact_assignments where contact_id=requested_contact_id and campaign_config_id=requested_campaign_config_id;
  if existing_id is not null then
    return pg_catalog.jsonb_build_object('assignment_id', existing_id, 'reserved', false, 'existing_state', existing_state);
  end if;
  insert into public.campaign_contact_assignments (contact_id, campaign_config_id, state, reserved_run_id)
  values (requested_contact_id, requested_campaign_config_id, 'reserved', requested_run_id)
  on conflict (contact_id, campaign_config_id) do nothing
  returning id into new_id;
  if new_id is null then
    select id, state into existing_id, existing_state from public.campaign_contact_assignments where contact_id=requested_contact_id and campaign_config_id=requested_campaign_config_id;
    return pg_catalog.jsonb_build_object('assignment_id', existing_id, 'reserved', false, 'existing_state', existing_state);
  end if;
  return pg_catalog.jsonb_build_object('assignment_id', new_id, 'reserved', true, 'existing_state', null);
end $$;

-- ---- Lifecycle transition (lock-scoped) ----
create or replace function public.transition_100c_assignment(requested_run_id uuid, requested_assignment_id uuid, requested_state text, requested_reason text, requested_provider_lead_id text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  if requested_state not in ('eligible','reserved','submitting','submitted','skipped_duplicate','reconciliation_required','failed_retryable','failed_terminal','suppressed','cancelled') then
    raise exception using errcode='22023', message='invalid 100C submission state';
  end if;
  if not exists (select 1 from public.campaign_sync_workflow_state where workflow_id='100C' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='transition requires the live run-owned 100C lock';
  end if;
  update public.campaign_contact_assignments
  set state=requested_state, reason=requested_reason,
      provider_lead_id=coalesce(requested_provider_lead_id, provider_lead_id), updated_at=pg_catalog.now()
  where id=requested_assignment_id returning true into changed;
  return coalesce(changed,false);
end $$;

create or replace function public.record_100c_attempt(requested_run_id uuid, requested_assignment_id uuid, requested_outcome text, requested_error_category text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.campaign_sync_workflow_state where workflow_id='100C' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='attempt logging requires the live run-owned 100C lock';
  end if;
  insert into public.campaign_submission_attempts (assignment_id, run_id, outcome, error_category)
  values (requested_assignment_id, requested_run_id, requested_outcome, requested_error_category);
end $$;

create or replace function public.record_100c_lead_mapping(requested_run_id uuid, requested_assignment_id uuid, requested_provider_lead_id text)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if not exists (select 1 from public.campaign_sync_workflow_state where workflow_id='100C' and lock_run_id=requested_run_id and lock_expires_at > pg_catalog.now()) then
    raise exception using errcode='55000', message='lead mapping requires the live run-owned 100C lock';
  end if;
  insert into public.instantly_lead_mappings (assignment_id, provider_lead_id)
  values (requested_assignment_id, requested_provider_lead_id)
  on conflict (assignment_id) do nothing;
end $$;

-- ---- Future 100D event idempotency (append-only, replay-safe). Does NOT touch prospect_contacts. ----
create or replace function public.apply_100c_event_receipt(requested_provider text, requested_event_id text, requested_event_type text, requested_campaign_config_id text, requested_contact_id uuid, requested_occurred_at timestamptz, requested_suppresses boolean)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare inserted boolean := false; receipt_id uuid;
begin
  insert into public.outbound_event_receipts (provider, provider_event_id, event_type, campaign_config_id, contact_id, suppresses, occurred_at)
  values (requested_provider, requested_event_id, requested_event_type, requested_campaign_config_id, requested_contact_id, coalesce(requested_suppresses,false), requested_occurred_at)
  on conflict (provider, provider_event_id) do nothing
  returning id into receipt_id;
  inserted := receipt_id is not null;
  return pg_catalog.jsonb_build_object('inserted', inserted);
end $$;

-- ---- RLS ----
alter table public.campaign_configs enable row level security;
alter table public.campaign_contact_assignments enable row level security;
alter table public.campaign_submission_attempts enable row level security;
alter table public.instantly_lead_mappings enable row level security;
alter table public.outbound_event_receipts enable row level security;
alter table public.outbound_suppression_registry enable row level security;
alter table public.campaign_sync_workflow_state enable row level security;
alter table public.campaign_sync_diagnostics enable row level security;

revoke all on public.campaign_configs, public.campaign_contact_assignments, public.campaign_submission_attempts, public.instantly_lead_mappings, public.outbound_event_receipts, public.outbound_suppression_registry, public.campaign_sync_workflow_state, public.campaign_sync_diagnostics from public, anon, authenticated;
revoke all on function public.acquire_100c_lock(uuid,timestamptz), public.renew_100c_lock(uuid,timestamptz), public.release_100c_lock(uuid), public.reserve_100c_assignment(uuid,uuid,text), public.transition_100c_assignment(uuid,uuid,text,text,text), public.record_100c_attempt(uuid,uuid,text,text), public.record_100c_lead_mapping(uuid,uuid,text), public.apply_100c_event_receipt(text,text,text,text,uuid,timestamptz,boolean), public.apply_100c_suppression(text,text,text,text,text,text,text,timestamptz) from public, anon, authenticated;

-- Additive read policies so the 100C worker can read approved 100A companies and 100B contacts.
-- Does NOT alter the 100A/100B policies.
drop policy if exists internal_prospects_100c_read on public.internal_prospects;
create policy internal_prospects_100c_read on public.internal_prospects for select to veltex_100c_worker using (true);
drop policy if exists prospect_contacts_100c_read on public.prospect_contacts;
create policy prospect_contacts_100c_read on public.prospect_contacts for select to veltex_100c_worker using (true);
drop policy if exists prospect_contact_sources_100c_read on public.prospect_contact_sources;
create policy prospect_contact_sources_100c_read on public.prospect_contact_sources for select to veltex_100c_worker using (true);

drop policy if exists campaign_configs_100c_read on public.campaign_configs;
create policy campaign_configs_100c_read on public.campaign_configs for select to veltex_100c_worker using (true);
drop policy if exists campaign_assignments_100c_read on public.campaign_contact_assignments;
create policy campaign_assignments_100c_read on public.campaign_contact_assignments for select to veltex_100c_worker using (true);
drop policy if exists outbound_events_100c_read on public.outbound_event_receipts;
create policy outbound_events_100c_read on public.outbound_event_receipts for select to veltex_100c_worker using (true);
-- Worker may READ suppression but has no insert/update/delete grant or policy (cannot erase/weaken it).
drop policy if exists outbound_suppression_100c_read on public.outbound_suppression_registry;
create policy outbound_suppression_100c_read on public.outbound_suppression_registry for select to veltex_100c_worker using (true);
drop policy if exists campaign_state_100c_read on public.campaign_sync_workflow_state;
create policy campaign_state_100c_read on public.campaign_sync_workflow_state for select to veltex_100c_worker using (workflow_id='100C');
drop policy if exists campaign_diag_100c_insert on public.campaign_sync_diagnostics;
create policy campaign_diag_100c_insert on public.campaign_sync_diagnostics for insert to veltex_100c_worker with check (workflow_id='100C');

-- ---- Grants (least privilege): read approved records, insert diagnostics, execute functions. ----
grant usage on schema public to veltex_100c_worker;
grant select on public.internal_prospects, public.prospect_contacts, public.prospect_contact_sources, public.campaign_configs, public.campaign_contact_assignments, public.outbound_event_receipts, public.outbound_suppression_registry, public.campaign_sync_workflow_state to veltex_100c_worker;
grant insert on public.campaign_sync_diagnostics to veltex_100c_worker;
grant usage, select on sequence public.campaign_sync_diagnostics_id_seq to veltex_100c_worker;
grant execute on function public.acquire_100c_lock(uuid,timestamptz), public.renew_100c_lock(uuid,timestamptz), public.release_100c_lock(uuid), public.reserve_100c_assignment(uuid,uuid,text), public.transition_100c_assignment(uuid,uuid,text,text,text), public.record_100c_attempt(uuid,uuid,text,text), public.record_100c_lead_mapping(uuid,uuid,text), public.apply_100c_event_receipt(text,text,text,text,uuid,timestamptz,boolean) to veltex_100c_worker;
