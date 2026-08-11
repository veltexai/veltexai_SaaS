begin;

-- Emergency worker-identity rotation. The v1 JWT may still be cryptographically valid, so its role
-- is stripped of every grant and removed from authenticator before the replacement role is enabled.
revoke veltex_100f_ramp from authenticator;
revoke all on public.ramp_controller_state, public.ramp_daily_metrics, public.ramp_decisions from veltex_100f_ramp;
revoke usage on schema public from veltex_100f_ramp;
revoke execute on function public.read_100f_internal_signals(text,date) from veltex_100f_ramp;
drop policy if exists ramp_worker_state on public.ramp_controller_state;
drop policy if exists ramp_worker_metrics on public.ramp_daily_metrics;
drop policy if exists ramp_worker_decisions on public.ramp_decisions;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'veltex_100f_ramp_v2') then
    create role veltex_100f_ramp_v2 nologin noinherit nobypassrls;
  end if;
end $$;
grant veltex_100f_ramp_v2 to authenticator;
grant usage on schema public to veltex_100f_ramp_v2;
grant select, insert, update on public.ramp_controller_state, public.ramp_daily_metrics, public.ramp_decisions to veltex_100f_ramp_v2;
grant execute on function public.read_100f_internal_signals(text,date) to veltex_100f_ramp_v2;
create policy ramp_worker_state on public.ramp_controller_state for all to veltex_100f_ramp_v2 using (true) with check (true);
create policy ramp_worker_metrics on public.ramp_daily_metrics for all to veltex_100f_ramp_v2 using (true) with check (true);
create policy ramp_worker_decisions on public.ramp_decisions for all to veltex_100f_ramp_v2 using (true) with check (true);

commit;
