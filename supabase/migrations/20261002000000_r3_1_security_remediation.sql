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
  if caller_role is distinct from 'estimator' then return new; end if;

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

commit;
