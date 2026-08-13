begin;

-- Add two conservative early stages without changing the active stage or any sending limit.
-- The controller still advances at most one stage after every existing evidence gate passes.
alter table public.ramp_controller_state
  drop constraint if exists ramp_controller_state_current_stage_check;
alter table public.ramp_controller_state
  add constraint ramp_controller_state_current_stage_check
  check (current_stage in (1,3,5,10,25,50,120,250,500));

commit;
