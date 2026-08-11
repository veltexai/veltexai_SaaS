begin;

create table if not exists public.ramp_controller_state (
  campaign_id text primary key,
  current_stage integer not null default 1 check (current_stage in (1,10,25,50,120,250,500)),
  stage_started_at timestamptz not null default now(),
  last_decision_date date,
  paused_by_controller boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.ramp_daily_metrics (
  campaign_id text not null,
  metric_date date not null,
  campaign_status integer not null,
  configured_daily_limit integer not null check (configured_daily_limit >= 0),
  sent integer not null check (sent >= 0),
  bounced integer not null check (bounced >= 0),
  replies integer not null check (replies >= 0),
  unsubscribes integer not null check (unsubscribes >= 0),
  spam_complaints integer not null check (spam_complaints >= 0),
  webhook_failures integer not null check (webhook_failures >= 0),
  healthy_sending_accounts integer not null check (healthy_sending_accounts >= 0),
  minimum_account_health numeric not null check (minimum_account_health between 0 and 100),
  recorded_at timestamptz not null default now(),
  primary key (campaign_id, metric_date)
);

create table if not exists public.ramp_decisions (
  idempotency_key text primary key,
  campaign_id text not null,
  action text not null check (action in ('hold','advance','pause')),
  current_stage integer not null,
  target_stage integer not null,
  reason text not null,
  observed_at timestamptz not null,
  metrics jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.read_100f_internal_signals(requested_campaign_id text, requested_date date)
returns jsonb language sql security definer set search_path = pg_catalog, public as $$
  select pg_catalog.jsonb_build_object(
    'spam_complaints', (
      select count(*) from public.outbound_event_receipts e
      join public.campaign_configs c on c.config_id = e.campaign_config_id
      where c.instantly_campaign_id::text = requested_campaign_id
        and e.event_type = 'spam_complaint'
        and e.occurred_at >= requested_date::timestamptz
        and e.occurred_at < (requested_date + 1)::timestamptz
    ),
    'webhook_failures', (
      select count(*) from public.outbound_ingestion_diagnostics d
      where d.level = 'error'
        and d.created_at >= requested_date::timestamptz
        and d.created_at < (requested_date + 1)::timestamptz
    )
  );
$$;

alter table public.ramp_controller_state enable row level security;
alter table public.ramp_daily_metrics enable row level security;
alter table public.ramp_decisions enable row level security;
revoke all on public.ramp_controller_state, public.ramp_daily_metrics, public.ramp_decisions from public, anon, authenticated;
revoke all on function public.read_100f_internal_signals(text,date) from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'veltex_100f_ramp') then
    create role veltex_100f_ramp nologin;
  end if;
end $$;
grant veltex_100f_ramp to authenticator;
grant usage on schema public to veltex_100f_ramp;
grant execute on function public.read_100f_internal_signals(text,date) to veltex_100f_ramp;
grant select, insert, update on public.ramp_controller_state, public.ramp_daily_metrics, public.ramp_decisions to veltex_100f_ramp;
drop policy if exists ramp_worker_state on public.ramp_controller_state;
drop policy if exists ramp_worker_metrics on public.ramp_daily_metrics;
drop policy if exists ramp_worker_decisions on public.ramp_decisions;
create policy ramp_worker_state on public.ramp_controller_state for all to veltex_100f_ramp using (true) with check (true);
create policy ramp_worker_metrics on public.ramp_daily_metrics for all to veltex_100f_ramp using (true) with check (true);
create policy ramp_worker_decisions on public.ramp_decisions for all to veltex_100f_ramp using (true) with check (true);

commit;
