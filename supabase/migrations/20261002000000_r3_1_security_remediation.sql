-- R3-1 independent-review remediation: command-only writes, scope guards, and
-- terminal lifecycle invariants. This is forward-only because 20261001000000
-- has already been exercised on the isolated preview.
begin;

-- Authenticated CRM writes must pass through caller-bound SECURITY DEFINER
-- commands. RLS still governs reads; service_role retains its existing grants.
revoke insert, update, delete, truncate on
  public.crm_customers, public.crm_contacts, public.crm_customer_contacts,
  public.crm_properties, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_loss_reasons, public.crm_lead_sources, public.crm_referral_sources,
  public.crm_leads, public.crm_opportunities, public.crm_walkthroughs,
  public.crm_tasks, public.crm_site_work_packages,
  public.crm_opportunity_stage_commands, public.crm_task_commands,
  public.crm_assignment_commands, public.crm_lead_commands,
  public.crm_attribution_touches, public.crm_qualification_responses
from authenticated;

-- The foundation commands return the timestamp they explicitly write. The
-- shared legacy trigger overwrote that value with transaction_timestamp(), so
-- the returned optimistic-concurrency token could never be reused. Preserve
-- an explicitly changed token while still stamping ordinary CRM updates.
create function public.handle_crm_updated_at()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if new.updated_at is not distinct from old.updated_at then
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function public.handle_crm_updated_at() from public, anon, authenticated;

drop trigger crm_customers_updated_at on public.crm_customers;
drop trigger crm_contacts_updated_at on public.crm_contacts;
drop trigger crm_properties_updated_at on public.crm_properties;
drop trigger crm_opportunities_updated_at on public.crm_opportunities;
drop trigger crm_walkthroughs_updated_at on public.crm_walkthroughs;
create trigger crm_customers_updated_at before update on public.crm_customers
  for each row execute function public.handle_crm_updated_at();
create trigger crm_contacts_updated_at before update on public.crm_contacts
  for each row execute function public.handle_crm_updated_at();
create trigger crm_properties_updated_at before update on public.crm_properties
  for each row execute function public.handle_crm_updated_at();
create trigger crm_opportunities_updated_at before update on public.crm_opportunities
  for each row execute function public.handle_crm_updated_at();
create trigger crm_walkthroughs_updated_at before update on public.crm_walkthroughs
  for each row execute function public.handle_crm_updated_at();

-- Bind lead-conversion and reactivation retries to the complete semantic
-- request. The canonical JSON arrays remain internal and are never projected.
alter table public.crm_opportunities
  add column conversion_request_payload jsonb
    check (conversion_request_payload is null or jsonb_typeof(conversion_request_payload)='array'),
  add column reactivation_request_payload jsonb
    check (reactivation_request_payload is null or jsonb_typeof(reactivation_request_payload)='array');
alter table public.crm_opportunity_stage_commands
  add column requested_next_action_due_at timestamptz;

alter function public.convert_crm_lead(uuid,uuid,text,uuid,text,text,uuid,uuid,uuid)
  rename to _r3_1_convert_crm_lead_impl;
revoke all on function public._r3_1_convert_crm_lead_impl(
  uuid,uuid,text,uuid,text,text,uuid,uuid,uuid
) from public,anon,authenticated,service_role;

create function public.convert_crm_lead(
  p_organization uuid, p_lead uuid, p_request_key text, p_pipeline uuid,
  p_opportunity_name text, p_segment text, p_existing_customer uuid default null,
  p_existing_contact uuid default null, p_existing_property uuid default null
)
returns table(lead_id uuid,customer_id uuid,contact_id uuid,property_id uuid,
  opportunity_id uuid,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  request_payload jsonb;
  existing_payload jsonb;
  result_row record;
begin
  if auth.uid() is null or not exists (
    select 1 from public.crm_leads l where l.organization_id=p_organization
      and l.id=p_lead and l.deleted_at is null and (
        public.can_manage_organization(p_organization)
        or (public.organization_role(p_organization)='estimator'
          and (l.created_by=auth.uid() or l.assigned_to_user_id=auth.uid()))
      )
  ) then
    raise exception 'lead conversion unavailable' using errcode='42501';
  end if;
  request_payload := jsonb_build_array(
    p_lead,p_pipeline,trim(p_opportunity_name),p_segment,p_existing_customer,
    p_existing_contact,p_existing_property
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization::text||':convert:'||p_request_key,0));
  select o.conversion_request_payload into existing_payload
    from public.crm_opportunities o
    where o.organization_id=p_organization and o.idempotency_key=p_request_key;
  if found and existing_payload is distinct from request_payload then
    raise exception 'lead conversion command key already used' using errcode='23514';
  end if;
  select * into result_row from public._r3_1_convert_crm_lead_impl(
    p_organization,p_lead,p_request_key,p_pipeline,p_opportunity_name,p_segment,
    p_existing_customer,p_existing_contact,p_existing_property);
  if not result_row.replayed then
    update public.crm_opportunities set conversion_request_payload=request_payload
      where organization_id=p_organization and id=result_row.opportunity_id;
  end if;
  return query select result_row.lead_id,result_row.customer_id,result_row.contact_id,
    result_row.property_id,result_row.opportunity_id,result_row.replayed;
