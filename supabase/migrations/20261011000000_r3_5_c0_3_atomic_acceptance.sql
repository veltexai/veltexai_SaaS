begin;

-- R3-5 C0.3: immutable proposal-acceptance receipts and one atomic private
-- acceptance command. Public acceptance UI remains disabled until C0.4.

create table public.crm_proposal_acceptance_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  opportunity_id uuid not null,
  token_id uuid not null,
  session_id uuid not null,
  request_key text not null check(length(request_key) between 8 and 200),
  request_sha256 text not null check(request_sha256 ~ '^[a-f0-9]{64}$'),
  signer_entered_name text not null check(length(trim(signer_entered_name)) between 1 and 160),
  signer_entered_email_normalized text not null
    check(length(signer_entered_email_normalized) between 3 and 320
      and signer_entered_email_normalized=lower(trim(signer_entered_email_normalized))),
  consent_version text not null check(consent_version='veltex-c0-acceptance-v1'),
  consent_text text not null,
  selected_association_ids uuid[] not null check(cardinality(selected_association_ids)>0),
  selected_association_sha256s text[] not null,
  selected_work_package_ids uuid[] not null,
  full_offered_total_minor bigint not null check(full_offered_total_minor>=0),
  selected_subtotal_minor bigint not null check(selected_subtotal_minor>=0),
  currency text not null check(currency='USD'),
  package_set_sha256 text not null check(package_set_sha256 ~ '^[a-f0-9]{64}$'),
  content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
  rendered_sha256 text not null check(rendered_sha256 ~ '^[a-f0-9]{64}$'),
  accepted_at timestamptz not null,
  receipt_sha256 text not null unique check(receipt_sha256 ~ '^[a-f0-9]{64}$'),
  unique(organization_id,id),
  unique(organization_id,proposal_version_id),
  unique(session_id,request_key),
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete restrict,
  foreign key(organization_id,opportunity_id)
    references public.crm_opportunities(organization_id,id) on delete restrict,
  foreign key(organization_id,token_id)
    references public.crm_customer_action_tokens(organization_id,id) on delete restrict,
  foreign key(organization_id,session_id)
    references public.crm_customer_action_sessions(organization_id,id) on delete restrict,
  check(cardinality(selected_association_ids)=cardinality(selected_association_sha256s)
    and cardinality(selected_association_ids)=cardinality(selected_work_package_ids))
);
create index crm_proposal_acceptance_receipts_opportunity_idx
  on public.crm_proposal_acceptance_receipts(organization_id,opportunity_id,accepted_at,id);

alter table public.crm_proposal_acceptance_receipts enable row level security;
revoke all on public.crm_proposal_acceptance_receipts
  from public,anon,authenticated,service_role;
create trigger guard_crm_proposal_acceptance_receipts_append_only
  before update or delete on public.crm_proposal_acceptance_receipts
  for each row execute function public.guard_crm_customer_action_append_only();
create trigger guard_crm_proposal_acceptance_receipts_truncate
  before truncate on public.crm_proposal_acceptance_receipts
  for each statement execute function public.guard_crm_customer_action_append_only();

-- Replace only the work-package instance of the shared R3-1 scope guard. All
-- ordinary caller-bound behavior remains; accepted is available solely while
-- the current transaction is bound to a receipt selecting this exact package.
drop trigger guard_crm_site_work_package_scope on public.crm_site_work_packages;
create function public.guard_crm_site_work_package_acceptance_scope()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare receipt_id uuid; caller_role text;
begin
  if new.status='accepted' then
    begin receipt_id:=nullif(current_setting('veltex.acceptance_receipt_id',true),'')::uuid; exception when others then receipt_id:=null; end;
    if receipt_id is null or not exists(
      select 1 from public.crm_proposal_acceptance_receipts r
      where r.id=receipt_id and r.organization_id=new.organization_id
        and r.opportunity_id=new.opportunity_id
        and r.proposal_version_id=new.proposal_version_id
        and new.id=any(r.selected_work_package_ids)
    ) then raise exception 'customer acceptance requires a receipt-bound package transition' using errcode='23514'; end if;
    return new;
  end if;
  if auth.uid() is null then return new; end if;
  caller_role:=public.organization_role(new.organization_id);
  if caller_role in ('owner','admin') then return new; end if;
  if caller_role is distinct from 'estimator' then raise exception 'CRM record unavailable' using errcode='42501'; end if;
  if not public.can_access_crm_opportunity(new.opportunity_id)
     or not public.can_access_crm_property(new.organization_id,new.property_id) then
    raise exception 'site work package relationship unavailable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_crm_site_work_package_acceptance_scope()
  from public,anon,authenticated,service_role;
