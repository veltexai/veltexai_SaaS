-- Isolated-staging candidate. Never applied by the application.
begin;
insert into public.service_catalog_versions values
 ('2026-09-22.2','2026-09-22','operator_review_required',2,'Room-sensitive per-visit pricing, private access notes and turnover agreements')
on conflict (version) do nothing;
-- The guard needs registry visibility even for capability-scoped counter updates.
alter function public.guard_proposal_catalog_version() security definer;
alter function public.guard_proposal_catalog_version() set search_path = pg_catalog, public;
revoke all on function public.guard_proposal_catalog_version() from public;

-- No raw proposal/tracking data is available to anonymous REST clients.
-- Remove column grants as well as table grants; RLS alone is insufficient.
revoke all on public.proposals, public.proposal_tracking from anon, public;
do $$ declare c record; begin
 for c in select table_name, column_name from information_schema.columns
 where table_schema='public' and table_name in ('proposals','proposal_tracking','proposal_views') loop
 execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.%I from anon, public', c.column_name,c.column_name,c.column_name,c.column_name,c.table_name);
 end loop;
end $$;
drop policy if exists "Allow anonymous tracking updates" on public.proposal_tracking;

-- Restrictive owner gates apply to PUBLIC (including authenticated), so an OR-ed
-- permissive policy cannot broaden access. Abort on unexpected policy bodies too:
-- production drift must be reviewed, never silently accepted or deleted.
alter table public.proposals enable row level security;
alter table public.proposal_tracking enable row level security;
create policy catalog_owner_guard on public.proposals as restrictive for all to public
 using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy catalog_owner_guard on public.proposal_tracking as restrictive for all to public
 using (proposal_id in (select id from public.proposals where user_id = auth.uid()))
 with check (proposal_id in (select id from public.proposals where user_id = auth.uid()));
do $$ declare p record; expected text; begin
 if exists (select 1 from pg_roles where rolname in ('anon','authenticated') and (rolsuper or rolbypassrls)) then
   raise exception 'Client role bypasses RLS';
 end if;
 for p in select pol.*, pg_get_expr(pol.polqual,pol.polrelid) as using_expression,
                  pg_get_expr(pol.polwithcheck,pol.polrelid) as check_expression
          from pg_policy pol where pol.polrelid in ('public.proposals'::regclass,'public.proposal_tracking'::regclass) loop
   select pg_get_expr(polqual,polrelid) into expected from pg_policy
     where polrelid=p.polrelid and polname='catalog_owner_guard';
   if (p.polcmd in ('r','w','d','*') and p.using_expression is distinct from expected)
      or (p.polcmd in ('a','*') and p.check_expression is distinct from expected)
      or (p.polcmd='w' and p.check_expression is not null and p.check_expression <> expected) then
     raise exception 'Unreviewed policy %.% (command %); inspect grants and ownership before retrying', p.polrelid::regclass,p.polname,p.polcmd;
   end if;
 end loop;
end $$;
-- View events can only be inserted through a token-resolving function.
revoke all on public.proposal_views from anon, public;
revoke insert, update, delete on public.proposal_views from authenticated;
drop policy if exists "Allow anonymous proposal view tracking" on public.proposal_views;
alter table public.proposal_views enable row level security;
create policy catalog_owner_guard on public.proposal_views as restrictive for all to public
 using (exists (select 1 from public.proposals p where p.id=proposal_id and p.user_id=auth.uid()))
 with check (exists (select 1 from public.proposals p where p.id=proposal_id and p.user_id=auth.uid()));