end;
$$;
revoke all on function public.convert_crm_lead(
  uuid,uuid,text,uuid,text,text,uuid,uuid,uuid
) from public,anon;
grant execute on function public.convert_crm_lead(
  uuid,uuid,text,uuid,text,text,uuid,uuid,uuid
) to authenticated,service_role;

alter function public.reactivate_crm_opportunity(uuid,uuid,text,text)
  rename to _r3_1_reactivate_crm_opportunity_impl;
revoke all on function public._r3_1_reactivate_crm_opportunity_impl(uuid,uuid,text,text)
  from public,anon,authenticated,service_role;

create function public.reactivate_crm_opportunity(
  p_organization uuid,p_opportunity uuid,p_request_key text,p_name text default null
)
returns table(opportunity_id uuid,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare request_payload jsonb; existing_payload jsonb; result_row record;
begin
  if auth.uid() is null or not public.can_access_crm_opportunity(p_opportunity) then
    raise exception 'opportunity reactivation unavailable' using errcode='42501';
  end if;
  request_payload := jsonb_build_array(
    p_opportunity,nullif(trim(p_name),'')
  );
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization::text||':reactivate:'||p_request_key,0));
  select o.reactivation_request_payload into existing_payload
    from public.crm_opportunities o
    where o.organization_id=p_organization and o.idempotency_key=p_request_key;
  if found and existing_payload is distinct from request_payload then
    raise exception 'reactivation command key already used' using errcode='23514';
  end if;
  select * into result_row from public._r3_1_reactivate_crm_opportunity_impl(
    p_organization,p_opportunity,p_request_key,p_name);
  if not result_row.replayed then
    update public.crm_opportunities set reactivation_request_payload=request_payload
      where organization_id=p_organization and id=result_row.opportunity_id;
  end if;
  return query select result_row.opportunity_id,result_row.replayed;
end;
$$;
revoke all on function public.reactivate_crm_opportunity(uuid,uuid,text,text)
  from public,anon;
grant execute on function public.reactivate_crm_opportunity(uuid,uuid,text,text)
  to authenticated,service_role;

-- These helpers deliberately expose only booleans. Managers may use every
-- record in the organization; estimators may use only records they created or
-- records already attached to an opportunity in their caller-bound scope.
create or replace function public.can_access_crm_customer(
  target_organization uuid,
  target_customer uuid
)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_customers c
    where c.organization_id = target_organization
      and c.id = target_customer
      and c.deleted_at is null
      and (
        public.can_manage_organization(target_organization)
        or (
          public.organization_role(target_organization) = 'estimator'
          and (
            c.created_by = auth.uid()
            or exists (
              select 1 from public.crm_opportunities o
              where o.organization_id = c.organization_id
                and o.customer_id = c.id
                and o.deleted_at is null
                and (o.created_by = auth.uid() or o.owner_user_id = auth.uid()
                  or o.estimator_user_id = auth.uid())
            )
          )
        )
      )
  );
$$;
revoke all on function public.can_access_crm_customer(uuid, uuid) from public, anon;
grant execute on function public.can_access_crm_customer(uuid, uuid) to authenticated, service_role;

create or replace function public.can_access_crm_property(
  target_organization uuid,
  target_property uuid
)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_properties p
    where p.organization_id = target_organization
      and p.id = target_property
      and p.deleted_at is null
      and (
        public.can_manage_organization(target_organization)
        or (
          public.organization_role(target_organization) = 'estimator'
          and (
            p.created_by = auth.uid()
            or exists (
              select 1 from public.crm_opportunities o
              where o.organization_id = p.organization_id
                and o.property_id = p.id
                and o.deleted_at is null
                and (o.created_by = auth.uid() or o.owner_user_id = auth.uid()
                  or o.estimator_user_id = auth.uid())
            )
          )
        )
      )
  );
$$;
revoke all on function public.can_access_crm_property(uuid, uuid) from public, anon;
grant execute on function public.can_access_crm_property(uuid, uuid) to authenticated, service_role;

create or replace function public.can_access_crm_contact(
  target_organization uuid,
  target_contact uuid
)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_contacts c
    where c.organization_id = target_organization
      and c.id = target_contact
      and c.deleted_at is null
      and (
        public.can_manage_organization(target_organization)
        or (
          public.organization_role(target_organization) = 'estimator'
          and (
            c.created_by = auth.uid()
            or exists (
              select 1 from public.crm_customer_contacts cc
              where cc.organization_id = c.organization_id and cc.contact_id = c.id
                and public.can_access_crm_customer(cc.organization_id, cc.customer_id)
            )
          )
        )
      )
  );
$$;
revoke all on function public.can_access_crm_contact(uuid, uuid) from public, anon;
grant execute on function public.can_access_crm_contact(uuid, uuid) to authenticated, service_role;

