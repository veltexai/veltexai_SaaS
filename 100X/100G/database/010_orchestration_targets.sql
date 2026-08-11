begin;

create or replace function public.load_100g_enrichment_target_ids(requested_limit integer)
returns uuid[] language sql security definer set search_path = pg_catalog, public as $$
  select coalesce(array_agg(id order by last_updated_at asc, id asc), array[]::uuid[])
  from (
    select p.id, p.last_updated_at
    from public.internal_prospects p
    where p.prospect_status = 'discovered'
      and not exists (
        select 1 from public.prospect_contacts c
        where c.prospect_id = p.id
          and c.is_current_contact
          and c.email_verification_status = 'verified'
          and c.outreach_eligibility = 'ready_for_outreach'
      )
    order by p.last_updated_at asc, p.id asc
    limit greatest(0, least(coalesce(requested_limit, 0), 500))
  ) targets;
$$;

revoke all on function public.load_100g_enrichment_target_ids(integer) from public, anon, authenticated;
grant execute on function public.load_100g_enrichment_target_ids(integer) to veltex_100g_orchestrator_v2;

commit;