create trigger guard_crm_site_work_package_scope before insert or update of
  opportunity_id,property_id,status on public.crm_site_work_packages
  for each row execute function public.guard_crm_site_work_package_acceptance_scope();

create or replace function public.guard_crm_estimate_selection()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare receipt_id uuid; receipt_bound boolean:=false;
begin
  if tg_op='UPDATE' and new.status='accepted' then
    begin receipt_id:=nullif(current_setting('veltex.acceptance_receipt_id',true),'')::uuid; exception when others then receipt_id:=null; end;
    receipt_bound:=receipt_id is not null and exists(
      select 1 from public.crm_proposal_acceptance_receipts r
      where r.id=receipt_id and r.organization_id=new.organization_id
        and r.proposal_version_id=new.proposal_version_id
        and new.id=any(r.selected_work_package_ids));
  end if;
  if tg_op='UPDATE' and (
    (old.status='estimated' and new.status not in ('estimated','proposed','declined') and not receipt_bound)
    or (old.status='proposed' and new.status not in ('proposed','accepted','declined'))
    or (old.status in ('accepted','declined') and new.status<>old.status)
  ) then raise exception 'package lifecycle cannot be regressed' using errcode='23514'; end if;
  if tg_op='UPDATE' and (old.status<>'scoping' or new.status<>'scoping') and (
    (old.walkthrough_id is not null and new.walkthrough_id is distinct from old.walkthrough_id)
    or (old.proposal_id is not null and new.proposal_id is distinct from old.proposal_id)
  ) then raise exception 'package evidence pointer cannot be changed' using errcode='23514'; end if;
  if new.status='estimated' and (new.estimate_run_id is null
    or (tg_op='UPDATE' and old.status<>'estimated' and old.estimate_run_id is not distinct from new.estimate_run_id)) then
    raise exception 'estimated package requires a newly selected estimate' using errcode='23514';
  end if;
  return new;
end;
$$;

-- Preserve the accepted manual-win contract. The only additional won path is
-- a receipt-bound customer acceptance in the same transaction.
create or replace function public.validate_crm_opportunity_stage()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
declare target_category text; source_category text; pipeline_template text;
  reason_applies text; receipt_id uuid;
