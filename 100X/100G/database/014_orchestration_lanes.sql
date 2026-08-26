begin;

-- Daily sending, discovery, and enrichment run independently. This prevents a slow
-- acquisition provider from consuming the time-sensitive outbound invocation while
-- retaining one idempotent, auditable result per lane and day.
alter table public.acquisition_orchestration_runs
  add column if not exists lane text not null default 'full';

alter table public.acquisition_orchestration_runs
  drop constraint if exists acquisition_orchestration_runs_lane_check;
alter table public.acquisition_orchestration_runs
  add constraint acquisition_orchestration_runs_lane_check
  check (lane in ('full','outbound','discovery','enrichment'));

alter table public.acquisition_orchestration_runs
  drop constraint if exists acquisition_orchestration_runs_pkey;
alter table public.acquisition_orchestration_runs
  add primary key (run_date, mode, lane);

commit;
