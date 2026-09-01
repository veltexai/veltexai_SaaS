begin;

-- Keep fresh companies ahead of recently exhausted ones without permanently excluding any
-- discovered prospect. A zero-candidate company becomes eligible again after a seven-day aging
-- window, and the final recent-zero bucket remains as a supply-safe fallback when no fresher
-- domain-qualified targets exist.
create or replace function public.load_100g_enrichment_target_ids(requested_limit integer)
returns uuid[] language sql security definer set search_path = pg_catalog, public as $$
  select coalesce(array_agg(id order by retry_bucket, zero_candidate_attempts, last_attempt_at asc nulls first, last_updated_at asc, id asc), array[]::uuid[])
  from (
    select
      p.id,
      p.last_updated_at,
      attempts.last_attempt_at,
      coalesce(attempts.zero_candidate_attempts, 0) as zero_candidate_attempts,
      case
        when attempts.last_attempt_at is null then 0
        when coalesce(attempts.last_candidate_count, 0) > 0 then 1
        when attempts.last_attempt_at < now() - interval '7 days' then 2
        else 3
      end as retry_bucket
    from public.internal_prospects p
    left join lateral (
      select
        max(d.created_at) as last_attempt_at,
        count(*) filter (
          where d.event = 'company.enriched'
            and coalesce(case when d.data ->> 'candidates' ~ '^[0-9]+$' then (d.data ->> 'candidates')::integer end, 0) = 0
        ) as zero_candidate_attempts,
        (array_agg(
          case when d.data ->> 'candidates' ~ '^[0-9]+$' then (d.data ->> 'candidates')::integer end
          order by d.created_at desc
        ) filter (where d.event = 'company.enriched'))[1] as last_candidate_count
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
    order by retry_bucket, zero_candidate_attempts, attempts.last_attempt_at asc nulls first, p.last_updated_at asc, p.id asc
    limit greatest(0, least(coalesce(requested_limit, 0), 500))
  ) targets;
$$;

revoke all on function public.load_100g_enrichment_target_ids(integer) from public, anon, authenticated;
grant execute on function public.load_100g_enrichment_target_ids(integer) to veltex_100g_orchestrator_v2;

commit;