begin
  select s.category,p.template_key into target_category,pipeline_template
  from public.crm_pipeline_stages s join public.crm_pipelines p
    on p.organization_id=s.organization_id and p.id=s.pipeline_id
  where s.organization_id=new.organization_id and s.id=new.stage_id and p.id=new.pipeline_id;
  if target_category is null then raise exception 'stage must belong to the selected pipeline and organization' using errcode='23514'; end if;
  if tg_op='INSERT' then
    if new.reactivated_from_id is null and target_category<>'new' then raise exception 'new opportunities must begin in the new category' using errcode='23514'; end if;
    if new.reactivated_from_id is not null and target_category<>'qualifying' then raise exception 'reactivated opportunities must begin in qualifying' using errcode='23514'; end if;
  else
    select s.category into source_category from public.crm_pipeline_stages s
      where s.organization_id=old.organization_id and s.id=old.stage_id;
    if new.pipeline_id is distinct from old.pipeline_id then raise exception 'opportunity pipeline changes require a reviewed migration workflow' using errcode='23514'; end if;
    if new.stage_id is not distinct from old.stage_id then raise exception 'same-stage transitions are not commands' using errcode='23514'; end if;
    if source_category in ('won','lost','disqualified','handed_off') then raise exception 'terminal opportunities require the reactivation workflow' using errcode='23514'; end if;
    if not (source_category=target_category
      or (target_category='won' and new.acceptance_method='customer_acceptance')
      or (source_category='new' and target_category in ('qualifying','lost','disqualified','nurture'))
      or (source_category='qualifying' and target_category in ('walkthrough','estimating','lost','disqualified','nurture'))
      or (source_category='walkthrough' and target_category in ('estimating','lost','disqualified','nurture'))
      or (source_category='estimating' and target_category in ('proposing','lost','disqualified','nurture'))
      or (source_category='proposing' and target_category in ('negotiating','won','lost','disqualified','nurture'))
      or (source_category='negotiating' and target_category in ('proposing','won','lost','disqualified','nurture'))
      or (source_category='nurture' and target_category in ('qualifying','lost','disqualified'))) then
      raise exception 'invalid opportunity stage transition' using errcode='23514';
    end if;
  end if;
  if target_category='walkthrough' and not exists(select 1 from public.crm_walkthroughs w where w.organization_id=new.organization_id and w.opportunity_id=new.id and w.status in ('scheduled','rescheduled')) then raise exception 'schedule a walkthrough before moving to this stage' using errcode='23514'; end if;
  if target_category='estimating' and new.property_id is null then raise exception 'link a property before estimating' using errcode='23514'; end if;
  if target_category='estimating' and pipeline_template<>'residential_turnover_v1' and not exists(select 1 from public.crm_walkthroughs w where w.organization_id=new.organization_id and w.opportunity_id=new.id and w.status in ('scheduled','rescheduled')) then raise exception 'schedule a walkthrough before estimating' using errcode='23514'; end if;
  if target_category in ('proposing','negotiating') and not exists(select 1 from public.proposals p where p.organization_id=new.organization_id and p.crm_opportunity_id=new.id and p.status::text in ('sent','accepted')) then raise exception 'link a sent proposal before moving to this stage' using errcode='23514'; end if;
  if target_category='won' and new.acceptance_method='customer_acceptance' then
    begin receipt_id:=nullif(current_setting('veltex.acceptance_receipt_id',true),'')::uuid; exception when others then receipt_id:=null; end;
    if receipt_id is null or not exists(select 1 from public.crm_proposal_acceptance_receipts r where r.id=receipt_id and r.organization_id=new.organization_id and r.opportunity_id=new.id) then
      raise exception 'customer acceptance requires a receipt-bound transition' using errcode='23514';
    end if;
  elsif target_category='won' and (new.acceptance_method is distinct from 'manual' or nullif(trim(coalesce(new.manual_win_reason,'')),'') is null) then
    raise exception 'R3-1 manual wins require a reason' using errcode='23514';
  end if;
  if target_category='won' and new.acceptance_method='manual' and not public.can_manage_organization(new.organization_id) then raise exception 'manual wins require owner or admin' using errcode='42501'; end if;
  if target_category='handed_off' then raise exception 'handoff is unavailable until the reviewed R3-6 workflow' using errcode='23514'; end if;
  if target_category in ('lost','disqualified') then
    select r.applies_to into reason_applies from public.crm_loss_reasons r where r.organization_id=new.organization_id and r.id=new.loss_reason_id and r.active;
    if reason_applies is null or not(reason_applies='both' or reason_applies=target_category) then raise exception '% requires an applicable active reason',target_category using errcode='23514'; end if;
  end if;
  if target_category='nurture' and (new.next_action_due_at is null or new.next_action_due_at<=now()) then raise exception 'nurture requires a future revisit date' using errcode='23514'; end if;
  return new;
end;
$$;

