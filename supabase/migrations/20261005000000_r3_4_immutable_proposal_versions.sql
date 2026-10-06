begin;

create table public.crm_proposal_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_id uuid not null,
  opportunity_id uuid not null,
  property_id uuid not null,
  work_package_id uuid,
  estimate_run_id uuid not null,
  version_number integer not null check(version_number > 0),
  request_key text not null check(length(request_key) between 8 and 200),
  content_snapshot jsonb not null check(jsonb_typeof(content_snapshot)='object'),
  rendered_content text not null check(octet_length(rendered_content) between 1 and 1048576),
  display_amount_minor bigint not null check(display_amount_minor >= 0),
  currency text not null default 'USD' check(currency='USD'),
  pricing_basis text not null check(pricing_basis in ('per_visit','per_turn','one_time')),
  content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
  rendered_sha256 text not null check(rendered_sha256 ~ '^[a-f0-9]{64}$'),
  estimate_input_sha256 text not null check(estimate_input_sha256 ~ '^[a-f0-9]{64}$'),
  estimate_output_sha256 text not null check(estimate_output_sha256 ~ '^[a-f0-9]{64}$'),
  schema_version text not null check(schema_version='crm_proposal_version.v1'),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,proposal_id,version_number),
  unique(organization_id,request_key),
  unique(organization_id,work_package_id,id),
  foreign key(organization_id,proposal_id)
    references public.proposals(organization_id,id) on delete restrict,
  foreign key(organization_id,opportunity_id)
    references public.crm_opportunities(organization_id,id) on delete restrict,
  foreign key(organization_id,property_id)
    references public.crm_properties(organization_id,id) on delete restrict,
  foreign key(organization_id,work_package_id)
    references public.crm_site_work_packages(organization_id,id) on delete restrict,
  foreign key(organization_id,estimate_run_id)
    references public.crm_estimate_runs(organization_id,id) on delete restrict
);

create index crm_proposal_versions_context_idx
  on public.crm_proposal_versions(organization_id,opportunity_id,created_at desc);

create table public.crm_proposal_version_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  command_key text not null check(length(command_key) between 8 and 200),
  payload_sha256 text not null check(payload_sha256 ~ '^[a-f0-9]{64}$'),
  resulting_package_updated_at timestamptz,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique(organization_id,command_key),
  foreign key(organization_id,proposal_version_id)
    references public.crm_proposal_versions(organization_id,id) on delete cascade
);

alter table public.crm_site_work_packages add column proposal_version_id uuid;
alter table public.crm_site_work_packages
  add constraint crm_site_work_packages_proposal_version_fk
  foreign key(organization_id,id,proposal_version_id)
  references public.crm_proposal_versions(organization_id,work_package_id,id)
  on delete restrict;

alter table public.crm_proposal_versions enable row level security;
alter table public.crm_proposal_version_commands enable row level security;
revoke all on public.crm_proposal_versions,public.crm_proposal_version_commands
  from public,anon,authenticated,service_role;

create function public.crm_proposal_sha256(value text)
returns text language plpgsql stable security definer
set search_path=pg_catalog,public as $$
declare digest_schema text; result text;
begin
  select n.nspname into digest_schema
  from pg_extension e join pg_namespace n on n.oid=e.extnamespace
  where e.extname='pgcrypto';
  if digest_schema is null then raise exception 'pgcrypto unavailable' using errcode='55000'; end if;
  execute format('select encode(%I.digest(convert_to($1,''UTF8''),''sha256''),''hex'')',digest_schema)
    into result using value;
  return result;
end;
$$;
revoke all on function public.crm_proposal_sha256(text)
  from public,anon,authenticated,service_role;

