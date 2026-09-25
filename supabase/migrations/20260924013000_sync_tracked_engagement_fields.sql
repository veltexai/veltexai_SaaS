-- Keep legacy analytics fields and the enhanced tracking fields in sync.
-- Public callers possess only an unguessable tracking token; no row IDs are accepted.
create or replace function public.record_tracked_view(token text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if length(token) < 20 then return false; end if;
  update public.proposal_tracking
     set viewed = true,
         viewed_at = coalesce(viewed_at, now()),
         last_viewed_at = now(),
         proposal_viewed = true,
         proposal_viewed_at = coalesce(proposal_viewed_at, now()),
         view_count = coalesce(view_count, 0) + 1
   where tracking_id = token and track_opens
   returning proposal_id into target;
  if target is null then return false; end if;
  insert into public.proposal_views (proposal_id, tracking_token)
  values (target, gen_random_uuid()::text);
  return true;
end $$;

create or replace function public.record_tracked_download(token text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if length(token) < 20 then return false; end if;
  update public.proposal_tracking
     set downloaded = true,
         downloaded_at = coalesce(downloaded_at, now()),
         proposal_downloaded = true,
         proposal_downloaded_at = coalesce(proposal_downloaded_at, now()),
         download_count = coalesce(download_count, 0) + 1
   where tracking_id = token and track_downloads
   returning proposal_id into target;
  if target is null then return false; end if;
  insert into public.proposal_downloads (proposal_id)
  values (target);
  return true;
end $$;

create or replace function public.record_tracking_click(
  token text,
  clicked_element_type text,
  clicked_element_text text default null,
  clicked_element_id text default null
) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if length(token) < 20 or length(clicked_element_type) > 100 then return false; end if;
  select proposal_id into target
    from public.proposal_tracking
   where tracking_id = token and track_opens;
  if target is null then return false; end if;
  insert into public.proposal_click_tracking (proposal_id, element_type, element_text, element_id)
  values (
    target,
    clicked_element_type,
    left(clicked_element_text, 255),
    left(clicked_element_id, 100)
  );
  return true;
end $$;

create or replace function public.tracked_proposal_has_paid_access(token text) returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1
      from public.proposal_tracking t
      join public.proposals p on p.id = t.proposal_id
      left join public.subscriptions s on s.user_id = p.user_id
      left join public.profiles pr on pr.id = p.user_id
     where t.tracking_id = token
       and length(token) >= 20
       and (s.status = 'active' or pr.subscription_status = 'active')
  );
$$;

revoke all on function public.record_tracked_view(text), public.record_tracked_download(text), public.record_tracking_click(text,text,text,text), public.tracked_proposal_has_paid_access(text) from public;
grant execute on function public.record_tracked_view(text), public.record_tracked_download(text), public.record_tracking_click(text,text,text,text), public.tracked_proposal_has_paid_access(text) to anon, authenticated;
