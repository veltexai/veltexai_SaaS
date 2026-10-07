-- R3-4.1 follow-up: expose immutable package-set metadata to the authenticated
-- proposal history reader. The publisher already stores these columns.

drop function public.read_crm_proposal_versions(uuid,uuid);

create function public.read_crm_proposal_versions(p_organization uuid,p_opportunity uuid)
returns table(id uuid,proposal_id uuid,work_package_id uuid,estimate_run_id uuid,
  version_number integer,display_amount_minor bigint,currency text,pricing_basis text,
  content_sha256 text,rendered_sha256 text,schema_version text,package_count integer,
  package_set_sha256 text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select v.id,v.proposal_id,v.work_package_id,v.estimate_run_id,v.version_number,
    v.display_amount_minor,v.currency,v.pricing_basis,v.content_sha256,v.rendered_sha256,
    v.schema_version,v.package_count,v.package_set_sha256,v.created_at
  from public.crm_proposal_versions v join public.crm_opportunities o
    on o.organization_id=v.organization_id and o.id=v.opportunity_id
  where v.organization_id=p_organization and v.opportunity_id=p_opportunity
    and o.deleted_at is null and public.can_access_crm_opportunity(v.opportunity_id)
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator' and o.estimator_user_id=auth.uid()))
  order by v.version_number desc;
$$;

revoke all on function public.read_crm_proposal_versions(uuid,uuid)
  from public,anon,service_role;
grant execute on function public.read_crm_proposal_versions(uuid,uuid) to authenticated;