create function public.crm_proposal_snapshot_v1_valid(value jsonb)
returns boolean language sql immutable security definer
set search_path=pg_catalog,public as $$
  select jsonb_typeof(value)='object'
    and value->>'schemaVersion'='crm_proposal_version.v1'
    and not exists(
      select 1 from jsonb_object_keys(case when jsonb_typeof(value)='object'
        then value else '{}'::jsonb end) key
      where key<>all(array['schemaVersion','title','introduction','organization','customer',
        'serviceLocation','service','scopeLines','exclusions','assumptions','terms',
        'pricing','template','provenance']))
    and value ?& array['schemaVersion','title','organization','customer','serviceLocation',
      'service','scopeLines','pricing','template','provenance']
    and jsonb_typeof(value->'title')='string'
    and length(trim(value->>'title')) between 1 and 240
    and (not value?'introduction' or jsonb_typeof(value->'introduction') in ('string','null'))
    and jsonb_typeof(value->'organization')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'organization')='object'
      then value->'organization' else '{}'::jsonb end) key
      where key<>all(array['displayName','address','phone','email','website']))
    and jsonb_typeof(value->'organization'->'displayName')='string'
    and jsonb_typeof(value->'customer')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'customer')='object'
      then value->'customer' else '{}'::jsonb end) key
      where key<>all(array['name','company','email','phone']))
    and jsonb_typeof(value->'customer'->'name')='string'
    and jsonb_typeof(value->'serviceLocation')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'serviceLocation')='object'
      then value->'serviceLocation' else '{}'::jsonb end) key
      where key<>all(array['name','address','city','state','postalCode']))
    and jsonb_typeof(value->'serviceLocation'->'address')='string'
    and jsonb_typeof(value->'service')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'service')='object'
      then value->'service' else '{}'::jsonb end) key
      where key<>all(array['type','frequency','summary']))
    and jsonb_typeof(value->'service'->'type')='string'
    and jsonb_typeof(value->'service'->'frequency')='string'
    and jsonb_typeof(value->'scopeLines')='array'
    and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(value->'scopeLines')='array'
      then value->'scopeLines' else '[]'::jsonb end) item
      where jsonb_typeof(item)<>'string')
    and (not value?'exclusions' or (jsonb_typeof(value->'exclusions')='array'
      and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(value->'exclusions')='array'
        then value->'exclusions' else '[]'::jsonb end) item where jsonb_typeof(item)<>'string')))
    and (not value?'assumptions' or (jsonb_typeof(value->'assumptions')='array'
      and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(value->'assumptions')='array'
        then value->'assumptions' else '[]'::jsonb end) item where jsonb_typeof(item)<>'string')))
    and (not value?'terms' or (jsonb_typeof(value->'terms')='array'
      and not exists(select 1 from jsonb_array_elements(case when jsonb_typeof(value->'terms')='array'
        then value->'terms' else '[]'::jsonb end) item where jsonb_typeof(item)<>'string')))
    and jsonb_typeof(value->'pricing')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'pricing')='object'
      then value->'pricing' else '{}'::jsonb end) key
      where key<>all(array['amountMinor','currency','basis','initialCleanAmountMinor','unitLabel']))
    and (value#>>'{pricing,amountMinor}') ~ '^[0-9]{1,18}$'
    and value#>>'{pricing,currency}'='USD'
    and value#>>'{pricing,basis}' in ('per_visit','per_turn','one_time')
    and (not (value->'pricing')?'initialCleanAmountMinor'
      or (value#>>'{pricing,initialCleanAmountMinor}') ~ '^[0-9]{1,18}$')
    and jsonb_typeof(value->'template')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'template')='object'
      then value->'template' else '{}'::jsonb end) key
      where key<>all(array['id','rendererVersion']))
    and jsonb_typeof(value->'template'->'id')='string'
    and jsonb_typeof(value->'template'->'rendererVersion')='string'
    and jsonb_typeof(value->'provenance')='object'
    and not exists(select 1 from jsonb_object_keys(case when jsonb_typeof(value->'provenance')='object'
      then value->'provenance' else '{}'::jsonb end) key
      where key<>all(array['proposalId','opportunityId','propertyId','workPackageId','estimateRunId']))
    and value->'provenance' ?& array['proposalId','opportunityId','propertyId','workPackageId','estimateRunId']
    and jsonb_typeof(value#>'{provenance,proposalId}')='string'
    and jsonb_typeof(value#>'{provenance,opportunityId}')='string'
    and jsonb_typeof(value#>'{provenance,propertyId}')='string'
    and jsonb_typeof(value#>'{provenance,estimateRunId}')='string'
    and jsonb_typeof(value#>'{provenance,workPackageId}') in ('string','null')
    and octet_length(value::text)<=262144;
$$;
revoke all on function public.crm_proposal_snapshot_v1_valid(jsonb)
  from public,anon,authenticated,service_role;

create function public.guard_crm_proposal_version_immutable()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  raise exception 'proposal versions are immutable' using errcode='55000';
end;
$$;
revoke all on function public.guard_crm_proposal_version_immutable()
  from public,anon,authenticated,service_role;
create trigger guard_crm_proposal_version_immutable before update or delete
  on public.crm_proposal_versions for each row
  execute function public.guard_crm_proposal_version_immutable();

create function public.command_crm_publish_proposal_version_internal(
  p_actor uuid,p_organization uuid,p_proposal uuid,p_opportunity uuid,
  p_package uuid,p_property uuid,p_estimate_run uuid,p_request_key text,
  p_schema_version text,p_content_snapshot jsonb,p_rendered_content text,
  p_expected_package_updated_at timestamptz default null
)
returns table(proposal_version_id uuid,version_number integer,
  package_updated_at timestamptz,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare opportunity_row public.crm_opportunities%rowtype;
  proposal_row public.proposals%rowtype;
  package_row public.crm_site_work_packages%rowtype;
  estimate_row public.crm_estimate_runs%rowtype;
  existing public.crm_proposal_version_commands%rowtype;
  existing_version public.crm_proposal_versions%rowtype;
  actor_role text; content_hash text; rendered_hash text; payload_hash text;
  new_version_id uuid:=gen_random_uuid(); next_number integer; changed_at timestamptz;
begin
  if p_actor is null or length(p_request_key) not between 8 and 200
     or p_schema_version<>'crm_proposal_version.v1' then
    raise exception 'proposal version unavailable' using errcode='42501';
  end if;
  select m.role into actor_role from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_actor;
  select o.* into opportunity_row from public.crm_opportunities o
    where o.organization_id=p_organization and o.id=p_opportunity and o.deleted_at is null for update;
  if opportunity_row.id is null or not coalesce(actor_role in ('owner','admin')
    or (actor_role='estimator' and opportunity_row.estimator_user_id=p_actor),false) then
    raise exception 'proposal version unavailable' using errcode='42501';
  end if;
  select p.* into proposal_row from public.proposals p
    where p.organization_id=p_organization and p.id=p_proposal for update;
  if proposal_row.id is null or proposal_row.crm_opportunity_id is distinct from p_opportunity
     or proposal_row.crm_customer_id is distinct from opportunity_row.customer_id
     or proposal_row.crm_property_id is distinct from p_property
     or opportunity_row.property_id is distinct from p_property then
    raise exception 'proposal version context unavailable' using errcode='23514';
  end if;
  select e.* into estimate_row from public.crm_estimate_runs e
    where e.organization_id=p_organization and e.id=p_estimate_run;
  if estimate_row.id is null or estimate_row.opportunity_id<>p_opportunity
     or estimate_row.property_id<>p_property
     or estimate_row.work_package_id is distinct from p_package then
    raise exception 'proposal version context unavailable' using errcode='23514';
  end if;
  if p_package is not null then
    select p.* into package_row from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=p_package for update;
    if package_row.id is null or package_row.opportunity_id<>p_opportunity
       or package_row.property_id<>p_property or package_row.proposal_id is distinct from p_proposal
       or package_row.estimate_run_id is distinct from p_estimate_run then
      raise exception 'proposal version context unavailable' using errcode='23514';
    end if;
  end if;
  if not coalesce(public.crm_proposal_snapshot_v1_valid(p_content_snapshot),false)
     or p_rendered_content is null or octet_length(p_rendered_content) not between 1 and 1048576 then
    raise exception 'proposal version content unavailable' using errcode='23514';
  end if;
  if p_content_snapshot->>'schemaVersion'<>p_schema_version
     or p_content_snapshot#>>'{provenance,proposalId}'<>p_proposal::text
     or p_content_snapshot#>>'{provenance,opportunityId}'<>p_opportunity::text
     or p_content_snapshot#>>'{provenance,propertyId}'<>p_property::text
     or p_content_snapshot#>>'{provenance,estimateRunId}'<>p_estimate_run::text
     or (p_content_snapshot#>>'{provenance,workPackageId}') is distinct from
       (case when p_package is null then null else p_package::text end)
     or (p_content_snapshot#>>'{pricing,amountMinor}')::bigint<>estimate_row.selected_amount_minor
     or p_content_snapshot#>>'{pricing,currency}'<>estimate_row.currency
     or p_content_snapshot#>>'{pricing,basis}'<>estimate_row.pricing_basis then
    raise exception 'proposal version content unavailable' using errcode='23514';
  end if;
  content_hash:=public.crm_estimate_sha256(p_content_snapshot);
  rendered_hash:=public.crm_proposal_sha256(p_rendered_content);
  payload_hash:=public.crm_estimate_sha256(jsonb_build_object(
    'proposal',p_proposal,'opportunity',p_opportunity,'package',p_package,
    'property',p_property,'estimate_run',p_estimate_run,'schema_version',p_schema_version,
    'content_sha256',content_hash,'rendered_sha256',rendered_hash,
    'expected_package_updated_at_epoch',case when p_expected_package_updated_at is null then null
      else extract(epoch from p_expected_package_updated_at) end));
  select c.* into existing from public.crm_proposal_version_commands c
    where c.organization_id=p_organization and c.command_key=p_request_key;
  if existing.id is not null then
    if existing.payload_sha256<>payload_hash then
      raise exception 'proposal version key already used' using errcode='23514';
    end if;
    select v.* into existing_version from public.crm_proposal_versions v
      where v.organization_id=p_organization and v.id=existing.proposal_version_id;
    return query select existing_version.id,existing_version.version_number,
      existing.resulting_package_updated_at,true;
    return;
  end if;
  if exists(select 1 from public.crm_pipeline_stages s
      where s.organization_id=p_organization and s.id=opportunity_row.stage_id
        and s.category in ('won','lost','disqualified','handed_off')) then
    raise exception 'closed opportunity cannot publish a proposal version' using errcode='23514';
  end if;
  if p_package is not null and (package_row.status<>'estimated'
     or p_expected_package_updated_at is null
     or package_row.updated_at is distinct from p_expected_package_updated_at) then
    raise exception 'site work package changed' using errcode='40001';
  end if;
  select coalesce(max(v.version_number),0)+1 into next_number
    from public.crm_proposal_versions v
    where v.organization_id=p_organization and v.proposal_id=p_proposal;
  insert into public.crm_proposal_versions(id,organization_id,proposal_id,opportunity_id,
    property_id,work_package_id,estimate_run_id,version_number,request_key,content_snapshot,
    rendered_content,display_amount_minor,currency,pricing_basis,content_sha256,rendered_sha256,
    estimate_input_sha256,estimate_output_sha256,schema_version,created_by)
  values(new_version_id,p_organization,p_proposal,p_opportunity,p_property,p_package,
    p_estimate_run,next_number,p_request_key,p_content_snapshot,p_rendered_content,
    estimate_row.selected_amount_minor,estimate_row.currency,estimate_row.pricing_basis,
    content_hash,rendered_hash,estimate_row.input_sha256,estimate_row.output_sha256,
    p_schema_version,p_actor);
  if p_package is not null then
    changed_at:=clock_timestamp();
    update public.crm_site_work_packages set proposal_version_id=new_version_id,
      updated_by=p_actor,updated_at=changed_at
    where organization_id=p_organization and id=p_package;
  end if;
  insert into public.crm_proposal_version_commands(organization_id,proposal_version_id,
    command_key,payload_sha256,resulting_package_updated_at,actor_user_id)
  values(p_organization,new_version_id,p_request_key,payload_hash,changed_at,p_actor);
  insert into public.organization_audit_log(organization_id,actor_user_id,action,
    entity_type,entity_id,metadata)
  values(p_organization,p_actor,'crm_proposal_versions.insert','crm_proposal_versions',
    new_version_id::text,jsonb_build_object('operation','INSERT'));
  insert into public.organization_event_outbox(organization_id,event_type,aggregate_type,
    aggregate_id,payload)
  values(p_organization,'proposal.version_prepared','crm_proposal_versions',
    new_version_id::text,jsonb_build_object('record_id',new_version_id::text));
  return query select new_version_id,next_number,changed_at,false;
end;
$$;
revoke all on function public.command_crm_publish_proposal_version_internal(
  uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.command_crm_publish_proposal_version_internal(
  uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamptz
) to service_role;

create function public.read_crm_proposal_versions(p_organization uuid,p_opportunity uuid)
returns table(id uuid,proposal_id uuid,work_package_id uuid,estimate_run_id uuid,
  version_number integer,display_amount_minor bigint,currency text,pricing_basis text,
  content_sha256 text,rendered_sha256 text,schema_version text,created_at timestamptz)
language sql stable security definer set search_path=pg_catalog,public as $$
  select v.id,v.proposal_id,v.work_package_id,v.estimate_run_id,v.version_number,
    v.display_amount_minor,v.currency,v.pricing_basis,v.content_sha256,v.rendered_sha256,
    v.schema_version,v.created_at
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

commit;