create or replace function public.guard_crm_record_scope()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare caller_role text;
begin
  if auth.uid() is null then return new; end if;
  caller_role := public.organization_role(new.organization_id);
  if caller_role in ('owner', 'admin') then return new; end if;
  if caller_role is distinct from 'estimator' then
    raise exception 'CRM record unavailable' using errcode = '42501';
  end if;

  if tg_table_name = 'crm_customers' then
    if tg_op = 'INSERT' and new.created_by is distinct from auth.uid() then
      raise exception 'customer record unavailable' using errcode = '42501';
    elsif tg_op = 'UPDATE' and not public.can_access_crm_customer(old.organization_id, old.id) then
      raise exception 'customer record unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_contacts' then
    if tg_op = 'INSERT' and new.created_by is distinct from auth.uid() then
      raise exception 'contact record unavailable' using errcode = '42501';
    elsif tg_op = 'UPDATE' and not public.can_access_crm_contact(old.organization_id, old.id) then
      raise exception 'contact record unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_properties' then
    if tg_op = 'INSERT' and new.created_by is distinct from auth.uid() then
      raise exception 'property record unavailable' using errcode = '42501';
    elsif tg_op = 'UPDATE' and not public.can_access_crm_property(old.organization_id, old.id) then
      raise exception 'property record unavailable' using errcode = '42501';
    end if;
    if new.customer_id is not null
       and not public.can_access_crm_customer(new.organization_id, new.customer_id) then
      raise exception 'property customer unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_customer_contacts' then
    if not public.can_access_crm_customer(new.organization_id, new.customer_id)
       or not public.can_access_crm_contact(new.organization_id, new.contact_id) then
      raise exception 'customer contact unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_opportunities' then
    if not public.can_access_crm_customer(new.organization_id, new.customer_id)
       or (new.property_id is not null
         and not public.can_access_crm_property(new.organization_id, new.property_id)) then
      raise exception 'opportunity relationship unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_walkthroughs' then
    if not public.can_access_crm_opportunity(new.opportunity_id)
       or not public.can_access_crm_property(new.organization_id, new.property_id)
       or (new.site_contact_id is not null
         and not public.can_access_crm_contact(new.organization_id, new.site_contact_id)) then
      raise exception 'walkthrough relationship unavailable' using errcode = '42501';
    end if;
  elsif tg_table_name = 'crm_site_work_packages' then
    if new.status = 'accepted' then
      raise exception 'customer acceptance is unavailable in R3-1' using errcode = '23514';
    end if;
    if not public.can_access_crm_opportunity(new.opportunity_id)
       or not public.can_access_crm_property(new.organization_id, new.property_id) then
      raise exception 'site work package relationship unavailable' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_crm_record_scope() from public, anon, authenticated;

create trigger guard_crm_customer_scope before insert or update on public.crm_customers
  for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_contact_scope before insert or update on public.crm_contacts
  for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_property_scope before insert or update on public.crm_properties
  for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_customer_contact_scope before insert or update on public.crm_customer_contacts
  for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_opportunity_scope before insert or update of customer_id, property_id
  on public.crm_opportunities for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_walkthrough_scope before insert or update of
  opportunity_id, property_id, site_contact_id on public.crm_walkthroughs
  for each row execute function public.guard_crm_record_scope();
create trigger guard_crm_site_work_package_scope before insert or update of
  opportunity_id, property_id, status on public.crm_site_work_packages
  for each row execute function public.guard_crm_record_scope();

-- Do not reveal organization-wide record IDs to estimators through duplicate
-- detection. The returned candidates use the same record scope as mutations.
create or replace function public.find_crm_duplicate_candidates(
  target_organization uuid,
  candidate_email text default null,
  candidate_phone text default null
)
returns table(entity_type text, entity_id uuid, matched_on text)
language sql stable security definer
set search_path = pg_catalog, public as $$
  select candidate.entity_type, candidate.entity_id, candidate.matched_on
  from (
    select 'contact'::text as entity_type, c.id as entity_id,
      case when candidate_email is not null and lower(c.email) = lower(candidate_email)
        then 'email' else 'phone' end as matched_on
    from public.crm_contacts c
    where c.organization_id = target_organization and c.deleted_at is null
      and ((candidate_email is not null and lower(c.email) = lower(candidate_email))
        or (candidate_phone is not null and c.phone = candidate_phone))
      and public.can_access_crm_contact(target_organization, c.id)
    union all
    select 'lead'::text, l.id,
      case when candidate_email is not null and lower(l.email) = lower(candidate_email)
        then 'email' else 'phone' end
    from public.crm_leads l
    where l.organization_id = target_organization and l.deleted_at is null
      and l.status not in ('merged', 'junk')
      and ((candidate_email is not null and lower(l.email) = lower(candidate_email))
        or (candidate_phone is not null and l.phone = candidate_phone))
      and (public.can_manage_organization(target_organization)
        or (public.organization_role(target_organization) = 'estimator'
          and (l.created_by = auth.uid() or l.assigned_to_user_id = auth.uid())))
  ) candidate
  where public.can_edit_organization_work(target_organization)
  order by candidate.entity_type, candidate.entity_id;
$$;

-- Terminal semantics and the linear lifecycle are data-layer invariants. The
-- same-stage rejection closes the outcome-field rewrite bypass.
create or replace function public.validate_crm_opportunity_stage()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  target_category text;
  source_category text;
  pipeline_template text;
  reason_applies text;
