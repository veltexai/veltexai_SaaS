-- First-party marketing attribution. Additive and provider-neutral.
create table if not exists public.marketing_attribution (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  first_touch jsonb not null,
  last_touch jsonb not null,
  first_touch_captured_at timestamptz not null,
  last_touch_captured_at timestamptz not null,
  ga_client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.marketing_funnel_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  anonymous_id text,
  event_name text not null check (event_name in ('landing','calculator_start','calculator_complete','demo_start','demo_complete','sign_up','start_trial','first_proposal','purchase')),
  attribution jsonb,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
alter table public.marketing_attribution enable row level security;
alter table public.marketing_funnel_events enable row level security;
create policy "Users view own marketing attribution" on public.marketing_attribution for select using (auth.uid() = user_id);
create policy "Users view own funnel events" on public.marketing_funnel_events for select using (auth.uid() = user_id);
create index if not exists marketing_funnel_events_user_name_idx on public.marketing_funnel_events(user_id, event_name, occurred_at);

create or replace function public.record_first_proposal_funnel_event()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_attr public.marketing_attribution%rowtype;
begin
  select * into v_attr from public.marketing_attribution where user_id = new.user_id;
  if v_attr.user_id is null then return new; end if;
  insert into public.marketing_funnel_events(event_id, user_id, event_name, attribution, properties, occurred_at)
  values (
    'first_proposal:' || new.user_id::text, new.user_id, 'first_proposal',
    jsonb_build_object('first_touch', v_attr.first_touch, 'last_touch', v_attr.last_touch),
    jsonb_build_object('proposal_id', new.id), coalesce(new.created_at, now())
  ) on conflict (event_id) do nothing;
  return new;
end $$;

drop trigger if exists proposals_first_proposal_funnel_event on public.proposals;
create trigger proposals_first_proposal_funnel_event
after insert on public.proposals for each row execute function public.record_first_proposal_funnel_event();
