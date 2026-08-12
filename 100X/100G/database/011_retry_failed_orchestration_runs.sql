begin;

-- A failed 100G run may be safely retried after a stage lock expires.  Completed runs remain
-- immutable through the conditional update used by the application repository.
grant update on public.acquisition_orchestration_runs to veltex_100g_orchestrator_v2;

commit;
