-- Organization-managed, fail-closed revocation for public proposal links.
begin;

alter table public.proposal_tracking
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references public.profiles(id) on delete set null,
  add column if not exists revocation_reason text;

alter table public.proposal_tracking
  drop constraint if exists proposal_tracking_revocation_reason_length;
alter table public.proposal_tracking
  add constraint proposal_tracking_revocation_reason_length
  check (revocation_reason is null or length(revocation_reason) between 1 and 240);

create index if not exists proposal_tracking_active_token_idx
  on public.proposal_tracking(tracking_id) where revoked_at is null;

create or replace function public.revoke_tracked_proposal_link(
  tracking_uuid uuid,
  proposal_uuid uuid,
  reason text default null
) returns boolean
language plpgsql volatile security definer
set search_path = pg_catalog, public as $$
declare
  tracked_proposal_id uuid;
  existing_revoked_at timestamptz;
  tenant_id uuid;
  normalized_reason text;
begin
  if auth.uid() is null then return false; end if;
  normalized_reason := nullif(trim(reason), '');
  if normalized_reason is not null and length(normalized_reason) > 240 then
    raise exception 'revocation reason must be 240 characters or fewer'
      using errcode = '22023';
  end if;

  select t.proposal_id, p.organization_id, t.revoked_at
    into tracked_proposal_id, tenant_id, existing_revoked_at
  from public.proposal_tracking t
  join public.proposals p on p.id = t.proposal_id
  where t.id = tracking_uuid and t.proposal_id = proposal_uuid
  for update of t;

  if not found or not public.can_manage_organization(tenant_id) then
    return false;
  end if;
  if existing_revoked_at is not null then return true; end if;

  update public.proposal_tracking
  set revoked_at = now(), revoked_by = auth.uid(),
      revocation_reason = normalized_reason
  where id = tracking_uuid and revoked_at is null;

  insert into public.organization_audit_log(
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    tenant_id, auth.uid(), 'proposal_tracking.revoked', 'proposal_tracking',
    tracking_uuid::text,
    jsonb_build_object('proposal_id', tracked_proposal_id, 'reason', normalized_reason)
  );
  return true;
end $$;

revoke all on function public.revoke_tracked_proposal_link(uuid,uuid,text) from public, anon;
grant execute on function public.revoke_tracked_proposal_link(uuid,uuid,text) to authenticated;

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
   'company_profiles',jsonb_build_object(
      'company_name',coalesce(c.company_name,o.name,'Cleaning company'),
      'logo_url',c.logo_url)),
   'tracking',jsonb_build_object('id',t.id,'tracking_id',t.tracking_id,'proposal_id',t.proposal_id,
   'delivery_method',t.delivery_method,'track_opens',t.track_opens,'track_downloads',t.track_downloads))
 from public.proposal_tracking t
 join public.proposals p on p.id=t.proposal_id
 join public.organizations o on o.id=p.organization_id
 left join public.company_profiles c on c.organization_id=p.organization_id
 where t.tracking_id=token and length(token)>=20 and t.revoked_at is null limit 1;
$$;

create or replace function public.record_tracked_view(token text) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if length(token) < 20 then return false; end if;
  update public.proposal_tracking
     set viewed = true, viewed_at = coalesce(viewed_at, now()), last_viewed_at = now(),
         proposal_viewed = true, proposal_viewed_at = coalesce(proposal_viewed_at, now()),
         view_count = coalesce(view_count, 0) + 1
   where tracking_id = token and track_opens and revoked_at is null
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
     set downloaded = true, downloaded_at = coalesce(downloaded_at, now()),
         proposal_downloaded = true,
         proposal_downloaded_at = coalesce(proposal_downloaded_at, now()),
         download_count = coalesce(download_count, 0) + 1
   where tracking_id = token and track_downloads and revoked_at is null
   returning proposal_id into target;
  if target is null then return false; end if;
  insert into public.proposal_downloads (proposal_id) values (target);
  return true;
end $$;

create or replace function public.record_tracking_click(
  token text, clicked_element_type text, clicked_element_text text default null,
  clicked_element_id text default null
) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare target uuid;
begin
  if length(token) < 20 or length(clicked_element_type) > 100 then return false; end if;
  select proposal_id into target from public.proposal_tracking
   where tracking_id = token and track_opens and revoked_at is null;
  if target is null then return false; end if;
  insert into public.proposal_click_tracking (proposal_id, element_type, element_text, element_id)
  values (target, clicked_element_type, left(clicked_element_text,255), left(clicked_element_id,100));
  return true;
end $$;

create or replace function public.record_tracking_metric(
  token text, metric text, value integer default 0
) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if length(token)<20 or metric not in ('open','time','scroll') then return false; end if;
  update public.proposal_tracking set
    opened = case when metric='open' then true else opened end,
    opened_at = case when metric='open' then coalesce(opened_at,now()) else opened_at end,
    time_spent_seconds = case when metric='time' then least(86400,coalesce(time_spent_seconds,0) + greatest(0,least(value,86400))) else time_spent_seconds end,
    max_scroll_depth = case when metric='scroll' then greatest(coalesce(max_scroll_depth,0),greatest(0,least(value,100))) else max_scroll_depth end
  where tracking_id=token and track_opens and revoked_at is null;
  return found;
