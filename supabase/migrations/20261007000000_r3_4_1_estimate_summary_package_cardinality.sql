begin;

-- R3-4.1 publishes an ordered package set. The board therefore needs the
-- newest estimate for every package, while retaining the newest unbound
-- opportunity estimate used by the legacy single-package workflow.
create or replace function public.read_crm_estimate_summaries(p_organization uuid)
returns table(estimate_run_id uuid,opportunity_id uuid,work_package_id uuid,engine_version text,
  selected_amount_minor bigint,currency text,pricing_basis text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select distinct on(e.opportunity_id,e.work_package_id)
    e.id,e.opportunity_id,e.work_package_id,e.engine_version,
    e.selected_amount_minor,e.currency,e.pricing_basis,e.created_at
  from public.crm_estimate_runs e join public.crm_opportunities o
    on o.organization_id=e.organization_id and o.id=e.opportunity_id
  where e.organization_id=p_organization and public.can_access_crm_opportunity(e.opportunity_id)
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator' and o.estimator_user_id=auth.uid()))
  order by e.opportunity_id,e.work_package_id,e.created_at desc,e.id desc;
$$;
revoke all on function public.read_crm_estimate_summaries(uuid) from public,anon,service_role;
grant execute on function public.read_crm_estimate_summaries(uuid) to authenticated;

commit;
