-- 100D — Automated Suppression & Event Intelligence (additive migration 004).
-- Depends on 001 (100A), 002 (100B), 003 (100C). ADDITIVE ONLY: creates a dedicated ingest role, four
-- new tables, and fixed-search-path SECURITY DEFINER functions. It does NOT alter or drop any object
-- from 001/002/003; it only references the existing outbound_event_receipts / outbound_suppression_
-- registry / campaign_contact_assignments / prospect_contacts tables from within new functions.
--
-- Least privilege: the ingest role holds EXECUTE on the 004 functions ONLY — no direct table read or
-- write, no service-role key. All mutation is atomic inside SECURITY DEFINER functions.

begin;

-- ---- Dedicated ingest role (NOLOGIN / NOINHERIT / NOBYPASSRLS) ----
do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100d_ingest') then
    create role veltex_100d_ingest nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100d_ingest to authenticator;

-- ---- New tables (all RLS-protected, append-only history) ----

-- Per-event processing outcome (one row per provider event; idempotent).
create table if not exists public.outbound_event_processing (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('instantly','fixture')),
  provider_event_id text not null,
  outcome text not null check (outcome in ('processed','held_unmatched','reconciled')),
  resolution text not null check (resolution in ('matched','unmatched','ambiguous','wrong_campaign')),
  contact_id uuid references public.prospect_contacts(id) on delete set null,
  campaign_config_id text references public.campaign_configs(config_id) on delete set null,
  engagement_category text not null,
  normalization_version text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint outbound_event_processing_unique unique (provider_event_id)
);