end $$;

create or replace function public.tracked_proposal_has_paid_access(token text)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select coalesce(case
    when owner_pr.subscription_status = 'free_trial' then false
    when latest.status is not null then latest.status = 'active'
    else owner_pr.subscription_status = 'active' end, false)
  from public.proposal_tracking t
  join public.proposals p on p.id = t.proposal_id
  join public.organizations o on o.id = p.organization_id
  left join public.profiles owner_pr on owner_pr.id = o.created_by
  left join lateral (
    select s.status from public.subscriptions s
    where s.user_id = o.created_by and s.status in ('active','trialing')
    order by s.created_at desc limit 1
  ) latest on true
  where t.tracking_id = token and length(token) >= 20 and t.revoked_at is null;
$$;

-- Preserve the established customer-safe print projection and add revocation
-- to its token predicate. No additional proposal fields are exposed.
create or replace function public.read_tracked_proposal_print(token text)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public as $$
  select jsonb_build_object(
    'proposal', jsonb_build_object(
      'id',p.id,'title',p.title,'client_name',p.client_name,'client_company',p.client_company,
      'service_location',p.service_location,'service_type',p.service_type,
      'service_frequency',p.service_frequency,'facility_size',p.facility_size,
      'regional_location',p.regional_location,'property_type',p.property_type,
      'facility_details',jsonb_build_object('building_type',p.facility_details->'building_type'),
      'service_specific_data',jsonb_build_object('scope_template_id',p.service_specific_data->'scope_template_id','property_type',p.service_specific_data->'property_type'),
      'global_inputs',jsonb_build_object('proposal_date',p.global_inputs->'proposal_date'),
      'generated_content',case when p.service_specific_data ? 'catalogJob' then regexp_replace(p.generated_content,E'(^|\n)Access:[^\n]*','','g') else p.generated_content end,
      'pricing_enabled',p.pricing_enabled,'pricing_data',jsonb_build_object('price_range',p.pricing_data->'price_range'),
      'status',p.status,'created_at',p.created_at,
      'catalog_document',coalesce(p.service_specific_data ? 'catalogJob',false),
      'template',case when pt.id is null then null else jsonb_build_object('name',pt.name) end,
      'company_profiles',jsonb_build_object(
        'company_name',coalesce(c.company_name,o.name,'Cleaning company'),'logo_url',c.logo_url,
        'phone',c.contact_info->>'phone','website',c.contact_info->>'website','email',c.contact_info->>'email',
        'colors',jsonb_build_object('primary',coalesce(ubs.primary_color,'#1e3a8a'),'secondary',coalesce(ubs.secondary_color,'#0ea5e9'),'accent',coalesce(ubs.accent_color,'#1f2937')),
        'show_powered_by',case when owner_pr.subscription_status='free_trial' then false when s.plan in ('professional','enterprise') then false else true end),
      'additional_services',coalesce(extras.rows,'[]'::jsonb)),
    'tracking',jsonb_build_object('id',t.id,'tracking_id',t.tracking_id,'proposal_id',t.proposal_id,
      'delivery_method',t.delivery_method,'track_opens',t.track_opens,'track_downloads',t.track_downloads))
  from public.proposal_tracking t
  join public.proposals p on p.id=t.proposal_id
  join public.organizations o on o.id=p.organization_id
  left join public.profiles owner_pr on owner_pr.id=o.created_by
  left join public.company_profiles c on c.organization_id=p.organization_id
  left join public.proposal_templates pt on pt.id=p.template_id
  left join public.user_branding_settings ubs on ubs.user_id=o.created_by
  left join lateral (select s.plan from public.subscriptions s where s.user_id=o.created_by and s.status in ('active','trialing') order by s.created_at desc limit 1) s on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('service',pas.label,'frequency',pas.frequency,'subtotal',pas.subtotal,'monthly_amount',pas.monthly_amount) order by pas.created_at,pas.id) rows
    from public.proposal_additional_services pas where pas.proposal_id=p.id
  ) extras on true
  where t.tracking_id=token and length(token)>=20 and t.revoked_at is null limit 1;
$$;

revoke all on function public.read_tracked_proposal(text), public.read_tracked_proposal_print(text),
  public.record_tracked_view(text), public.record_tracked_download(text),
  public.record_tracking_click(text,text,text,text), public.record_tracking_metric(text,text,integer),
  public.tracked_proposal_has_paid_access(text) from public;
grant execute on function public.read_tracked_proposal(text), public.read_tracked_proposal_print(text),
  public.record_tracked_view(text), public.record_tracked_download(text),
  public.record_tracking_click(text,text,text,text), public.record_tracking_metric(text,text,integer),
  public.tracked_proposal_has_paid_access(text) to anon, authenticated;

commit;
