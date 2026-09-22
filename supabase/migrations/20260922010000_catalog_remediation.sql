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
 where table_schema='public' and table_name in ('proposals','proposal_tracking') loop
 execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.%I from anon, public', c.column_name,c.column_name,c.column_name,c.column_name,c.table_name);
 end loop;
end $$;
drop policy if exists "Allow anonymous tracking updates" on public.proposal_tracking;

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
create or replace function public.record_tracked_view(token text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
 if length(token)<20 then return false; end if;
 update public.proposal_tracking set viewed=true,viewed_at=now(),last_viewed_at=now(),view_count=coalesce(view_count,0)+1
 where tracking_id=token and track_opens returning proposal_id into target;
 if target is null then return false; end if;
 update public.proposals set view_count=coalesce(view_count,0)+1,last_viewed_at=now() where id=target;
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
 time_spent_seconds = coalesce(time_spent_seconds,0) + case when metric='time' then greatest(0,least(value,86400)) else 0 end,
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
));
commit;
