begin;

do $$ begin
  if not exists (select 1 from pg_catalog.pg_roles where rolname = 'veltex_100g_orchestrator_v2') then
    create role veltex_100g_orchestrator_v2 nologin noinherit nobypassrls;
  end if;
end $$;

grant veltex_100g_orchestrator_v2 to authenticator;
grant usage on schema public to veltex_100g_orchestrator_v2;
grant execute on function public.read_100g_supply_snapshot() to veltex_100g_orchestrator_v2;
grant select, insert on public.acquisition_orchestration_runs to veltex_100g_orchestrator_v2;

drop policy if exists acquisition_orchestration_worker on public.acquisition_orchestration_runs;
create policy acquisition_orchestration_worker_v2 on public.acquisition_orchestration_runs
  for all to veltex_100g_orchestrator_v2 using (true) with check (true);

revoke all on public.acquisition_orchestration_runs from veltex_100g_orchestrator;
revoke all on function public.read_100g_supply_snapshot() from veltex_100g_orchestrator;
revoke usage on schema public from veltex_100g_orchestrator;
revoke veltex_100g_orchestrator from authenticator;
drop role if exists veltex_100g_orchestrator;

commit;