begin
  select s.category, p.template_key into target_category, pipeline_template
  from public.crm_pipeline_stages s
  join public.crm_pipelines p on p.organization_id = s.organization_id and p.id = s.pipeline_id
  where s.organization_id = new.organization_id and s.id = new.stage_id and p.id = new.pipeline_id;
  if target_category is null then
    raise exception 'stage must belong to the selected pipeline and organization' using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new.reactivated_from_id is null and target_category <> 'new' then
      raise exception 'new opportunities must begin in the new category' using errcode = '23514';
    end if;
    if new.reactivated_from_id is not null and target_category <> 'qualifying' then
      raise exception 'reactivated opportunities must begin in qualifying' using errcode = '23514';
    end if;
  else
    select s.category into source_category from public.crm_pipeline_stages s
      where s.organization_id = old.organization_id and s.id = old.stage_id;
    if new.pipeline_id is distinct from old.pipeline_id then
      raise exception 'opportunity pipeline changes require a reviewed migration workflow' using errcode = '23514';
    end if;
    if new.stage_id is not distinct from old.stage_id then
      raise exception 'same-stage transitions are not commands' using errcode = '23514';
    end if;
    if source_category in ('won', 'lost', 'disqualified', 'handed_off') then
      raise exception 'terminal opportunities require the reactivation workflow' using errcode = '23514';
    end if;
    if not (
      source_category = target_category
      or
      (source_category = 'new' and target_category in ('qualifying','lost','disqualified','nurture'))
      or (source_category = 'qualifying' and target_category in ('walkthrough','estimating','lost','disqualified','nurture'))
      or (source_category = 'walkthrough' and target_category in ('estimating','lost','disqualified','nurture'))
      or (source_category = 'estimating' and target_category in ('proposing','lost','disqualified','nurture'))
      or (source_category = 'proposing' and target_category in ('negotiating','won','lost','disqualified','nurture'))
      or (source_category = 'negotiating' and target_category in ('proposing','won','lost','disqualified','nurture'))
      or (source_category = 'nurture' and target_category in ('qualifying','lost','disqualified'))
    ) then
      raise exception 'invalid opportunity stage transition' using errcode = '23514';
    end if;
  end if;

  if target_category = 'walkthrough' and not exists (
    select 1 from public.crm_walkthroughs w where w.organization_id = new.organization_id
      and w.opportunity_id = new.id and w.status in ('scheduled', 'rescheduled')
  ) then raise exception 'schedule a walkthrough before moving to this stage' using errcode = '23514'; end if;
  if target_category = 'estimating' and new.property_id is null then
    raise exception 'link a property before estimating' using errcode = '23514';
  end if;
  if target_category = 'estimating' and pipeline_template <> 'residential_turnover_v1'
     and not exists (select 1 from public.crm_walkthroughs w
       where w.organization_id = new.organization_id and w.opportunity_id = new.id
         and w.status in ('scheduled','rescheduled')) then
    raise exception 'schedule a walkthrough before estimating' using errcode = '23514';
  end if;
  if target_category in ('proposing','negotiating') and not exists (
    select 1 from public.proposals p where p.organization_id = new.organization_id
      and p.crm_opportunity_id = new.id and p.status::text in ('sent','accepted')
  ) then raise exception 'link a sent proposal before moving to this stage' using errcode = '23514'; end if;
  if target_category = 'won' and (new.acceptance_method is distinct from 'manual'
      or nullif(trim(coalesce(new.manual_win_reason,'')),'') is null) then
    raise exception 'R3-1 manual wins require a reason' using errcode = '23514';
  end if;
  if target_category = 'won' and not public.can_manage_organization(new.organization_id) then
    raise exception 'manual wins require owner or admin' using errcode = '42501';
  end if;
  if target_category = 'handed_off' then
    raise exception 'handoff is unavailable until the reviewed R3-6 workflow' using errcode = '23514';
  end if;
  if target_category in ('lost','disqualified') then
    select r.applies_to into reason_applies from public.crm_loss_reasons r
      where r.organization_id = new.organization_id and r.id = new.loss_reason_id and r.active;
    if reason_applies is null or not (reason_applies = 'both' or reason_applies = target_category) then
      raise exception '% requires an applicable active reason', target_category using errcode = '23514';
    end if;
  end if;
  if target_category = 'nurture' and (new.next_action_due_at is null or new.next_action_due_at <= now()) then
    raise exception 'nurture requires a future revisit date' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_crm_opportunity_stage_trigger on public.crm_opportunities;
create trigger validate_crm_opportunity_stage_trigger
  before insert or update of stage_id, pipeline_id, acceptance_method, manual_win_reason, loss_reason_id
  on public.crm_opportunities for each row execute function public.validate_crm_opportunity_stage();