-- Held events that could not be linked to an internal contact (for reconciliation). Append-only;
-- resolution is completed in place (resolved_at / resolved_contact_id) but rows are never deleted.
create table if not exists public.outbound_unmatched_events (
  id bigint generated always as identity primary key,
  provider text not null check (provider in ('instantly','fixture')),
  provider_event_id text not null,
  event_type text not null,
  campaign_config_id text references public.campaign_configs(config_id) on delete set null,
  normalized_email text,               -- normalized email only (no raw message/reply body ever stored)
  occurred_at timestamptz not null,
  engagement_category text not null,
  suppresses boolean not null default false,
  suppression_kind text,
  provider_metadata jsonb,             -- PII-free metadata only (step/variant/isFirst/flags)
  normalization_version text not null,
  reason text,
  resolved_at timestamptz,
  resolved_contact_id uuid references public.prospect_contacts(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint outbound_unmatched_events_unique unique (provider_event_id)
);
create index if not exists outbound_unmatched_open_idx on public.outbound_unmatched_events (created_at) where resolved_at is null;

-- Ingestion diagnostics (PII-free; never secrets/emails/bodies).
create table if not exists public.outbound_ingestion_diagnostics (
  id bigint generated always as identity primary key,
  workflow_id text not null check (workflow_id = '100D'),
  run_id uuid not null,
  level text not null check (level in ('info','warn','error')),
  event text not null,
  data jsonb,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists outbound_ingestion_diag_run_idx on public.outbound_ingestion_diagnostics (run_id, created_at);

-- Minimal workflow state (cursor for future scheduled reconciliation).
create table if not exists public.outbound_ingestion_workflow_state (
  workflow_id text primary key check (workflow_id = '100D'),
  cursor_index integer not null default 0 check (cursor_index >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);
insert into public.outbound_ingestion_workflow_state (workflow_id) values ('100D') on conflict (workflow_id) do nothing;

-- ---- Functions (SECURITY DEFINER, fixed search_path) ----

-- Read-only contact resolution. Fail closed: null cfg -> wrong_campaign; no email -> unmatched;
-- 0 matches in the campaign -> unmatched (or wrong_campaign if the email exists in another campaign);
-- >1 distinct contacts -> ambiguous; exactly one -> matched.
create or replace function public.resolve_100d_contact(requested_email text, requested_campaign_config_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare ids uuid[]; elsewhere boolean;
begin
  if requested_campaign_config_id is null then
    return jsonb_build_object('status','wrong_campaign','contact_id',null,'reason','no approved campaign bound');
  end if;
  if requested_email is null or btrim(requested_email) = '' then
    return jsonb_build_object('status','unmatched','contact_id',null,'reason','no normalized email');
  end if;
  select array_agg(distinct a.contact_id) into ids
  from public.campaign_contact_assignments a
  join public.prospect_contacts pc on pc.id = a.contact_id
  where a.campaign_config_id = requested_campaign_config_id
    and lower(pc.normalized_email) = lower(requested_email);
  if ids is null then
    select exists(select 1 from public.prospect_contacts pc where lower(pc.normalized_email) = lower(requested_email)) into elsewhere;
    if elsewhere then
      return jsonb_build_object('status','wrong_campaign','contact_id',null,'reason','contact matches a different campaign');
    end if;
    return jsonb_build_object('status','unmatched','contact_id',null,'reason','no assignment for this email in the approved campaign');
  elsif array_length(ids,1) > 1 then
    return jsonb_build_object('status','ambiguous','contact_id',null,'reason','multiple contacts share this email in the campaign');
  end if;
  return jsonb_build_object('status','matched','contact_id',ids[1],'reason','resolved via campaign assignment');
end $$;

-- Atomic Instantly event application: resolve -> idempotent receipt -> (suppresses) idempotent
-- suppression -> processing outcome -> hold when unmatched. All-or-nothing (single function body).
create or replace function public.apply_100d_instantly_event(
  requested_provider text, requested_event_id text, requested_event_type text, requested_campaign_config_id text,
  requested_normalized_email text, requested_occurred_at timestamptz, requested_suppresses boolean,
  requested_suppression_kind text, requested_engagement_category text, requested_provider_metadata jsonb,
  requested_normalization_version text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare res jsonb; v_status text; v_contact uuid; v_matched boolean;
        v_receipt uuid; v_supp uuid; v_inserted boolean := false; v_supp_inserted boolean := false;
begin
  res := public.resolve_100d_contact(requested_normalized_email, requested_campaign_config_id);
  v_status := res->>'status';
  v_contact := nullif(res->>'contact_id','')::uuid;
  v_matched := v_status = 'matched';

  insert into public.outbound_event_receipts (provider, provider_event_id, event_type, campaign_config_id, contact_id, suppresses, occurred_at)
  values (requested_provider, requested_event_id, requested_event_type, requested_campaign_config_id, v_contact, coalesce(requested_suppresses,false), requested_occurred_at)
  on conflict (provider, provider_event_id) do nothing
  returning id into v_receipt;
  v_inserted := v_receipt is not null;

  if coalesce(requested_suppresses,false) and requested_normalized_email is not null and requested_suppression_kind is not null then
    insert into public.outbound_suppression_registry (kind, match_type, normalized_email, source, reason, external_reference, occurred_at)
    values (requested_suppression_kind, 'email', lower(requested_normalized_email), '100d_instantly', requested_event_type, requested_event_id, requested_occurred_at)
    on conflict (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at) do nothing
    returning id into v_supp;
    v_supp_inserted := v_supp is not null;
  end if;

  if v_inserted then
    insert into public.outbound_event_processing (provider, provider_event_id, outcome, resolution, contact_id, campaign_config_id, engagement_category, normalization_version, occurred_at)
    values (requested_provider, requested_event_id, case when v_matched then 'processed' else 'held_unmatched' end, v_status, v_contact, requested_campaign_config_id, requested_engagement_category, requested_normalization_version, requested_occurred_at)
    on conflict (provider_event_id) do nothing;
    if not v_matched then
      insert into public.outbound_unmatched_events (provider, provider_event_id, event_type, campaign_config_id, normalized_email, occurred_at, engagement_category, suppresses, suppression_kind, provider_metadata, normalization_version, reason)
      values (requested_provider, requested_event_id, requested_event_type, requested_campaign_config_id, lower(requested_normalized_email), requested_occurred_at, requested_engagement_category, coalesce(requested_suppresses,false), requested_suppression_kind, requested_provider_metadata, requested_normalization_version, res->>'reason')
      on conflict (provider_event_id) do nothing;
    end if;
  end if;

  return jsonb_build_object('inserted', v_inserted, 'suppression_inserted', v_supp_inserted, 'matched', v_matched, 'resolution', v_status);
end $$;

-- Customer/trial durable suppression (email-keyed, idempotent). No billing data.
create or replace function public.apply_100d_customer_status(
  requested_kind text, requested_email text, requested_source text, requested_external_reference text, requested_occurred_at timestamptz)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_id uuid;
begin
  insert into public.outbound_suppression_registry (kind, match_type, normalized_email, source, reason, external_reference, occurred_at)
  values (requested_kind, 'email', lower(nullif(requested_email,'')), coalesce(nullif(requested_source,''),'veltex_customer_status'), 'customer/trial status', requested_external_reference, requested_occurred_at)
  on conflict (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at) do nothing
  returning id into v_id;
  return jsonb_build_object('inserted', v_id is not null);
end $$;

-- Held-event reader for reconciliation (PII stays inside the trusted ingest boundary).
create or replace function public.list_100d_unmatched()
returns table (provider_event_id text, event jsonb) language sql security definer set search_path = pg_catalog, public as $$
  select u.provider_event_id,
         jsonb_build_object(
           'provider', u.provider, 'providerEventId', u.provider_event_id, 'rawEventType', u.event_type,
           'campaignConfigId', u.campaign_config_id, 'normalizedEmail', u.normalized_email,
           'occurredAt', to_char(u.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'engagementCategory', u.engagement_category, 'suppresses', u.suppresses,
           'suppressionKind', u.suppression_kind, 'normalizationVersion', u.normalization_version)
  from public.outbound_unmatched_events u
  where u.resolved_at is null
  order by u.created_at;
$$;

-- Complete a held event once a contact link exists (idempotent). Never resends or mutates a campaign.
create or replace function public.reconcile_100d_event(requested_provider_event_id text, requested_contact_id uuid)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_hit boolean := false;
begin
  update public.outbound_unmatched_events
     set resolved_at = pg_catalog.now(), resolved_contact_id = requested_contact_id
   where provider_event_id = requested_provider_event_id and resolved_at is null;
  get diagnostics v_hit = row_count;
  if v_hit then
    update public.outbound_event_receipts set contact_id = requested_contact_id where provider_event_id = requested_provider_event_id;
    insert into public.outbound_event_processing (provider, provider_event_id, outcome, resolution, contact_id, engagement_category, normalization_version, occurred_at)
    select r.provider, r.provider_event_id, 'reconciled', 'matched', requested_contact_id, 'reconciliation', 'reconcile', r.occurred_at
    from public.outbound_event_receipts r where r.provider_event_id = requested_provider_event_id
    on conflict (provider_event_id) do update set outcome = 'reconciled', resolution = 'matched', contact_id = excluded.contact_id;
  end if;
  return jsonb_build_object('reconciled', v_hit);
end $$;

-- PII-free diagnostics sink.
create or replace function public.record_100d_diagnostic(requested_run_id uuid, requested_level text, requested_event text, requested_data jsonb)
returns void language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  insert into public.outbound_ingestion_diagnostics (workflow_id, run_id, level, event, data)
  values ('100D', requested_run_id, requested_level, requested_event, requested_data);
end $$;

-- ---- RLS (deny-all; only the SECURITY DEFINER functions above touch these tables) ----
alter table public.outbound_event_processing enable row level security;
alter table public.outbound_unmatched_events enable row level security;
alter table public.outbound_ingestion_diagnostics enable row level security;
alter table public.outbound_ingestion_workflow_state enable row level security;

revoke all on public.outbound_event_processing, public.outbound_unmatched_events, public.outbound_ingestion_diagnostics, public.outbound_ingestion_workflow_state from public, anon, authenticated;

-- ---- Least-privilege grants: EXECUTE on 004 functions ONLY (no table grants) ----
revoke all on function
  public.resolve_100d_contact(text,text),
  public.apply_100d_instantly_event(text,text,text,text,text,timestamptz,boolean,text,text,jsonb,text),
  public.apply_100d_customer_status(text,text,text,text,timestamptz),
  public.list_100d_unmatched(),
  public.reconcile_100d_event(text,uuid),
  public.record_100d_diagnostic(uuid,text,text,jsonb)
  from public, anon, authenticated;

grant usage on schema public to veltex_100d_ingest;
grant execute on function
  public.resolve_100d_contact(text,text),
  public.apply_100d_instantly_event(text,text,text,text,text,timestamptz,boolean,text,text,jsonb,text),
  public.apply_100d_customer_status(text,text,text,text,timestamptz),
  public.list_100d_unmatched(),
  public.reconcile_100d_event(text,uuid),
  public.record_100d_diagnostic(uuid,text,text,jsonb)
  to veltex_100d_ingest;

commit;
