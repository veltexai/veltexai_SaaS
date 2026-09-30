-- Customer-safe projection used only by the canonical tracked PDF renderer.
-- It deliberately excludes raw estimate costs, margins, access notes and
-- service-profile inputs while preserving the presentation the customer saw.
begin;

-- Paid delivery belongs to the organization, not whichever estimator created
-- the proposal. Keep the pre-existing access semantics but resolve them from
-- the organization owner.
create or replace function public.tracked_proposal_has_paid_access(token text)
returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    case
      when owner_pr.subscription_status = 'free_trial' then false
      when latest.status is not null then latest.status = 'active'
      else owner_pr.subscription_status = 'active'
    end,
    false
  )
  from public.proposal_tracking t
  join public.proposals p on p.id = t.proposal_id
  join public.organizations o on o.id = p.organization_id
  left join public.profiles owner_pr on owner_pr.id = o.created_by
  left join lateral (
    select s.status
    from public.subscriptions s
    where s.user_id = o.created_by and s.status in ('active', 'trialing')
    order by s.created_at desc
    limit 1
  ) latest on true
  where t.tracking_id = token and length(token) >= 20;
$$;

revoke all on function public.tracked_proposal_has_paid_access(text) from public;
grant execute on function public.tracked_proposal_has_paid_access(text) to anon, authenticated;

create or replace function public.read_tracked_proposal_print(token text)
returns jsonb
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'proposal', jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'client_name', p.client_name,
      'client_company', p.client_company,
      'service_location', p.service_location,
      'service_type', p.service_type,
      'service_frequency', p.service_frequency,
      'facility_size', p.facility_size,
      'regional_location', p.regional_location,
      'property_type', p.property_type,
      'facility_details', jsonb_build_object(
        'building_type', p.facility_details->'building_type'
      ),
      'service_specific_data', jsonb_build_object(
        'scope_template_id', p.service_specific_data->'scope_template_id',
        'property_type', p.service_specific_data->'property_type'
      ),
      'global_inputs', jsonb_build_object(
        'proposal_date', p.global_inputs->'proposal_date'
      ),
      'generated_content', case
        when p.service_specific_data ? 'catalogJob'
          then regexp_replace(p.generated_content, E'(^|\n)Access:[^\n]*', '', 'g')
        else p.generated_content
      end,
      'pricing_enabled', p.pricing_enabled,
      'pricing_data', jsonb_build_object('price_range', p.pricing_data->'price_range'),
      'status', p.status,
      'created_at', p.created_at,
      'catalog_document', coalesce(p.service_specific_data ? 'catalogJob', false),
      'template', case when pt.id is null then null else jsonb_build_object('name', pt.name) end,
      'company_profiles', jsonb_build_object(
        'company_name', coalesce(c.company_name, o.name, 'Cleaning company'),
        'logo_url', c.logo_url,
        'phone', c.contact_info->>'phone',
        'website', c.contact_info->>'website',
        'email', c.contact_info->>'email',
        'colors', jsonb_build_object(
          'primary', coalesce(ubs.primary_color, '#1e3a8a'),
          'secondary', coalesce(ubs.secondary_color, '#0ea5e9'),
          'accent', coalesce(ubs.accent_color, '#1f2937')
        ),
        'show_powered_by', case
          when owner_pr.subscription_status = 'free_trial' then false
          when s.plan in ('professional', 'enterprise') then false
          else true
        end
      ),
      'additional_services', coalesce(extras.rows, '[]'::jsonb)
    ),
    'tracking', jsonb_build_object(
      'id', t.id,
      'tracking_id', t.tracking_id,
      'proposal_id', t.proposal_id,
      'delivery_method', t.delivery_method,
      'track_opens', t.track_opens,
      'track_downloads', t.track_downloads
    )
  )
  from public.proposal_tracking t
  join public.proposals p on p.id = t.proposal_id
  join public.organizations o on o.id = p.organization_id
  left join public.profiles owner_pr on owner_pr.id = o.created_by
  left join public.company_profiles c on c.organization_id = p.organization_id
  left join public.proposal_templates pt on pt.id = p.template_id
  left join public.user_branding_settings ubs on ubs.user_id = o.created_by
  left join lateral (
    select s.plan
    from public.subscriptions s
    where s.user_id = o.created_by and s.status in ('active', 'trialing')
    order by s.created_at desc
    limit 1
  ) s on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'service', pas.label,
      'frequency', pas.frequency,
      'subtotal', pas.subtotal,
      'monthly_amount', pas.monthly_amount
    ) order by pas.created_at, pas.id) as rows
    from public.proposal_additional_services pas
    where pas.proposal_id = p.id
  ) extras on true
  where t.tracking_id = token and length(token) >= 20
  limit 1;
$$;

revoke all on function public.read_tracked_proposal_print(text) from public;
grant execute on function public.read_tracked_proposal_print(text) to anon, authenticated;

commit;