-- The public stage command makes the Nurture revisit date part of the same
-- transaction and the same replay contract as the stage change.
create function public.move_crm_opportunity_stage(
  target_organization uuid,target_opportunity uuid,target_stage uuid,request_key text,
  selected_loss_reason uuid,selected_manual_win_reason text,
  selected_next_action_due_at timestamptz
)
returns table(opportunity_id uuid,stage_id uuid,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare target_category text; existing_due timestamptz; result_row record;
begin
  if auth.uid() is null or not public.can_access_crm_opportunity(target_opportunity) then
    raise exception 'stage transition unavailable' using errcode='42501';
  end if;
  select s.category into target_category from public.crm_pipeline_stages s
    join public.crm_opportunities o on o.organization_id=s.organization_id
      and o.pipeline_id=s.pipeline_id
    where o.organization_id=target_organization and o.id=target_opportunity
      and s.id=target_stage;
  if target_category is null
     or (target_category='nurture' and (selected_next_action_due_at is null
       or selected_next_action_due_at<=now()))
     or (target_category<>'nurture' and selected_next_action_due_at is not null) then
    raise exception 'invalid stage transition details' using errcode='23514';
  end if;
  select c.requested_next_action_due_at into existing_due
    from public.crm_opportunity_stage_commands c
    where c.organization_id=target_organization and c.command_key=request_key;
  if found and existing_due is distinct from selected_next_action_due_at then
    raise exception 'idempotency key was already used for another transition'
      using errcode='23514';
  end if;
  if not found and target_category='nurture' then
    update public.crm_opportunities set next_action_due_at=selected_next_action_due_at,
      updated_by=auth.uid() where organization_id=target_organization and id=target_opportunity;
  end if;
  select * into result_row from public.move_crm_opportunity_stage(
    target_organization,target_opportunity,target_stage,request_key,
    selected_loss_reason,selected_manual_win_reason);
  if not result_row.replayed then
    update public.crm_opportunity_stage_commands
      set requested_next_action_due_at=selected_next_action_due_at
      where organization_id=target_organization and command_key=request_key;
  end if;
  return query select result_row.opportunity_id,result_row.stage_id,result_row.replayed;
end;
$$;
revoke all on function public.move_crm_opportunity_stage(
  uuid,uuid,uuid,text,uuid,text
) from public,anon,authenticated,service_role;
revoke all on function public.move_crm_opportunity_stage(
  uuid,uuid,uuid,text,uuid,text,timestamptz
) from public,anon;
grant execute on function public.move_crm_opportunity_stage(
  uuid,uuid,uuid,text,uuid,text,timestamptz
) to authenticated,service_role;

-- A required terminal category cannot be removed by recategorising its final
-- stage. This still permits additional intermediate stages within categories.
create or replace function public.guard_crm_pipeline_stage()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then
    if old.category in ('won','lost','disqualified') then
      raise exception 'won, lost and disqualified stages cannot be deleted' using errcode = '23514';
    end if;
    return old;
  end if;
  if new.organization_id is distinct from old.organization_id or new.pipeline_id is distinct from old.pipeline_id then
    raise exception 'pipeline stage ownership cannot change' using errcode = '42501';
  end if;
  if new.category is distinct from old.category and (
    exists (select 1 from public.crm_opportunities o where o.stage_id = old.id)
    or (old.category in ('won','lost','disqualified') and not exists (
      select 1 from public.crm_pipeline_stages sibling
      where sibling.pipeline_id = old.pipeline_id and sibling.id <> old.id
        and sibling.category = old.category and not sibling.hidden
    ))
  ) then
    raise exception 'a required or used pipeline stage requires the reviewed remap workflow' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Command-only creation replaces direct route inserts and compares the entire
-- semantic payload on replay.
create function public.create_crm_manual_lead(
  p_organization uuid, p_request_key text, p_customer_name text default null,
  p_contact_name text default null, p_email text default null, p_phone text default null,
  p_property_name text default null, p_service_location text default null,
  p_assigned_to uuid default null, p_dedupe_hint jsonb default '{}'::jsonb
)
returns table(lead_id uuid, lead_status text, created_at timestamptz, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare existing public.crm_leads%rowtype; created_row public.crm_leads%rowtype; assignee uuid;
begin
  if auth.uid() is null or not public.can_edit_organization_work(p_organization)
     or length(p_request_key) not between 8 and 200
     or jsonb_typeof(p_dedupe_hint) <> 'object' or octet_length(p_dedupe_hint::text) > 16384 then
    raise exception 'lead creation unavailable' using errcode = '42501';
  end if;
  assignee := coalesce(p_assigned_to, auth.uid());
  if public.organization_role(p_organization) = 'estimator' and assignee <> auth.uid() then
    raise exception 'lead assignment unavailable' using errcode = '42501';
  end if;
  if not exists (select 1 from public.organization_memberships m where m.organization_id=p_organization
    and m.user_id=assignee and m.role in ('owner','admin','estimator')) then
    raise exception 'lead assignment unavailable' using errcode = '42501';
  end if;
  select l.* into existing from public.crm_leads l
    where l.organization_id=p_organization and l.idempotency_key=p_request_key for update;
  if existing.id is not null then
    if not (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator'
        and (existing.created_by=auth.uid() or existing.assigned_to_user_id=auth.uid()))) then
      raise exception 'lead creation unavailable' using errcode = '42501';
    end if;
    if existing.customer_name is distinct from nullif(trim(p_customer_name),'')
       or existing.contact_name is distinct from nullif(trim(p_contact_name),'')
       or existing.email is distinct from nullif(lower(trim(p_email)),'')
       or existing.phone is distinct from nullif(trim(p_phone),'')
       or existing.property_name is distinct from nullif(trim(p_property_name),'')
       or existing.service_location is distinct from nullif(trim(p_service_location),'')
       or existing.assigned_to_user_id is distinct from assignee
       or existing.dedupe_hint is distinct from p_dedupe_hint then
      raise exception 'idempotency key was already used for another lead' using errcode = '23514';
    end if;
    return query select existing.id,existing.status,existing.created_at,true; return;
  end if;
  insert into public.crm_leads(organization_id,status,intake_method,idempotency_key,customer_name,
    contact_name,email,phone,property_name,service_location,assigned_to_user_id,dedupe_hint,
    source,created_by,updated_by)
  values(p_organization,'new','manual',p_request_key,nullif(trim(p_customer_name),''),
    nullif(trim(p_contact_name),''),nullif(lower(trim(p_email)),''),nullif(trim(p_phone),''),
    nullif(trim(p_property_name),''),nullif(trim(p_service_location),''),assignee,p_dedupe_hint,
    'manual',auth.uid(),auth.uid()) returning * into created_row;
  return query select created_row.id,created_row.status,created_row.created_at,false;
end;
$$;
revoke all on function public.create_crm_manual_lead(uuid,text,text,text,text,text,text,text,uuid,jsonb)
  from public,anon;
grant execute on function public.create_crm_manual_lead(uuid,text,text,text,text,text,text,text,uuid,jsonb)
  to authenticated,service_role;

create function public.create_crm_opportunity_task(
  p_organization uuid, p_opportunity uuid, p_request_key text, p_title text,
  p_due_at timestamptz default null, p_timezone text default null, p_assignee uuid default null
)
returns table(task_id uuid, task_status text, title text, due_at timestamptz,
  snoozed_until timestamptz, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare existing public.crm_tasks%rowtype; created_row public.crm_tasks%rowtype;
begin
  if auth.uid() is null or not public.can_access_crm_opportunity(p_opportunity)
     or length(p_request_key) not between 8 and 200
     or length(trim(coalesce(p_title,''))) not between 1 and 240 then
    raise exception 'task creation unavailable' using errcode='42501';
  end if;
  if not exists (select 1 from public.crm_opportunities o where o.organization_id=p_organization
    and o.id=p_opportunity and o.deleted_at is null) then
    raise exception 'task creation unavailable' using errcode='42501';
  end if;
  if p_assignee is null or not exists (select 1 from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_assignee
      and m.role in ('owner','admin','estimator')) then
    raise exception 'task assignment unavailable' using errcode='42501';
  end if;
  if public.organization_role(p_organization)='estimator' and p_assignee<>auth.uid() then
    raise exception 'task assignment unavailable' using errcode='42501';
  end if;
  select t.* into existing from public.crm_tasks t
    where t.organization_id=p_organization and t.idempotency_key=p_request_key for update;
  if existing.id is not null then
    if existing.opportunity_id is distinct from p_opportunity
       or existing.title is distinct from trim(p_title)
       or existing.due_at is distinct from p_due_at
       or existing.timezone is distinct from nullif(trim(p_timezone),'')
       or existing.assignee_user_id is distinct from p_assignee then
      raise exception 'idempotency key was already used for another task' using errcode='23514';
    end if;
    return query select existing.id,existing.status,existing.title,existing.due_at,
      existing.snoozed_until,true; return;
  end if;
  insert into public.crm_tasks(organization_id,opportunity_id,idempotency_key,title,due_at,
    timezone,assignee_user_id,status,created_from,created_by,updated_by)
  values(p_organization,p_opportunity,p_request_key,trim(p_title),p_due_at,
    nullif(trim(p_timezone),''),p_assignee,'open','manual',auth.uid(),auth.uid())
  returning * into created_row;
  return query select created_row.id,created_row.status,created_row.title,created_row.due_at,
    created_row.snoozed_until,false;
end;
$$;
revoke all on function public.create_crm_opportunity_task(uuid,uuid,text,text,timestamptz,text,uuid)
  from public,anon;
grant execute on function public.create_crm_opportunity_task(uuid,uuid,text,text,timestamptz,text,uuid)
  to authenticated,service_role;

-- Re-project the operator-reviewed contact choice after reload without exposing
-- arbitrary IDs from the stored JSON hint.
create function public.read_crm_lead_contact_links(p_organization uuid)
returns table(lead_id uuid, contact_id uuid)
language sql stable security definer
set search_path = pg_catalog, public as $$
  select l.id, c.id
  from public.crm_leads l
  join public.crm_contacts c
    on c.organization_id=l.organization_id
   and c.id::text=l.dedupe_hint->>'linked_entity_id'
   and c.deleted_at is null
  where l.organization_id=p_organization and l.deleted_at is null
    and l.dedupe_hint->>'decision'='link_existing'
    and exists (
      select 1 from jsonb_array_elements(coalesce(l.dedupe_hint->'candidates','[]'::jsonb)) item
      where item->>'entity_type'='contact' and item->>'entity_id'=c.id::text
    )
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator'
        and (l.created_by=auth.uid() or l.assigned_to_user_id=auth.uid())))
    and public.can_access_crm_contact(p_organization,c.id)
  order by l.id;