create or replace function public.record_crm_stage_history()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare old_category text; new_category text; receipt_id text;
begin
  if tg_op='UPDATE' and new.stage_id is not distinct from old.stage_id then return new; end if;
  if tg_op='UPDATE' then select category into old_category from public.crm_pipeline_stages where id=old.stage_id; end if;
  select category into new_category from public.crm_pipeline_stages where id=new.stage_id;
  receipt_id:=nullif(current_setting('veltex.acceptance_receipt_id',true),'');
  insert into public.crm_opportunity_stage_history(organization_id,opportunity_id,from_stage_id,to_stage_id,from_category,to_category,actor_user_id,reason_code)
  values(new.organization_id,new.id,case when tg_op='UPDATE' then old.stage_id else null end,new.stage_id,old_category,new_category,
    case when new.acceptance_method='customer_acceptance' then null else auth.uid() end,
    case when new_category='won' and new.acceptance_method='customer_acceptance' then 'customer_acceptance:'||receipt_id
      when new_category='won' then 'manual_win' when new_category in ('lost','disqualified') then new.loss_reason_id::text else null end);
  return new;
end;
$$;

create function public.command_crm_accept_proposal_version_internal(
  p_session_hmac_sha256 text,p_selected_association_ids uuid[],
  p_signer_entered_name text,p_signer_entered_email text,p_request_key text
) returns jsonb language plpgsql security definer
set search_path=pg_catalog,public as $$
declare s public.crm_customer_action_sessions%rowtype;
  t public.crm_customer_action_tokens%rowtype;
  v public.crm_proposal_versions%rowtype;
  o public.crm_opportunities%rowtype;
  existing public.crm_proposal_acceptance_receipts%rowtype;
  created public.crm_proposal_acceptance_receipts%rowtype;
  selected_ids uuid[]; selected_hashes text[]; selected_packages uuid[];
  selected_total bigint; full_total bigint; offered_count integer; selected_count integer;
  normalized_email text; request_hash text; canonical_hash text; accepted_time timestamptz:=clock_timestamp();
  won_stage uuid; latest_state text;
  consent_constant text:='I have reviewed this proposal version and the selected service packages. By selecting Accept proposal, I confirm my acceptance of those selected packages. I understand that Veltex records the name and email I enter, the proposal version, selected packages, and acceptance time. This is not an electronic-signature process.';
