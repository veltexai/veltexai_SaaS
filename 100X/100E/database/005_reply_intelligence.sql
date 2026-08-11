-- 100E — Reply Intelligence (additive migration 005).
-- Depends on 003 and 004. Reply content never enters the database: callers submit only a SHA-256,
-- length, classification, route, and non-PII evidence codes. No function sends email or changes a
-- campaign. Explicit opt-outs are atomically added to the 100C suppression registry.

begin;

do $$
begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100e_reply') then
    create role veltex_100e_reply nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100e_reply to authenticator;

create table if not exists public.reply_intelligence_results (
  id uuid primary key default extensions.gen_random_uuid(),
  provider_event_id text not null unique,
  campaign_config_id text not null references public.campaign_configs(config_id) on delete restrict,
  contact_id uuid references public.prospect_contacts(id) on delete set null,
  normalized_email_sha256 text not null check (length(normalized_email_sha256) = 64),
  occurred_at timestamptz not null,
  classification text not null check (classification in (
    'interested','meeting_intent','question','not_interested','unsubscribe','out_of_office',
    'wrong_person','automatic_reply','unknown')),
  route text not null check (route in ('sales_review','scheduling_review','follow_up_later','human_review','no_action')),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  evidence_codes text[] not null default '{}',
  body_sha256 text not null check (length(body_sha256) = 64),
  body_length integer not null check (body_length >= 0 and body_length <= 32000),
  classifier_version text not null,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists reply_intelligence_route_idx on public.reply_intelligence_results (route, created_at);
create index if not exists reply_intelligence_contact_idx on public.reply_intelligence_results (contact_id, created_at);

create table if not exists public.reply_action_queue (
  id uuid primary key default extensions.gen_random_uuid(),
  reply_result_id uuid not null unique references public.reply_intelligence_results(id) on delete restrict,
  route text not null check (route in ('sales_review','scheduling_review','follow_up_later','human_review','no_action')),
  status text not null check (status in ('pending','in_review','completed','dismissed')),
  available_at timestamptz not null default pg_catalog.now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default pg_catalog.now()
);
create index if not exists reply_action_open_idx on public.reply_action_queue (available_at, created_at) where status = 'pending';

create table if not exists public.reply_intelligence_diagnostics (
  id bigint generated always as identity primary key,
  event text not null,
  data jsonb,
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists public.reply_intelligence_workflow_state (
  workflow_id text primary key check (workflow_id = '100E'),
  cursor_index bigint not null default 0 check (cursor_index >= 0),
  updated_at timestamptz not null default pg_catalog.now()
);
insert into public.reply_intelligence_workflow_state (workflow_id) values ('100E') on conflict do nothing;

create or replace function public.apply_100e_reply_classification(
  requested_provider_event_id text,
  requested_campaign_config_id text,
  requested_normalized_email text,
  requested_occurred_at timestamptz,
  requested_classification text,
  requested_route text,
  requested_confidence numeric,
  requested_evidence_codes text[],
  requested_body_sha256 text,
  requested_body_length integer,
  requested_classifier_version text,
  requested_suppression_kind text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, extensions as $$
declare v_resolution jsonb; v_contact uuid; v_result uuid; v_supp uuid;
begin
  if not exists (
    select 1 from public.outbound_event_receipts r
    where r.provider = 'instantly' and r.provider_event_id = requested_provider_event_id
      and r.campaign_config_id = requested_campaign_config_id
      and r.event_type in ('reply_received','auto_reply_received')
  ) then raise exception 'reply event receipt is missing or mismatched'; end if;
  if requested_classification not in ('interested','meeting_intent','question','not_interested','unsubscribe','out_of_office','wrong_person','automatic_reply','unknown') then raise exception 'invalid classification'; end if;
  if requested_route not in ('sales_review','scheduling_review','follow_up_later','human_review','no_action') then raise exception 'invalid route'; end if;
  if requested_confidence < 0 or requested_confidence > 1 then raise exception 'invalid confidence'; end if;
  if requested_body_length < 0 or requested_body_length > 32000 or length(requested_body_sha256) <> 64 then raise exception 'invalid body metadata'; end if;

  v_resolution := public.resolve_100d_contact(requested_normalized_email, requested_campaign_config_id);
  v_contact := nullif(v_resolution->>'contact_id','')::uuid;

  insert into public.reply_intelligence_results (
    provider_event_id, campaign_config_id, contact_id, normalized_email_sha256, occurred_at,
    classification, route, confidence, evidence_codes, body_sha256, body_length, classifier_version)
  values (
    requested_provider_event_id, requested_campaign_config_id, v_contact,
    encode(extensions.digest(lower(requested_normalized_email), 'sha256'), 'hex'), requested_occurred_at,
    requested_classification, requested_route, requested_confidence, coalesce(requested_evidence_codes,'{}'),
    requested_body_sha256, requested_body_length, requested_classifier_version)
  on conflict (provider_event_id) do nothing returning id into v_result;

  if v_result is not null then
    insert into public.reply_action_queue (reply_result_id, route, status, available_at)
    values (v_result, requested_route, case when requested_route = 'no_action' then 'completed' else 'pending' end,
      case when requested_route = 'follow_up_later' then pg_catalog.now() + interval '3 days' else pg_catalog.now() end);
    if requested_suppression_kind = 'do_not_contact' then
      insert into public.outbound_suppression_registry
        (kind, match_type, normalized_email, source, reason, external_reference, occurred_at)
      values ('do_not_contact','email',lower(requested_normalized_email),'100e_reply_intelligence',
        requested_classification,requested_provider_event_id,requested_occurred_at)
      on conflict (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at) do nothing
      returning id into v_supp;
    end if;
    insert into public.reply_intelligence_diagnostics (event, data) values
      ('reply.classified', jsonb_build_object('providerEventId',requested_provider_event_id,'classification',requested_classification,'route',requested_route,'confidence',requested_confidence,'matched',v_contact is not null));
  end if;
  return jsonb_build_object('inserted',v_result is not null,'suppression_inserted',v_supp is not null);
end $$;

alter table public.reply_intelligence_results enable row level security;
alter table public.reply_action_queue enable row level security;
alter table public.reply_intelligence_diagnostics enable row level security;
alter table public.reply_intelligence_workflow_state enable row level security;
revoke all on public.reply_intelligence_results, public.reply_action_queue, public.reply_intelligence_diagnostics, public.reply_intelligence_workflow_state from public, anon, authenticated;
revoke all on function public.apply_100e_reply_classification(text,text,text,timestamptz,text,text,numeric,text[],text,integer,text,text) from public, anon, authenticated;
grant usage on schema public to veltex_100e_reply;
grant execute on function public.apply_100e_reply_classification(text,text,text,timestamptz,text,text,numeric,text[],text,integer,text,text) to veltex_100e_reply;

commit;
