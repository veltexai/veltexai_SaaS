begin;

create or replace function public.read_crm_customer_proposal_room_internal(
  p_session_hmac_sha256 text
) returns jsonb language plpgsql stable security definer
set search_path=pg_catalog,public as $$
declare session_row public.crm_customer_action_sessions%rowtype;
  token_row public.crm_customer_action_tokens%rowtype;
  version_row public.crm_proposal_versions%rowtype;
  receipt_row public.crm_proposal_acceptance_receipts%rowtype;
  org_name text; packages jsonb; latest_eligibility text; stage_category text;
  acceptance_enabled boolean:=false;
begin
  if p_session_hmac_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select s.* into session_row from public.crm_customer_action_sessions s
    where s.session_hmac_sha256=p_session_hmac_sha256 and s.expires_at>now();
  if session_row.id is null then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;
  select t.* into token_row from public.crm_customer_action_tokens t
    where t.organization_id=session_row.organization_id and t.id=session_row.token_id
      and t.proposal_version_id=session_row.proposal_version_id;
  select v.* into version_row from public.crm_proposal_versions v
    where v.organization_id=session_row.organization_id
      and v.id=session_row.proposal_version_id and v.schema_version='crm_proposal_version.v2';
  select r.* into receipt_row from public.crm_proposal_acceptance_receipts r
    where r.organization_id=session_row.organization_id and r.session_id=session_row.id
      and r.proposal_version_id=session_row.proposal_version_id;
  if token_row.id is null or version_row.id is null then
    raise exception 'proposal room unavailable' using errcode='42501';
  end if;

  -- An acceptance revokes every accept token. The still-live opaque session may
  -- read only its own immutable receipt so a refresh never resubmits acceptance.
  if receipt_row.id is null then
    if token_row.expires_at<=now()
       or token_row.designated_approver_email_hmac_sha256 is not null
       or exists(select 1 from public.crm_customer_action_token_revocations r
         where r.organization_id=token_row.organization_id and r.token_id=token_row.id) then
      raise exception 'proposal room unavailable' using errcode='42501';
    end if;
    select e.state into latest_eligibility
      from public.crm_proposal_action_eligibility_events e
      where e.organization_id=token_row.organization_id
        and e.proposal_version_id=token_row.proposal_version_id
      order by e.created_at desc,e.id desc limit 1;
    select ps.category into stage_category
      from public.crm_opportunities o join public.crm_pipeline_stages ps
        on ps.organization_id=o.organization_id and ps.id=o.stage_id
      where o.organization_id=token_row.organization_id
        and o.id=token_row.opportunity_id and o.deleted_at is null;
    acceptance_enabled:=token_row.purpose='accept_proposal'
      and latest_eligibility='enabled'
      and stage_category not in ('won','lost','disqualified','handed_off')
      and not exists(select 1 from public.crm_proposal_versions newer
        where newer.organization_id=version_row.organization_id
          and newer.proposal_id=version_row.proposal_id
          and newer.version_number>version_row.version_number);
  end if;

  select o.name into org_name from public.organizations o
    where o.id=session_row.organization_id;
  select coalesce(jsonb_agg(jsonb_build_object(
    'associationId',a.id,'displayPosition',a.display_position,
    'title',a.customer_visible_title,'scope',a.customer_visible_scope,
    'amountMinor',a.amount_minor,'currency',a.currency,
    'pricingBasis',a.pricing_basis,'associationSha256',a.association_sha256
  ) order by a.display_position),'[]'::jsonb) into packages
  from public.crm_proposal_version_packages a
  where a.organization_id=session_row.organization_id
    and a.proposal_version_id=session_row.proposal_version_id;
  return jsonb_build_object(
    'organization',jsonb_build_object('displayName',org_name),
    'proposalVersionId',version_row.id,'versionNumber',version_row.version_number,
    'renderedContent',version_row.rendered_content,
    'contentSha256',version_row.content_sha256,
    'renderedSha256',version_row.rendered_sha256,
    'packages',packages,'fullOfferedTotalMinor',version_row.display_amount_minor,
    'selectedSubtotalMinor',coalesce(receipt_row.selected_subtotal_minor,version_row.display_amount_minor),
    'currency',version_row.currency,'expiresAt',least(session_row.expires_at,token_row.expires_at),
    'allowedActions',case when receipt_row.id is not null then '[]'::jsonb
      when token_row.purpose='review_proposal' then '[]'::jsonb
      else '["question","change_requested","declined"]'::jsonb end,
    'consent',jsonb_build_object('version','veltex-c0-acceptance-v1',
      'text','I have reviewed this proposal version and the selected service packages. By selecting Accept proposal, I confirm my acceptance of those selected packages. I understand that Veltex records the name and email I enter, the proposal version, selected packages, and acceptance time. This is not an electronic-signature process.'),
    'acceptanceEnabled',acceptance_enabled,
    'receipt',case when receipt_row.id is null then null else jsonb_build_object(
      'receiptId',receipt_row.id,'proposalVersionId',receipt_row.proposal_version_id,
      'acceptedAt',receipt_row.accepted_at,
      'selectedAssociationIds',to_jsonb(receipt_row.selected_association_ids),
      'selectedSubtotalMinor',receipt_row.selected_subtotal_minor,
      'fullOfferedTotalMinor',receipt_row.full_offered_total_minor,
      'currency',receipt_row.currency,'consentVersion',receipt_row.consent_version,
      'receiptSha256',receipt_row.receipt_sha256) end
  );
end;
$$;
revoke all on function public.read_crm_customer_proposal_room_internal(text)
  from public,anon,authenticated;
grant execute on function public.read_crm_customer_proposal_room_internal(text)
  to service_role;

create or replace function public.read_crm_acceptance_summaries(
  target_organization uuid
) returns jsonb language sql stable security definer
set search_path=pg_catalog,public as $$
  with caller as (
    select public.organization_role(target_organization) as role
  ), visible as (
    select r.*,cardinality(r.selected_association_ids) as selected_count
    from public.crm_proposal_acceptance_receipts r
    join public.crm_opportunities o
      on o.organization_id=r.organization_id and o.id=r.opportunity_id
    cross join caller c
    where r.organization_id=target_organization and o.deleted_at is null
      and (c.role in ('owner','admin','viewer') or (c.role='estimator' and
        (o.created_by=auth.uid() or o.owner_user_id=auth.uid()
          or o.estimator_user_id=auth.uid())))
  )
  select case when (select role from caller) is null then null
    else coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'receipt_id',v.id,'opportunity_id',v.opportunity_id,
      'proposal_version_id',v.proposal_version_id,'accepted_at',v.accepted_at,
      'selected_count',v.selected_count,
      'selected_subtotal_minor',case when c.role<>'viewer' then v.selected_subtotal_minor end,
      'full_offered_total_minor',case when c.role<>'viewer' then v.full_offered_total_minor end,
      'currency',case when c.role<>'viewer' then v.currency end,
      'receipt_sha256',v.receipt_sha256
    )) order by v.accepted_at desc,v.id) filter(where v.id is not null),'[]'::jsonb) end
  from caller c left join visible v on true;
$$;
revoke all on function public.read_crm_acceptance_summaries(uuid)
  from public,anon;
grant execute on function public.read_crm_acceptance_summaries(uuid)
  to authenticated,service_role;

commit;
