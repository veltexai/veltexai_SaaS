begin;

create table public.crm_estimate_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  work_package_id uuid,
  property_id uuid not null,
  request_key text not null check(length(request_key) between 8 and 200),
  engine_key text not null,
  engine_version text not null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  selected_scenario text not null check(selected_scenario in ('low','base','high','override')),
  selected_amount_minor bigint not null check(selected_amount_minor >= 0),
  currency text not null default 'USD' check(currency = 'USD'),
  pricing_basis text not null check(pricing_basis in ('per_visit','per_turn','one_time','monthly')),
  input_sha256 text not null check(input_sha256 ~ '^[a-f0-9]{64}$'),
  output_sha256 text not null check(output_sha256 ~ '^[a-f0-9]{64}$'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,request_key),
  foreign key(organization_id,opportunity_id)
    references public.crm_opportunities(organization_id,id) on delete cascade,
  foreign key(organization_id,property_id)
    references public.crm_properties(organization_id,id) on delete restrict,
  foreign key(organization_id,work_package_id)
    references public.crm_site_work_packages(organization_id,id) on delete restrict
);

alter table public.crm_site_work_packages add column estimate_run_id uuid;
alter table public.crm_site_work_packages add constraint crm_site_work_packages_estimate_run_fk
  foreign key(organization_id,estimate_run_id)
  references public.crm_estimate_runs(organization_id,id) on delete restrict;
alter table public.crm_site_work_packages add constraint crm_site_work_packages_estimated_evidence_check
  check(status<>'estimated' or estimate_run_id is not null);

-- Estimate selection returns the package's next optimistic token. Preserve the
-- explicit clock_timestamp exactly as the accepted customer/contact/property/
-- opportunity/walkthrough commands already do.
drop trigger crm_site_work_packages_updated_at on public.crm_site_work_packages;
create trigger crm_site_work_packages_updated_at before update on public.crm_site_work_packages
  for each row execute function public.handle_crm_updated_at();

create table public.crm_estimate_run_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  estimate_run_id uuid not null,
  command_key text not null check(length(command_key) between 8 and 200),
  payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
  resulting_package_updated_at timestamptz,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,command_key),
  foreign key(organization_id,estimate_run_id)
    references public.crm_estimate_runs(organization_id,id) on delete cascade
);

alter table public.crm_estimate_runs enable row level security;
alter table public.crm_estimate_run_commands enable row level security;
revoke all on public.crm_estimate_runs,public.crm_estimate_run_commands
  from public,anon,authenticated,service_role;

create function public.crm_estimate_sha256(value jsonb)
returns text language plpgsql stable security definer
set search_path=pg_catalog,public as $$
declare digest_schema text; result text;
begin
  select n.nspname into digest_schema
  from pg_extension e join pg_namespace n on n.oid=e.extnamespace
  where e.extname='pgcrypto';
  if digest_schema is null then raise exception 'pgcrypto unavailable' using errcode='55000'; end if;
  execute format('select encode(%I.digest(convert_to($1::text,''UTF8''),''sha256''),''hex'')',digest_schema)
    into result using value;
  return result;
end;
$$;
revoke all on function public.crm_estimate_sha256(jsonb) from public,anon,authenticated,service_role;