$$;
revoke all on function public.read_crm_lead_contact_links(uuid) from public,anon;
grant execute on function public.read_crm_lead_contact_links(uuid) to authenticated,service_role;

-- Minimal walkthrough lifecycle receipts support retry-safe reschedule/cancel
-- without introducing field-service notes, notifications, or calendar sync.
create table public.crm_walkthrough_commands(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  walkthrough_id uuid not null,
  command_key text not null check(length(command_key) between 8 and 200),
  action text not null check(action in ('reschedule','cancel')),
  window_start timestamptz,
  window_end timestamptz,
  timezone text,
  expected_updated_at timestamptz not null,
  resulting_updated_at timestamptz not null,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique(organization_id,command_key),
  foreign key(organization_id,walkthrough_id)
    references public.crm_walkthroughs(organization_id,id) on delete cascade,
  check((action='reschedule')=(window_start is not null and window_end is not null and timezone is not null))
);
alter table public.crm_walkthrough_commands enable row level security;
revoke all on public.crm_walkthrough_commands from public,anon,authenticated;
grant all on public.crm_walkthrough_commands to service_role;

create function public.command_crm_walkthrough(
  p_organization uuid,p_walkthrough uuid,p_request_key text,p_action text,
  p_expected_updated_at timestamptz,p_window_start timestamptz default null,
  p_window_end timestamptz default null,p_timezone text default null
)
returns table(walkthrough_id uuid,walkthrough_status text,updated_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_row public.crm_walkthroughs%rowtype;
  existing public.crm_walkthrough_commands%rowtype; changed_at timestamptz;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 200
     or p_action not in ('reschedule','cancel') then
    raise exception 'walkthrough command unavailable' using errcode='42501';
  end if;
  select w.* into current_row from public.crm_walkthroughs w
    where w.organization_id=p_organization and w.id=p_walkthrough for update;
  if current_row.id is null or not public.can_access_crm_opportunity(current_row.opportunity_id) then
    raise exception 'walkthrough command unavailable' using errcode='42501';
  end if;
  select c.* into existing from public.crm_walkthrough_commands c
    where c.organization_id=p_organization and c.command_key=p_request_key;
  if existing.id is not null then
    if existing.walkthrough_id is distinct from p_walkthrough
       or existing.action is distinct from p_action
       or existing.expected_updated_at is distinct from p_expected_updated_at
       or existing.window_start is distinct from p_window_start
       or existing.window_end is distinct from p_window_end
       or existing.timezone is distinct from nullif(trim(p_timezone),'') then
      raise exception 'walkthrough command key already used' using errcode='23514';
    end if;
    return query select existing.walkthrough_id,
      case existing.action when 'cancel' then 'cancelled' else 'rescheduled' end,
      existing.resulting_updated_at,true;
    return;
  end if;
  if current_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'walkthrough changed since it was loaded' using errcode='40001';
  end if;
  if current_row.status not in ('scheduled','rescheduled') then
    raise exception 'walkthrough is no longer active' using errcode='23514';
  end if;
  changed_at:=clock_timestamp();
  if p_action='reschedule' then
    if p_window_start is null or p_window_end<=p_window_start
       or length(trim(coalesce(p_timezone,''))) not between 1 and 80 then
      raise exception 'invalid walkthrough window' using errcode='23514';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_organization::text||':'||current_row.estimator_user_id::text,0));
    if exists(select 1 from public.crm_walkthroughs w
      where w.organization_id=p_organization and w.id<>p_walkthrough
        and w.estimator_user_id=current_row.estimator_user_id
        and w.status in ('scheduled','rescheduled')
        and w.window_start<p_window_end and w.window_end>p_window_start) then
      raise exception 'estimator already has an overlapping walkthrough' using errcode='23P01';
    end if;
    update public.crm_walkthroughs set status='rescheduled',window_start=p_window_start,
      window_end=p_window_end,timezone=trim(p_timezone),updated_by=auth.uid(),updated_at=changed_at
      where organization_id=p_organization and id=p_walkthrough;
  else
    if p_window_start is not null or p_window_end is not null or p_timezone is not null then
      raise exception 'cancel does not accept a walkthrough window' using errcode='23514';
    end if;
    update public.crm_walkthroughs set status='cancelled',updated_by=auth.uid(),updated_at=changed_at
      where organization_id=p_organization and id=p_walkthrough;
  end if;
  insert into public.crm_walkthrough_commands(organization_id,walkthrough_id,command_key,
    action,window_start,window_end,timezone,expected_updated_at,resulting_updated_at,actor_user_id)
  values(p_organization,p_walkthrough,p_request_key,p_action,p_window_start,p_window_end,
    nullif(trim(p_timezone),''),p_expected_updated_at,changed_at,auth.uid());
  return query select p_walkthrough,
    case p_action when 'cancel' then 'cancelled' else 'rescheduled' end,changed_at,false;