begin
  normalized_email:=lower(trim(coalesce(p_signer_entered_email,'')));
  if p_session_hmac_sha256 !~ '^[a-f0-9]{64}$'
     or length(trim(coalesce(p_signer_entered_name,''))) not between 1 and 160
     or length(normalized_email) not between 3 and 320
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or length(coalesce(p_request_key,'')) not between 8 and 200
     or coalesce(cardinality(p_selected_association_ids),0)<1
     or exists(select 1 from unnest(p_selected_association_ids) x where x is null)
     or exists(select 1 from unnest(p_selected_association_ids) x group by x having count(*)>1) then
    raise exception 'proposal acceptance unavailable' using errcode='42501';
  end if;
  select x.* into s from public.crm_customer_action_sessions x
    where x.session_hmac_sha256=p_session_hmac_sha256 for update;
  select x.* into t from public.crm_customer_action_tokens x
    where x.organization_id=s.organization_id and x.id=s.token_id for share;
  if s.id is null or t.id is null or t.purpose<>'accept_proposal'
     or t.proposal_version_id<>s.proposal_version_id then
    raise exception 'proposal acceptance unavailable' using errcode='42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('veltex-c0-accept:'||t.proposal_version_id::text,0));
  select r.* into existing from public.crm_proposal_acceptance_receipts r where r.session_id=s.id and r.request_key=p_request_key;
  perform a.id from public.crm_proposal_version_packages a
    where a.organization_id=t.organization_id and a.proposal_version_id=t.proposal_version_id
    order by a.display_position for share;
  select coalesce(array_agg(a.id order by a.display_position),'{}'::uuid[]),
    coalesce(array_agg(a.association_sha256 order by a.display_position),'{}'::text[]),
    coalesce(array_agg(a.work_package_id order by a.display_position),'{}'::uuid[]),
    coalesce(sum(a.amount_minor),0),count(*) into selected_ids,selected_hashes,selected_packages,selected_total,selected_count
  from public.crm_proposal_version_packages a
  where a.organization_id=t.organization_id and a.proposal_version_id=t.proposal_version_id
    and a.id=any(p_selected_association_ids);
  -- Validate the caller's complete identifier set before computing replay
  -- identity. Otherwise an exact retry plus an unknown/foreign identifier
  -- could collapse to the same filtered selection and be misclassified as an
  -- exact replay.
  if selected_count<>cardinality(p_selected_association_ids) then
    raise exception 'proposal acceptance unavailable' using errcode='42501';
  end if;
  request_hash:=public.crm_estimate_sha256(jsonb_build_object('session_id',s.id,'proposal_version_id',t.proposal_version_id,
    'selected_association_ids',to_jsonb(selected_ids),'signer_entered_name',trim(p_signer_entered_name),
    'signer_entered_email_normalized',normalized_email,'consent_version','veltex-c0-acceptance-v1','consent_text',consent_constant));
  if existing.id is not null then
    if existing.request_sha256<>request_hash then raise exception 'proposal acceptance conflict' using errcode='23505'; end if;
    return jsonb_build_object('receiptId',existing.id,'proposalVersionId',existing.proposal_version_id,'acceptedAt',existing.accepted_at,
      'selectedAssociationIds',to_jsonb(existing.selected_association_ids),'selectedSubtotalMinor',existing.selected_subtotal_minor,
      'fullOfferedTotalMinor',existing.full_offered_total_minor,'currency',existing.currency,'receiptSha256',existing.receipt_sha256,'replayed',true);
  end if;
  select e.state into latest_state from public.crm_proposal_action_eligibility_events e
    where e.organization_id=t.organization_id and e.proposal_version_id=t.proposal_version_id
    order by e.created_at desc,e.id desc limit 1;
  if s.expires_at<=now() or t.expires_at<=now()
     or t.designated_approver_email_hmac_sha256 is not null
     or latest_state is distinct from 'enabled'
     or exists(select 1 from public.crm_customer_action_token_revocations r where r.organization_id=t.organization_id and r.token_id=t.id) then
    raise exception 'proposal acceptance unavailable' using errcode='42501';
  end if;
  select x.* into v from public.crm_proposal_versions x where x.organization_id=t.organization_id and x.id=t.proposal_version_id and x.schema_version='crm_proposal_version.v2' for update;
  select x.* into o from public.crm_opportunities x where x.organization_id=t.organization_id and x.id=t.opportunity_id and x.deleted_at is null for update;
  perform p.id from public.crm_site_work_packages p
    where p.organization_id=t.organization_id and p.id=any(selected_packages)
    order by p.id for update;
  select count(*),coalesce(sum(a.amount_minor),0) into offered_count,full_total from public.crm_proposal_version_packages a where a.organization_id=t.organization_id and a.proposal_version_id=t.proposal_version_id;
  select ps.category into latest_state from public.crm_pipeline_stages ps
    where ps.organization_id=o.organization_id and ps.id=o.stage_id;
  if v.id is null or o.id is null or v.opportunity_id<>o.id or s.organization_id<>t.organization_id
     or latest_state in ('won','lost','disqualified','handed_off')
     or offered_count<>v.package_count or full_total<>v.display_amount_minor
     or exists(select 1 from public.crm_proposal_version_packages a join public.crm_site_work_packages p on p.organization_id=a.organization_id and p.id=a.work_package_id
       where a.organization_id=t.organization_id and a.proposal_version_id=t.proposal_version_id and a.id=any(selected_ids)
         and (p.opportunity_id<>v.opportunity_id or p.property_id<>v.property_id or p.proposal_version_id is distinct from v.id or p.status not in ('estimated','proposed')))
     or exists(select 1 from public.crm_proposal_acceptance_receipts r where r.organization_id=t.organization_id and r.proposal_version_id=v.id) then
    raise exception 'proposal acceptance unavailable' using errcode='42501';
  end if;
  select ps.id into won_stage from public.crm_pipeline_stages ps where ps.organization_id=o.organization_id and ps.pipeline_id=o.pipeline_id and ps.category='won' and not ps.hidden order by ps.position,ps.id limit 1 for share;
  if won_stage is null then raise exception 'proposal acceptance unavailable' using errcode='42501'; end if;
  canonical_hash:=public.crm_estimate_sha256(jsonb_build_object('organization_id',t.organization_id,'proposal_version_id',v.id,'opportunity_id',o.id,
    'token_id',t.id,'session_id',s.id,'request_sha256',request_hash,'signer_entered_name',trim(p_signer_entered_name),
    'signer_entered_email_normalized',normalized_email,'consent_version','veltex-c0-acceptance-v1','consent_text',consent_constant,
    'selected_association_ids',to_jsonb(selected_ids),'selected_association_sha256s',to_jsonb(selected_hashes),'selected_work_package_ids',to_jsonb(selected_packages),
    'full_offered_total_minor',full_total,'selected_subtotal_minor',selected_total,'currency',v.currency,'package_set_sha256',v.package_set_sha256,
    'content_sha256',v.content_sha256,'rendered_sha256',v.rendered_sha256,
    'accepted_at_utc',to_char(accepted_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')));
  insert into public.crm_proposal_acceptance_receipts(organization_id,proposal_version_id,opportunity_id,token_id,session_id,request_key,request_sha256,
    signer_entered_name,signer_entered_email_normalized,consent_version,consent_text,selected_association_ids,selected_association_sha256s,
    selected_work_package_ids,full_offered_total_minor,selected_subtotal_minor,currency,package_set_sha256,content_sha256,rendered_sha256,accepted_at,receipt_sha256)
  values(t.organization_id,v.id,o.id,t.id,s.id,p_request_key,request_hash,trim(p_signer_entered_name),normalized_email,'veltex-c0-acceptance-v1',consent_constant,
    selected_ids,selected_hashes,selected_packages,full_total,selected_total,v.currency,v.package_set_sha256,v.content_sha256,v.rendered_sha256,accepted_time,canonical_hash)
  returning * into created;
  perform set_config('veltex.acceptance_receipt_id',created.id::text,true);
  update public.crm_site_work_packages p set status='accepted',updated_by=t.issued_by,updated_at=accepted_time
    where p.organization_id=t.organization_id and p.id=any(selected_packages);
  update public.crm_opportunities set stage_id=won_stage,acceptance_method='customer_acceptance',manual_win_reason=null,updated_by=t.issued_by,updated_at=accepted_time
    where organization_id=t.organization_id and id=o.id;
  insert into public.crm_customer_action_token_revocations(organization_id,token_id,reason,revoked_by)
    select x.organization_id,x.id,'proposal version accepted',t.issued_by from public.crm_customer_action_tokens x
    where x.organization_id=t.organization_id and x.proposal_version_id=v.id and x.purpose='accept_proposal'
      and not exists(select 1 from public.crm_customer_action_token_revocations r where r.organization_id=x.organization_id and r.token_id=x.id);
  insert into public.organization_event_outbox(organization_id,event_type,aggregate_type,aggregate_id,payload)
  values(t.organization_id,'proposal.acceptance_received','crm_proposal_acceptance_receipts',created.id::text,
    jsonb_build_object('receipt_id',created.id,'proposal_version_id',v.id,'opportunity_id',o.id));
  return jsonb_build_object('receiptId',created.id,'proposalVersionId',v.id,'acceptedAt',created.accepted_at,
    'selectedAssociationIds',to_jsonb(created.selected_association_ids),'selectedSubtotalMinor',created.selected_subtotal_minor,
    'fullOfferedTotalMinor',created.full_offered_total_minor,'currency',created.currency,'receiptSha256',created.receipt_sha256,'replayed',false);
end;
$$;
revoke all on function public.command_crm_accept_proposal_version_internal(text,uuid[],text,text,text)
  from public,anon,authenticated;
grant execute on function public.command_crm_accept_proposal_version_internal(text,uuid[],text,text,text)
  to service_role;

commit;
