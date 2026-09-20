-- First-party qualification and counts-only funnel reporting.
alter table public.profiles
  add column if not exists buyer_role text,
  add column if not exists cleaning_business_type text,
  add column if not exists bids_per_month_bucket text,
  add column if not exists qualified_at timestamptz,
  add column if not exists is_internal boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_buyer_role_check,
  add constraint profiles_buyer_role_check check (buyer_role is null or buyer_role in ('owner_operator','manager_estimator','employee','consultant','other')),
  drop constraint if exists profiles_cleaning_business_type_check,
  add constraint profiles_cleaning_business_type_check check (cleaning_business_type is null or cleaning_business_type in ('commercial','residential','both','specialty','not_cleaning_business')),
  drop constraint if exists profiles_bids_per_month_bucket_check,
  add constraint profiles_bids_per_month_bucket_check check (bids_per_month_bucket is null or bids_per_month_bucket in ('0','1_3','4_10','10_plus'));

update public.profiles set is_internal = true
where lower(email) like 'veltexclean+%@gmail.com'
   or lower(email) like '%@veltexai.com'
   or lower(email) like '%@veltexclean.com'
   or split_part(lower(email), '@', 2) in ('example.com','test.com','mailinator.com');

create or replace function public.classify_internal_profile() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.is_internal := lower(new.email) like 'veltexclean+%@gmail.com'
    or lower(new.email) like '%@veltexai.com'
    or lower(new.email) like '%@veltexclean.com'
    or split_part(lower(new.email), '@', 2) in ('example.com','test.com','mailinator.com');
  return new;
end;
$$;

drop trigger if exists profiles_classify_internal on public.profiles;
create trigger profiles_classify_internal before insert or update of email on public.profiles
for each row execute function public.classify_internal_profile();

alter table public.marketing_funnel_events drop constraint if exists marketing_funnel_events_event_name_check;
alter table public.marketing_funnel_events add constraint marketing_funnel_events_event_name_check check (event_name in (
  'landing','calculator_start','calculator_complete','demo_start','demo_complete','sign_up','account_created','email_verified','start_trial','role_qualified','quick_flow_opened','proposal_generate_started','proposal_generate_succeeded','proposal_generate_failed','first_proposal','repeat_proposal','proposal_saved','paywall_viewed','upgrade_clicked','checkout_started','trial_limit_reached','trial_expired','purchase'
));

create or replace view public.growth_funnel_daily with (security_invoker = true) as
select
  (e.occurred_at at time zone 'America/Los_Angeles')::date as pacific_date,
  coalesce(a.first_touch ->> 'source', 'direct') as source,
  coalesce(a.first_touch ->> 'medium', '') as medium,
  coalesce(a.first_touch ->> 'campaign', '') as campaign,
  coalesce(a.first_touch ->> 'content', '') as creative,
  count(distinct e.user_id) filter (where e.event_name in ('sign_up','account_created')) as accounts_created,
  count(distinct e.user_id) filter (where e.event_name in ('email_verified','sign_up')) as registrations_completed,
  count(distinct e.user_id) filter (where e.event_name = 'start_trial') as trials_started,
  count(distinct e.user_id) filter (where e.event_name = 'role_qualified') as users_qualified,
  count(distinct e.user_id) filter (where e.event_name = 'proposal_generate_succeeded') as proposal_generators,
  count(distinct e.user_id) filter (where e.event_name = 'first_proposal') as first_proposals,
  count(distinct e.user_id) filter (where e.event_name = 'repeat_proposal') as repeat_proposals,
  count(distinct e.user_id) filter (where e.event_name = 'checkout_started') as checkout_starts,
  count(distinct e.user_id) filter (where e.event_name = 'purchase') as paid_users
from public.marketing_funnel_events e
left join public.profiles p on p.id = e.user_id
left join public.marketing_attribution a on a.user_id = e.user_id
where coalesce(p.is_internal, false) = false
group by 1,2,3,4,5;

comment on view public.growth_funnel_daily is 'Counts-only authenticated funnel by Pacific day and first-touch attribution. Internal/QA profiles are excluded.';