end;
$$;
revoke all on function public.command_crm_walkthrough(
  uuid,uuid,text,text,timestamptz,timestamptz,timestamptz,text
) from public,anon;
grant execute on function public.command_crm_walkthrough(
  uuid,uuid,text,text,timestamptz,timestamptz,timestamptz,text
) to authenticated,service_role;

create function public.read_crm_walkthroughs(p_organization uuid)
returns table(id uuid,opportunity_id uuid,property_id uuid,estimator_user_id uuid,
  site_contact_id uuid,status text,window_start timestamptz,window_end timestamptz,
  timezone text,updated_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select w.id,w.opportunity_id,w.property_id,w.estimator_user_id,w.site_contact_id,
    w.status,w.window_start,w.window_end,w.timezone,w.updated_at
  from public.crm_walkthroughs w
  where w.organization_id=p_organization and w.status in ('scheduled','rescheduled')
    and public.can_access_crm_opportunity(w.opportunity_id)
  order by w.window_start,w.id;
$$;
revoke all on function public.read_crm_walkthroughs(uuid) from public,anon;
grant execute on function public.read_crm_walkthroughs(uuid) to authenticated,service_role;

-- Authenticate and bind the full command payload before revealing whether an
-- idempotency key exists. This removes the cross-tenant replay oracle.
create or replace function public.create_crm_direct_opportunity(
  p_organization uuid, p_opportunity uuid, p_lead uuid, p_request_key text,
  p_customer uuid, p_property uuid, p_pipeline uuid, p_name text,
  p_owner uuid, p_estimator uuid default null
)
returns table(opportunity_id uuid, lead_id uuid, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  pipeline_segment text;
  first_stage uuid;
  existing public.crm_opportunities%rowtype;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 200
     or length(trim(coalesce(p_name,''))) not between 1 and 200 then
    raise exception 'opportunity creation unavailable' using errcode='42501';
  end if;
  if not coalesce((public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator' and p_owner=auth.uid()
        and (p_estimator is null or p_estimator=auth.uid()))),false) then
    raise exception 'opportunity creation unavailable' using errcode='42501';
  end if;
  if not public.can_access_crm_customer(p_organization,p_customer)
     or (p_property is not null
       and not public.can_access_crm_property(p_organization,p_property))
     or (p_property is not null and not exists (
       select 1 from public.crm_properties p where p.organization_id=p_organization
         and p.id=p_property and p.customer_id=p_customer and p.deleted_at is null))
     or not exists (select 1 from public.organization_memberships m
       where m.organization_id=p_organization and m.user_id=p_owner
         and m.role in ('owner','admin','estimator'))
     or (p_estimator is not null and not exists (
       select 1 from public.organization_memberships m
       where m.organization_id=p_organization and m.user_id=p_estimator
         and m.role in ('owner','admin','estimator'))) then
    raise exception 'opportunity relationship unavailable' using errcode='23514';
  end if;
  select o.* into existing from public.crm_opportunities o
    where o.organization_id=p_organization and o.idempotency_key=p_request_key
    for update;
  if existing.id is not null then
    if existing.id is distinct from p_opportunity
       or existing.lead_id is distinct from p_lead
       or existing.customer_id is distinct from p_customer
       or existing.property_id is distinct from p_property
       or existing.pipeline_id is distinct from p_pipeline
       or existing.name is distinct from trim(p_name)
       or existing.owner_user_id is distinct from p_owner
       or existing.estimator_user_id is distinct from p_estimator then
      raise exception 'opportunity command key already used' using errcode='23514';
    end if;
    return query select existing.id,existing.lead_id,true;
    return;
  end if;
  select p.segment into pipeline_segment from public.crm_pipelines p
    where p.organization_id=p_organization and p.id=p_pipeline and not p.archived;
  select s.id into first_stage from public.crm_pipeline_stages s
    where s.organization_id=p_organization and s.pipeline_id=p_pipeline
      and s.category='new' and not s.hidden order by s.position,s.id limit 1;
  if pipeline_segment is null or first_stage is null then
    raise exception 'pipeline is unavailable' using errcode='23514';
  end if;
  insert into public.crm_leads(id,organization_id,status,intake_method,idempotency_key,
    customer_name,property_name,converted_customer_id,converted_property_id,
    source,created_by,updated_by)
  select p_lead,p_organization,'converted','direct_opportunity',p_request_key,c.name,p.name,
    p_customer,p_property,'direct_opportunity',auth.uid(),auth.uid()
  from public.crm_customers c left join public.crm_properties p
    on p.organization_id=c.organization_id and p.id=p_property
  where c.organization_id=p_organization and c.id=p_customer;
  insert into public.crm_opportunities(id,organization_id,customer_id,property_id,pipeline_id,
    stage_id,lead_id,idempotency_key,name,owner_user_id,estimator_user_id,segment,source,
    created_by,updated_by)
  values(p_opportunity,p_organization,p_customer,p_property,p_pipeline,first_stage,p_lead,
    p_request_key,trim(p_name),p_owner,p_estimator,
    case when pipeline_segment='commercial' then 'commercial' else 'turnover' end,
    'manual',auth.uid(),auth.uid());
  update public.crm_leads set converted_opportunity_id=p_opportunity
    where organization_id=p_organization and id=p_lead;
  return query select p_opportunity,p_lead,false;
end;
$$;
revoke all on function public.create_crm_direct_opportunity(
  uuid,uuid,uuid,text,uuid,uuid,uuid,text,uuid,uuid
) from public,anon;
grant execute on function public.create_crm_direct_opportunity(
  uuid,uuid,uuid,text,uuid,uuid,uuid,text,uuid,uuid
) to authenticated,service_role;

commit;
