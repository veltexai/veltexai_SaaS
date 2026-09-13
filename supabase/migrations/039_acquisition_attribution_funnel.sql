-- Meta Acquisition Sprint V1 attribution completion.
-- Canonical activation: the first proposal successfully saved.

alter table public.marketing_funnel_events
  drop constraint if exists marketing_funnel_events_event_name_check;

alter table public.marketing_funnel_events
  add constraint marketing_funnel_events_event_name_check
  check (event_name in (
    'landing', 'calculator_start', 'calculator_complete', 'demo_start',
    'demo_complete', 'sign_up', 'start_trial', 'first_proposal',
    'repeat_proposal', 'purchase'
  ));

create or replace function public.record_proposal_funnel_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attr public.marketing_attribution%rowtype;
  v_prior_proposals bigint;
  v_event_name text;
begin
  select * into v_attr
  from public.marketing_attribution
  where user_id = new.user_id;

  if v_attr.user_id is null then return new; end if;

  select count(*) into v_prior_proposals
  from public.proposals
  where user_id = new.user_id and id <> new.id;

  v_event_name := case
    when v_prior_proposals = 0 then 'first_proposal'
    else 'repeat_proposal'
  end;

  insert into public.marketing_funnel_events(
    event_id, user_id, event_name, attribution, properties, occurred_at
  ) values (
    v_event_name || ':' || new.id::text,
    new.user_id,
    v_event_name,
    jsonb_build_object('first_touch', v_attr.first_touch, 'last_touch', v_attr.last_touch),
    jsonb_build_object('proposal_id', new.id, 'proposal_number', v_prior_proposals + 1),
    coalesce(new.created_at, now())
  ) on conflict (event_id) do nothing;

  return new;
end;
$$;

drop trigger if exists proposals_first_proposal_funnel_event on public.proposals;
drop trigger if exists proposals_acquisition_funnel_event on public.proposals;

create trigger proposals_acquisition_funnel_event
after insert on public.proposals
for each row execute function public.record_proposal_funnel_event();

create index if not exists marketing_funnel_events_event_occurred_idx
  on public.marketing_funnel_events(event_name, occurred_at);

create or replace view public.acquisition_conversion_funnel
with (security_invoker = true)
as
select
  a.user_id,
  a.first_touch ->> 'source' as source,
  a.first_touch ->> 'medium' as medium,
  a.first_touch ->> 'campaign' as campaign,
  a.first_touch ->> 'content' as creative,
  a.first_touch ->> 'term' as term,
  a.first_touch ->> 'landingPath' as landing_path,
  a.first_touch_captured_at,
  min(e.occurred_at) filter (where e.event_name = 'sign_up') as signed_up_at,
  min(e.occurred_at) filter (where e.event_name = 'start_trial') as trial_started_at,
  min(e.occurred_at) filter (where e.event_name = 'first_proposal') as first_proposal_at,
  min(e.occurred_at) filter (where e.event_name = 'repeat_proposal') as repeat_proposal_at,
  min(e.occurred_at) filter (where e.event_name = 'purchase') as paid_conversion_at,
  count(*) filter (where e.event_name in ('first_proposal', 'repeat_proposal')) as proposals_created,
  coalesce(sum(
    case when e.event_name = 'purchase' then coalesce(
      nullif(e.properties ->> 'value', '')::numeric,
      nullif(e.properties ->> 'amount_cents', '')::numeric / 100
    ) else 0 end
  ), 0) as attributable_revenue
from public.marketing_attribution a
left join public.marketing_funnel_events e on e.user_id = a.user_id
group by a.user_id, a.first_touch, a.first_touch_captured_at;

comment on view public.acquisition_conversion_funnel is
  'First-touch acquisition and activation milestones by user. creative maps to utm_content.';