-- Possession of an unguessable tracking token is the only public capability.
-- Explicit allowlist: never return service_specific_data, client email or costs.
create or replace function public.read_tracked_proposal(token text) returns jsonb
language sql stable security definer set search_path = pg_catalog, public as $$
 select jsonb_build_object('proposal', jsonb_build_object(
   'id',p.id,'title',p.title,'client_name',p.client_name,'client_company',p.client_company,
   'service_location',p.service_location,'service_type',p.service_type,
   'service_frequency',p.service_frequency,'facility_size',p.facility_size,
   'generated_content',case when p.service_specific_data ? 'catalogJob' then regexp_replace(p.generated_content, E'(^|\n)Access:[^\n]*', '', 'g') else p.generated_content end,'pricing_enabled',p.pricing_enabled,
   'pricing_data',jsonb_build_object('price_range',p.pricing_data->'price_range'),
   'status',p.status,'created_at',p.created_at,
   'catalog_document',coalesce(p.service_specific_data ? 'catalogJob',false),
   'company_profiles',jsonb_build_object('company_name',coalesce(c.company_name,'Cleaning company'),'logo_url',c.logo_url,'primary_color',c.primary_color,'secondary_color',c.secondary_color)),
   'tracking',jsonb_build_object('id',t.id,'tracking_id',t.tracking_id,'proposal_id',t.proposal_id,
   'delivery_method',t.delivery_method,'track_opens',t.track_opens,'track_downloads',t.track_downloads))
 from public.proposal_tracking t join public.proposals p on p.id=t.proposal_id
 left join public.company_profiles c on c.user_id=p.user_id
 where t.tracking_id=token and length(token)>=20 limit 1;
$$;
-- Keep the existing history trigger as the sole proposal-counter writer.
create or replace function public.update_proposal_view_count() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
 update public.proposals set view_count=coalesce(view_count,0)+1,last_viewed_at=new.viewed_at where id=new.proposal_id;
 return new;
end $$;
revoke all on function public.update_proposal_view_count() from public;
create or replace function public.record_tracked_view(token text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
 if length(token)<20 then return false; end if;
 update public.proposal_tracking set viewed=true,viewed_at=now(),last_viewed_at=now(),view_count=coalesce(view_count,0)+1
 where tracking_id=token and track_opens returning proposal_id into target;
 if target is null then return false; end if;
 -- The existing AFTER INSERT trigger updates the proposal counter exactly once.
 insert into public.proposal_views (proposal_id,tracking_token) values (target,gen_random_uuid()::text);
 return true;
end $$;
revoke all on function public.read_tracked_proposal(text), public.record_tracked_view(text) from public;
grant execute on function public.read_tracked_proposal(text), public.record_tracked_view(text) to anon, authenticated;
create or replace function public.record_tracking_metric(token text, metric text, value integer default 0) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
 if length(token)<20 or metric not in ('open','time','scroll') then return false; end if;
 update public.proposal_tracking set
 opened = case when metric='open' then true else opened end,
 opened_at = case when metric='open' then coalesce(opened_at,now()) else opened_at end,
 time_spent_seconds = case when metric='time' then least(86400,coalesce(time_spent_seconds,0) + greatest(0,least(value,86400))) else time_spent_seconds end,
 max_scroll_depth = case when metric='scroll' then greatest(coalesce(max_scroll_depth,0),greatest(0,least(value,100))) else max_scroll_depth end
 where tracking_id=token and track_opens;
 return found;
end $$;
revoke all on function public.record_tracking_metric(text,text,integer) from public;
grant execute on function public.record_tracking_metric(text,text,integer) to anon, authenticated;
alter table public.marketing_funnel_events drop constraint if exists marketing_funnel_events_event_name_check;
alter table public.marketing_funnel_events add constraint marketing_funnel_events_event_name_check check (event_name in (
 'landing','calculator_start','calculator_complete','demo_start','demo_complete','sign_up','account_created','email_verified','start_trial','role_qualified','quick_flow_opened','proposal_generate_started','proposal_generate_succeeded','proposal_generate_failed','first_proposal','repeat_proposal','proposal_saved','paywall_viewed','upgrade_clicked','checkout_started','trial_limit_reached','trial_expired','purchase',
 'catalog_previewed','proposal_regenerated','catalog_profile_saved'
)) not valid;
-- Existing unknown event names remain readable; inventory before VALIDATE CONSTRAINT.


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
  count(distinct e.user_id) filter (where e.event_name in ('proposal_generate_succeeded','catalog_previewed')) as proposal_generators,
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

commit;
