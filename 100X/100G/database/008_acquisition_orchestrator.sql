begin;

create table if not exists public.acquisition_orchestration_runs (
  run_date date not null,
  mode text not null check (mode in ('dry_run','execute')),
  requested_leads integer not null check (requested_leads >= 0),
  status text not null check (status in ('completed','failed')),
  results jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  primary key (run_date, mode)
);

create or replace function public.read_100g_supply_snapshot()
returns jsonb language sql security definer set search_path = pg_catalog, public as $$
  select pg_catalog.jsonb_build_object(
    'current_daily_send_stage', coalesce((select max(current_stage) from public.ramp_controller_state), 1),
    'queued_eligible_leads', (
      select count(*) from public.prospect_contacts pc
      where pc.outreach_eligibility = 'ready_for_outreach'
        and pc.email_verification_status = 'verified'
        and pc.is_current_contact
        and not exists (
          select 1 from public.campaign_contact_assignments a
          where a.contact_id = pc.id
            and a.state in ('reserved','submitting','submitted','reconciliation_required')
        )
    )
  );
$$;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100g_orchestrator') then
    create role veltex_100g_orchestrator nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100g_orchestrator to authenticator;
grant usage on schema public to veltex_100g_orchestrator;
grant execute on function public.read_100g_supply_snapshot() to veltex_100g_orchestrator;
grant select, insert on public.acquisition_orchestration_runs to veltex_100g_orchestrator;

alter table public.acquisition_orchestration_runs enable row level security;
revoke all on public.acquisition_orchestration_runs from public, anon, authenticated;
revoke all on function public.read_100g_supply_snapshot() from public, anon, authenticated;
drop policy if exists acquisition_orchestration_worker on public.acquisition_orchestration_runs;
create policy acquisition_orchestration_worker on public.acquisition_orchestration_runs
  for all to veltex_100g_orchestrator using (true) with check (true);

commit;
