begin;

-- Prefer fresh, domain-qualified companies and age previously attempted targets to the back.
-- This prevents missing-domain provider errors and stops the oldest low-yield prospects from
-- monopolizing every bounded run. The diagnostics lookup contains only prospect UUIDs/timestamps.
create or replace function public.load_100g_enrichment_target_ids(requested_limit integer)
returns uuid[] language sql security definer set search_path = pg_catalog, public as $$
  select coalesce(array_agg(id order by has_any_contact asc, last_attempt_at asc nulls first, last_updated_at asc, id asc), array[]::uuid[])
  from (
    select
      p.id,
      p.last_updated_at,
      exists (select 1 from public.prospect_contacts any_contact where any_contact.prospect_id = p.id) as has_any_contact,
      attempts.last_attempt_at
    from public.internal_prospects p
    left join lateral (
      select max(d.created_at) as last_attempt_at
      from public.enrichment_diagnostics d
      where d.event in ('company.enriched', 'company.provider_error')
        and d.data ->> 'prospectId' = p.id::text
    ) attempts on true
    where p.prospect_status = 'discovered'
      and p.website_domain is not null
      and btrim(p.website_domain) <> ''
      and not exists (
        select 1 from public.prospect_contacts c
        where c.prospect_id = p.id
          and c.is_current_contact
          and c.email_verification_status = 'verified'
          and c.outreach_eligibility = 'ready_for_outreach'
      )
    order by has_any_contact asc, last_attempt_at asc nulls first, p.last_updated_at asc, p.id asc
    limit greatest(0, least(coalesce(requested_limit, 0), 500))
  ) targets;
$$;

revoke all on function public.load_100g_enrichment_target_ids(integer) from public, anon, authenticated;
grant execute on function public.load_100g_enrichment_target_ids(integer) to veltex_100g_orchestrator_v2;

commit;