create function public.command_crm_estimate_run(
  p_organization uuid,p_opportunity uuid,p_package uuid,p_property uuid,
  p_request_key text,p_engine_key text,p_engine_version text,
  p_input_snapshot jsonb,p_output_snapshot jsonb,p_selected_scenario text,
  p_selected_amount_minor bigint,p_currency text,p_pricing_basis text,
  p_expected_package_updated_at timestamptz default null
)
returns table(estimate_run_id uuid,package_updated_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare opportunity_row public.crm_opportunities%rowtype;
  package_row public.crm_site_work_packages%rowtype;
  existing public.crm_estimate_run_commands%rowtype;
  new_run_id uuid:=gen_random_uuid(); input_hash text; output_hash text;
  payload_hash text; changed_at timestamptz; selected_value numeric;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 200 then
    raise exception 'estimate unavailable' using errcode='42501';
  end if;
  select o.* into opportunity_row from public.crm_opportunities o
    where o.organization_id=p_organization and o.id=p_opportunity and o.deleted_at is null for update;
  if opportunity_row.id is null or not coalesce((public.can_manage_organization(p_organization)
    or (public.organization_role(p_organization)='estimator'
      and opportunity_row.estimator_user_id=auth.uid())),false) then
    raise exception 'estimate unavailable' using errcode='42501';
  end if;
  if opportunity_row.property_id is distinct from p_property or not exists(
    select 1 from public.crm_properties p where p.organization_id=p_organization
      and p.id=p_property and p.deleted_at is null) then
    raise exception 'estimate context unavailable' using errcode='23514';
  end if;
  if p_package is not null then
    select p.* into package_row from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=p_package for update;
    if package_row.id is null or package_row.opportunity_id<>p_opportunity
       or package_row.property_id<>p_property then
      raise exception 'estimate context unavailable' using errcode='23514';
    end if;
  elsif opportunity_row.segment='commercial' then
    raise exception 'commercial estimate requires a work package' using errcode='23514';
  end if;
  if opportunity_row.segment='commercial' and not exists(
    select 1 from public.crm_walkthroughs w where w.organization_id=p_organization
      and w.opportunity_id=p_opportunity and w.property_id=p_property
      and w.status='completed' and w.evidence_completed_at is not null) then
    raise exception 'commercial walkthrough evidence is incomplete' using errcode='23514';
  end if;
  if p_engine_key<>'service_catalog' or p_engine_version<>'2026-09-22.2'
     or p_selected_scenario not in ('low','base','high','override')
     or p_selected_amount_minor<0 or p_currency<>'USD'
     or p_pricing_basis not in ('per_visit','per_turn','one_time','monthly')
     or jsonb_typeof(p_input_snapshot)<>'object' or jsonb_typeof(p_output_snapshot)<>'object'
     or p_input_snapshot->>'catalogVersion'<>'2026-09-22.2'
     or p_output_snapshot->>'version'<>'2026-09-22.2' then
    raise exception 'estimate snapshot unavailable' using errcode='23514';
  end if;
  if p_pricing_basis<>(case
      when p_input_snapshot->>'jobType'='airbnb_turnover' then 'per_turn'
      when p_input_snapshot->>'frequency'='one-time' then 'one_time'
      else 'per_visit' end) then
    raise exception 'pricing basis does not match snapshot' using errcode='23514';
  end if;
  selected_value:=case p_selected_scenario
    when 'override' then (p_input_snapshot#>>'{override,pricePerVisit}')::numeric
    else (p_output_snapshot#>>array[p_selected_scenario,'suggestedPrice'])::numeric end;
  if selected_value is null or round(selected_value*100)::bigint<>p_selected_amount_minor
     or (p_selected_scenario='override' and length(trim(coalesce(p_input_snapshot#>>'{override,reason}',''))) not between 5 and 1000)
     or (p_output_snapshot->>'unit')<>'per_visit' then
    raise exception 'selected estimate does not match snapshot' using errcode='23514';
  end if;
  input_hash:=public.crm_estimate_sha256(p_input_snapshot);
  output_hash:=public.crm_estimate_sha256(p_output_snapshot);
  payload_hash:=public.crm_estimate_sha256(jsonb_build_object(
    'opportunity',p_opportunity,'package',p_package,'property',p_property,
    'engine_key',p_engine_key,'engine_version',p_engine_version,
    'input_sha256',input_hash,'output_sha256',output_hash,
    'selected_scenario',p_selected_scenario,'selected_amount_minor',p_selected_amount_minor,
    'currency',p_currency,'pricing_basis',p_pricing_basis,
    'expected_package_updated_at',p_expected_package_updated_at));
  select c.* into existing from public.crm_estimate_run_commands c
    where c.organization_id=p_organization and c.command_key=p_request_key;
  if existing.id is not null then
    if existing.payload_sha256<>payload_hash then
      raise exception 'estimate key already used' using errcode='23514';
    end if;
    return query select existing.estimate_run_id,existing.resulting_package_updated_at,true;
    return;
  end if;
  if p_package is not null and (p_expected_package_updated_at is null
     or package_row.updated_at is distinct from p_expected_package_updated_at) then
    raise exception 'site work package changed' using errcode='40001';
  end if;
  insert into public.crm_estimate_runs(id,organization_id,opportunity_id,work_package_id,
    property_id,request_key,engine_key,engine_version,input_snapshot,output_snapshot,
    selected_scenario,selected_amount_minor,currency,pricing_basis,input_sha256,output_sha256,created_by)
  values(new_run_id,p_organization,p_opportunity,p_package,p_property,p_request_key,p_engine_key,
    p_engine_version,p_input_snapshot,p_output_snapshot,p_selected_scenario,p_selected_amount_minor,
    p_currency,p_pricing_basis,input_hash,output_hash,auth.uid());
  if p_package is not null then
    changed_at:=clock_timestamp();
    update public.crm_site_work_packages set estimate_run_id=new_run_id,status='estimated',
      updated_by=auth.uid(),updated_at=changed_at
    where organization_id=p_organization and id=p_package;
  end if;
  insert into public.crm_estimate_run_commands(organization_id,estimate_run_id,command_key,
    payload_sha256,resulting_package_updated_at,actor_user_id)
  values(p_organization,new_run_id,p_request_key,payload_hash,changed_at,auth.uid());
  insert into public.organization_audit_log(organization_id,actor_user_id,action,entity_type,entity_id,metadata)
  values(p_organization,auth.uid(),'crm_estimate_runs.insert','crm_estimate_runs',new_run_id::text,
    jsonb_build_object('operation','INSERT'));
  insert into public.organization_event_outbox(organization_id,event_type,aggregate_type,aggregate_id,payload)
  values(p_organization,'estimate.saved','crm_estimate_runs',new_run_id::text,
    jsonb_build_object('record_id',new_run_id::text));
  return query select new_run_id,changed_at,false;
end;
$$;
revoke all on function public.command_crm_estimate_run(
  uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamptz
) from public,anon,service_role;
grant execute on function public.command_crm_estimate_run(
  uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamptz
) to authenticated;

create function public.read_crm_estimate_summaries(p_organization uuid)
returns table(estimate_run_id uuid,opportunity_id uuid,work_package_id uuid,engine_version text,
  selected_amount_minor bigint,currency text,pricing_basis text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select distinct on(e.opportunity_id) e.id,e.opportunity_id,e.work_package_id,e.engine_version,
    e.selected_amount_minor,e.currency,e.pricing_basis,e.created_at
  from public.crm_estimate_runs e join public.crm_opportunities o
    on o.organization_id=e.organization_id and o.id=e.opportunity_id
  where e.organization_id=p_organization and public.can_access_crm_opportunity(e.opportunity_id)
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator' and o.estimator_user_id=auth.uid()))
  order by e.opportunity_id,e.created_at desc,e.id desc;
$$;
revoke all on function public.read_crm_estimate_summaries(uuid) from public,anon,service_role;
grant execute on function public.read_crm_estimate_summaries(uuid) to authenticated;

create function public.read_crm_estimate_runs(p_organization uuid,p_opportunity uuid)
returns table(id uuid,work_package_id uuid,engine_version text,input_snapshot jsonb,
  output_snapshot jsonb,selected_scenario text,selected_amount_minor bigint,currency text,
  pricing_basis text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select e.id,e.work_package_id,e.engine_version,e.input_snapshot,e.output_snapshot,
    e.selected_scenario,e.selected_amount_minor,e.currency,e.pricing_basis,e.created_at
  from public.crm_estimate_runs e join public.crm_opportunities o
    on o.organization_id=e.organization_id and o.id=e.opportunity_id
  where e.organization_id=p_organization and e.opportunity_id=p_opportunity
    and (public.can_manage_organization(p_organization)
      or (public.organization_role(p_organization)='estimator' and o.estimator_user_id=auth.uid()))
  order by e.created_at desc,e.id desc;
$$;
revoke all on function public.read_crm_estimate_runs(uuid,uuid) from public,anon,service_role;
grant execute on function public.read_crm_estimate_runs(uuid,uuid) to authenticated;

commit;
