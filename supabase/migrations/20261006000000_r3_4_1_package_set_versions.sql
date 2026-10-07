begin;

-- R3-4.1 is additive. The accepted R3-4 migration remains byte-for-byte
-- frozen; this migration only introduces the v2 parent shape and its
-- append-only ordered package associations.
alter table public.crm_proposal_versions
  alter column estimate_run_id drop not null,
  alter column pricing_basis drop not null,
  add column package_count integer,
  add column package_set_sha256 text;

alter table public.crm_proposal_versions
  drop constraint crm_proposal_versions_schema_version_check;
alter table public.crm_proposal_versions
  add constraint crm_proposal_versions_schema_shape_check check (
    (
      schema_version='crm_proposal_version.v1'
      and estimate_run_id is not null
      and pricing_basis is not null
      and package_count is null
      and package_set_sha256 is null
    )
    or
    (
      schema_version='crm_proposal_version.v2'
      and work_package_id is null
      and estimate_run_id is null
      and pricing_basis is null
      and package_count>0
      and package_set_sha256 ~ '^[a-f0-9]{64}$'
    )
  );

alter table public.crm_proposal_versions
  add constraint crm_proposal_versions_v2_context_unique
  unique(organization_id,id,opportunity_id,property_id);

create function public.crm_proposal_scope_lines_valid(value jsonb)
returns boolean language sql immutable security definer
set search_path=pg_catalog,public as $$
  select jsonb_typeof(value)='array'
    and not exists(
      select 1 from jsonb_array_elements(
        case when jsonb_typeof(value)='array' then value else '[]'::jsonb end
      ) item
      where jsonb_typeof(item)<>'string'
        or length(trim(item#>>'{}')) not between 1 and 1000
    )
    and jsonb_array_length(
      case when jsonb_typeof(value)='array' then value else '[]'::jsonb end
    ) between 1 and 500;
$$;
revoke all on function public.crm_proposal_scope_lines_valid(jsonb)
  from public,anon,authenticated,service_role;

create table public.crm_proposal_version_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  opportunity_id uuid not null,
  property_id uuid not null,
  work_package_id uuid not null,
  estimate_run_id uuid not null,
  display_position integer not null check(display_position>0),
  customer_visible_title text not null
    check(length(trim(customer_visible_title)) between 1 and 240),
  customer_visible_scope jsonb not null
    check(public.crm_proposal_scope_lines_valid(customer_visible_scope)),
  amount_minor bigint not null check(amount_minor>=0),
  currency text not null check(currency='USD'),
  pricing_basis text not null
    check(pricing_basis in ('per_visit','per_turn','one_time')),
  estimate_input_sha256 text not null check(estimate_input_sha256 ~ '^[a-f0-9]{64}$'),
  estimate_output_sha256 text not null check(estimate_output_sha256 ~ '^[a-f0-9]{64}$'),
  scope_sha256 text not null check(scope_sha256 ~ '^[a-f0-9]{64}$'),
  association_sha256 text not null check(association_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,proposal_version_id,display_position),
  unique(organization_id,proposal_version_id,work_package_id),
  foreign key(organization_id,proposal_version_id,opportunity_id,property_id)
    references public.crm_proposal_versions(
      organization_id,id,opportunity_id,property_id
    ) on delete restrict,
  foreign key(organization_id,work_package_id)
    references public.crm_site_work_packages(organization_id,id) on delete restrict,
  foreign key(organization_id,work_package_id,opportunity_id,property_id,estimate_run_id)
    references public.crm_estimate_runs(
      organization_id,work_package_id,opportunity_id,property_id,id
    ) on delete restrict
);

create index crm_proposal_version_packages_context_idx
  on public.crm_proposal_version_packages(
    organization_id,proposal_version_id,display_position
  );

alter table public.crm_proposal_version_packages enable row level security;
revoke all on public.crm_proposal_version_packages
  from public,anon,authenticated,service_role;

create trigger guard_crm_proposal_version_package_immutable
  before update or delete on public.crm_proposal_version_packages
  for each row execute function public.guard_crm_proposal_version_immutable();
create trigger guard_crm_proposal_version_package_truncate
  before truncate on public.crm_proposal_version_packages
  for each statement execute function public.guard_crm_proposal_version_immutable();

-- Preserve the accepted v1 pointer guarantee while allowing a v2 parent to
-- represent an ordered set. The association must exist before a pointer can
-- move, so setting the private command GUC never bypasses relational binding.
create function public.guard_crm_package_proposal_version_binding()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  if new.proposal_version_id is null then return new; end if;
  if not exists(
    select 1 from public.crm_proposal_versions v
    where v.organization_id=new.organization_id and v.id=new.proposal_version_id
      and (
        (v.schema_version='crm_proposal_version.v1' and v.work_package_id=new.id)
        or
        (v.schema_version='crm_proposal_version.v2' and exists(
          select 1 from public.crm_proposal_version_packages a
          where a.organization_id=new.organization_id
            and a.proposal_version_id=v.id and a.work_package_id=new.id
        ))
      )
  ) then
    raise exception 'proposal version pointer is not bound to package'
      using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_crm_package_proposal_version_binding()
  from public,anon,authenticated,service_role;
create trigger guard_crm_package_proposal_version_binding
  before insert or update of proposal_version_id on public.crm_site_work_packages
  for each row execute function public.guard_crm_package_proposal_version_binding();

-- A deferred assertion sees the complete atomic statement/transaction rather
-- than a partially inserted set. It protects the parent count/amount and every
-- association-to-pointer correspondence even for privileged direct SQL.
create function public.assert_crm_proposal_package_set_consistent()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare version_id uuid; org_id uuid;
  parent public.crm_proposal_versions%rowtype;
begin
  if tg_table_name='crm_proposal_versions' then
    version_id:=new.id; org_id:=new.organization_id;
  elsif tg_op='DELETE' then
    version_id:=old.proposal_version_id; org_id:=old.organization_id;
  else
    version_id:=new.proposal_version_id; org_id:=new.organization_id;
  end if;
  select v.* into parent from public.crm_proposal_versions v
    where v.organization_id=org_id and v.id=version_id;
  if parent.id is null or parent.schema_version<>'crm_proposal_version.v2' then
    return coalesce(new,old);
  end if;
  if (select count(*) from public.crm_proposal_version_packages a
      where a.organization_id=org_id and a.proposal_version_id=version_id)
       <>parent.package_count
     or (select coalesce(sum(a.amount_minor),0)
         from public.crm_proposal_version_packages a
         where a.organization_id=org_id and a.proposal_version_id=version_id)
       <>parent.display_amount_minor
     or exists(
       select 1 from public.crm_proposal_version_packages a
       left join public.crm_site_work_packages p
         on p.organization_id=a.organization_id and p.id=a.work_package_id
       where a.organization_id=org_id and a.proposal_version_id=version_id
         and p.proposal_version_id is distinct from version_id
     ) then
    raise exception 'proposal package set invariant failed' using errcode='23514';
  end if;
  return coalesce(new,old);
end;
$$;
revoke all on function public.assert_crm_proposal_package_set_consistent()
  from public,anon,authenticated,service_role;
create constraint trigger assert_crm_proposal_package_set_parent
  after insert on public.crm_proposal_versions deferrable initially deferred
  for each row execute function public.assert_crm_proposal_package_set_consistent();
create constraint trigger assert_crm_proposal_package_set_association
  after insert or update or delete on public.crm_proposal_version_packages
  deferrable initially deferred for each row
  execute function public.assert_crm_proposal_package_set_consistent();

-- A v2 parent intentionally represents more than one package. Replace the v1
-- package-shaped pointer FK with an organization/version FK; the command below
-- creates every association before moving package pointers atomically.
alter table public.crm_site_work_packages
  drop constraint crm_site_work_packages_proposal_version_fk;
alter table public.crm_site_work_packages
  add constraint crm_site_work_packages_proposal_version_fk
  foreign key(organization_id,proposal_version_id)
  references public.crm_proposal_versions(organization_id,id)
  on delete restrict;

alter table public.crm_proposal_version_commands
  add column resulting_package_updated_ats jsonb;

-- Read-only, caller-bound preview. It deliberately accepts package identities
-- only and derives every customer-visible field from current database state.
create function public.read_crm_proposal_package_set_preview_internal(
  p_actor uuid,p_organization uuid,p_proposal uuid,p_opportunity uuid,
  p_property uuid,p_package_ids uuid[]
)
returns jsonb language plpgsql security definer
set search_path=pg_catalog,public as $$
declare opportunity_row public.crm_opportunities%rowtype;
  proposal_row public.proposals%rowtype;
  package_row public.crm_site_work_packages%rowtype;
  estimate_row public.crm_estimate_runs%rowtype;
  actor_role text; item_count integer; i integer;
  scope_lines jsonb; package_title text; basis_count integer;
  package_items jsonb:='[]'::jsonb; rendered_packages text:='';
  total_amount bigint:=0;
begin
  item_count:=coalesce(cardinality(p_package_ids),0);
  if p_actor is null or item_count<1 or item_count>100
     or exists(select 1 from unnest(p_package_ids) id group by id having count(*)>1)
     or exists(select 1 from unnest(p_package_ids) id where id is null) then
    raise exception 'proposal package set unavailable' using errcode='42501';
  end if;
  select m.role into actor_role from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_actor;
  select o.* into opportunity_row from public.crm_opportunities o
    where o.organization_id=p_organization and o.id=p_opportunity
      and o.deleted_at is null;
  if opportunity_row.id is null or not coalesce(actor_role in ('owner','admin')
    or (actor_role='estimator' and opportunity_row.estimator_user_id=p_actor),false) then
    raise exception 'proposal package set unavailable' using errcode='42501';
  end if;
  select p.* into proposal_row from public.proposals p
    where p.organization_id=p_organization and p.id=p_proposal;
  if proposal_row.id is null or proposal_row.crm_opportunity_id is distinct from p_opportunity
     or proposal_row.crm_customer_id is distinct from opportunity_row.customer_id
     or proposal_row.crm_property_id is distinct from p_property
     or opportunity_row.property_id is distinct from p_property then
    raise exception 'proposal package set context unavailable' using errcode='23514';
  end if;
  if exists(select 1 from public.crm_pipeline_stages s
      where s.organization_id=p_organization and s.id=opportunity_row.stage_id
        and s.category in ('won','lost','disqualified','handed_off')) then
    raise exception 'closed opportunity cannot preview a proposal package set' using errcode='23514';
  end if;
  select count(distinct e.pricing_basis) into basis_count
  from public.crm_site_work_packages p join public.crm_estimate_runs e
    on e.organization_id=p.organization_id and e.id=p.estimate_run_id
  where p.organization_id=p_organization and p.id=any(p_package_ids);
  if basis_count<>1 then
    raise exception 'proposal package set pricing basis must match' using errcode='23514';
  end if;
  for i in 1..item_count loop
    select p.* into package_row from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=p_package_ids[i];
    select e.* into estimate_row from public.crm_estimate_runs e
      where e.organization_id=p_organization and e.id=package_row.estimate_run_id;
    if package_row.id is null or package_row.opportunity_id<>p_opportunity
       or package_row.property_id<>p_property or package_row.proposal_id is distinct from p_proposal
       or package_row.status<>'estimated' or package_row.estimate_run_id is null
       or estimate_row.id is null or estimate_row.opportunity_id<>p_opportunity
       or estimate_row.property_id<>p_property
       or estimate_row.work_package_id is distinct from package_row.id then
      raise exception 'proposal package set context unavailable' using errcode='23514';
    end if;
    package_title:=proposal_row.title||' — '
      ||initcap(replace(left(estimate_row.input_snapshot->>'jobType',80),'_',' '))
      ||' — '||initcap(replace(left(estimate_row.input_snapshot->>'frequency',80),'-',' '));
    scope_lines:=jsonb_build_array(
      'Service: '||replace(estimate_row.input_snapshot->>'jobType','_',' '),
      'Frequency: '||replace(estimate_row.input_snapshot->>'frequency','-',' ')
    )||case
      when jsonb_typeof(proposal_row.service_scope->'areas_included')='array'
        and jsonb_array_length(proposal_row.service_scope->'areas_included')>0
      then proposal_row.service_scope->'areas_included'
      else '[]'::jsonb end;
    if not public.crm_proposal_scope_lines_valid(scope_lines) then
      raise exception 'proposal package set content unavailable' using errcode='23514';
    end if;
    package_items:=package_items||jsonb_build_array(jsonb_build_object(
      'display_position',i,'work_package_id',package_row.id,
      'expected_package_updated_at',package_row.updated_at,'title',package_title,
      'scope_lines',scope_lines,'amount_minor',estimate_row.selected_amount_minor,
      'currency',estimate_row.currency,'pricing_basis',estimate_row.pricing_basis));
    total_amount:=total_amount+estimate_row.selected_amount_minor;
    rendered_packages:=rendered_packages||case when i=1 then '' else E'\n\n' end
      ||'## '||package_title||E'\n'
      ||coalesce((select string_agg('- '||(line#>>'{}'),E'\n' order by ordinality)
          from jsonb_array_elements(scope_lines) with ordinality listed(line,ordinality)),
        '- Scope to be confirmed')||E'\n'
      ||'Price: '||estimate_row.currency||' '
      ||to_char(estimate_row.selected_amount_minor/100.0,'FM999999999999990.00')||' '
      ||replace(estimate_row.pricing_basis,'_',' ');
  end loop;
  return jsonb_build_object(
    'packages',package_items,'amount_minor',total_amount,'currency','USD',
    'rendered_content','# '||proposal_row.title||E'\n\nPrepared for: '
      ||proposal_row.client_name||E'\nService location: '||proposal_row.service_location
      ||E'\n\n'||rendered_packages||E'\n\nOffered total ('
      ||replace((package_items->0->>'pricing_basis'),'_',' ')||'): USD '
      ||to_char(total_amount/100.0,'FM999999999999990.00'));
end;
$$;
revoke all on function public.read_crm_proposal_package_set_preview_internal(
  uuid,uuid,uuid,uuid,uuid,uuid[]
) from public,anon,authenticated;
grant execute on function public.read_crm_proposal_package_set_preview_internal(
  uuid,uuid,uuid,uuid,uuid,uuid[]
) to service_role;

create function public.command_crm_publish_proposal_package_set_internal(
  p_actor uuid,p_organization uuid,p_proposal uuid,p_opportunity uuid,p_property uuid,
  p_package_ids uuid[],p_expected_package_updated_ats timestamptz[],p_request_key text
)
returns table(proposal_version_id uuid,version_number integer,
  package_updated_ats jsonb,replayed boolean)
language plpgsql security definer set search_path=pg_catalog,public as $$
declare opportunity_row public.crm_opportunities%rowtype;
  proposal_row public.proposals%rowtype;
  package_row public.crm_site_work_packages%rowtype;
  estimate_row public.crm_estimate_runs%rowtype;
  existing public.crm_proposal_version_commands%rowtype;
  existing_version public.crm_proposal_versions%rowtype;
  actor_role text; request_seed_hash text; payload_hash text;
  content_hash text; rendered_hash text; package_set_hash text;
  package_items jsonb:='[]'::jsonb; association_items jsonb:='[]'::jsonb;
  scope_lines jsonb; scope_hash text; association_hash text; package_title text;
  common_basis text; basis_count integer;
  snapshot jsonb; rendered text; rendered_packages text:='';
  total_amount bigint:=0; next_number integer; item_count integer;
  new_version_id uuid:=gen_random_uuid(); changed_at timestamptz;
  result_tokens jsonb:='[]'::jsonb; i integer;
begin
  item_count:=coalesce(cardinality(p_package_ids),0);
  if p_actor is null or length(p_request_key) not between 8 and 200
     or item_count<1 or item_count>100
     or cardinality(p_expected_package_updated_ats)<>item_count
     or exists(select 1 from unnest(p_package_ids) id group by id having count(*)>1)
     or exists(select 1 from unnest(p_package_ids) id where id is null)
     or exists(select 1 from unnest(p_expected_package_updated_ats) token where token is null) then
    raise exception 'proposal package set unavailable' using errcode='42501';
  end if;

  select m.role into actor_role from public.organization_memberships m
    where m.organization_id=p_organization and m.user_id=p_actor;
  select o.* into opportunity_row from public.crm_opportunities o
    where o.organization_id=p_organization and o.id=p_opportunity
      and o.deleted_at is null for update;
  if opportunity_row.id is null or not coalesce(actor_role in ('owner','admin')
    or (actor_role='estimator' and opportunity_row.estimator_user_id=p_actor),false) then
    raise exception 'proposal package set unavailable' using errcode='42501';
  end if;

  request_seed_hash:=public.crm_estimate_sha256(jsonb_build_object(
    'actor',p_actor,'organization',p_organization,'proposal',p_proposal,
    'opportunity',p_opportunity,'property',p_property,
    'package_ids',to_jsonb(p_package_ids),
    'expected_package_updated_ats',(
      select jsonb_agg(extract(epoch from token)::numeric order by ordinality)
      from unnest(p_expected_package_updated_ats) with ordinality expected(token,ordinality)
    ),
    'schema_version','crm_proposal_version.v2',
    'renderer_version','release1-markdown.v2'));

  select c.* into existing from public.crm_proposal_version_commands c
    where c.organization_id=p_organization and c.command_key=p_request_key;
  if existing.id is not null then
    select v.* into existing_version from public.crm_proposal_versions v
      where v.organization_id=p_organization and v.id=existing.proposal_version_id;
    payload_hash:=public.crm_estimate_sha256(jsonb_build_object(
      'request_seed_sha256',request_seed_hash,
      'content_sha256',existing_version.content_sha256,
      'rendered_sha256',existing_version.rendered_sha256,
      'package_set_sha256',existing_version.package_set_sha256));
    if existing_version.schema_version<>'crm_proposal_version.v2'
       or existing.payload_sha256<>payload_hash then
      raise exception 'proposal version key already used' using errcode='23514';
    end if;
    return query select existing_version.id,existing_version.version_number,
      existing.resulting_package_updated_ats,true;
    return;
  end if;

  select p.* into proposal_row from public.proposals p
    where p.organization_id=p_organization and p.id=p_proposal for update;
  if proposal_row.id is null or proposal_row.crm_opportunity_id is distinct from p_opportunity
     or proposal_row.crm_customer_id is distinct from opportunity_row.customer_id
     or proposal_row.crm_property_id is distinct from p_property
     or opportunity_row.property_id is distinct from p_property then
    raise exception 'proposal package set context unavailable' using errcode='23514';
  end if;
  if exists(select 1 from public.crm_pipeline_stages s
      where s.organization_id=p_organization and s.id=opportunity_row.stage_id
        and s.category in ('won','lost','disqualified','handed_off')) then
    raise exception 'closed opportunity cannot publish a proposal package set' using errcode='23514';
  end if;

  -- Lock in UUID order, independent of customer-visible display order.
  perform 1 from public.crm_site_work_packages p
    where p.organization_id=p_organization and p.id=any(p_package_ids)
    order by p.id for update;
  if (select count(*) from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=any(p_package_ids))<>item_count then
    raise exception 'proposal package set context unavailable' using errcode='23514';
  end if;
  select count(distinct e.pricing_basis),min(e.pricing_basis)
    into basis_count,common_basis
  from public.crm_site_work_packages p join public.crm_estimate_runs e
    on e.organization_id=p.organization_id and e.id=p.estimate_run_id
  where p.organization_id=p_organization and p.id=any(p_package_ids);
  if basis_count<>1 then
    raise exception 'proposal package set pricing basis must match' using errcode='23514';
  end if;

  for i in 1..item_count loop
    select p.* into package_row from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=p_package_ids[i];
    select e.* into estimate_row from public.crm_estimate_runs e
      where e.organization_id=p_organization and e.id=package_row.estimate_run_id;
    if package_row.id is null or package_row.opportunity_id<>p_opportunity
       or package_row.property_id<>p_property or package_row.proposal_id is distinct from p_proposal
       or package_row.status<>'estimated' or package_row.estimate_run_id is null
       or package_row.updated_at is distinct from p_expected_package_updated_ats[i]
       or estimate_row.id is null or estimate_row.opportunity_id<>p_opportunity
       or estimate_row.property_id<>p_property
       or estimate_row.work_package_id is distinct from package_row.id then
      raise exception 'site work package changed' using errcode='40001';
    end if;
    package_title:=proposal_row.title||' — '
      ||initcap(replace(left(estimate_row.input_snapshot->>'jobType',80),'_',' '))
      ||' — '||initcap(replace(left(estimate_row.input_snapshot->>'frequency',80),'-',' '));
    scope_lines:=jsonb_build_array(
      'Service: '||replace(estimate_row.input_snapshot->>'jobType','_',' '),
      'Frequency: '||replace(estimate_row.input_snapshot->>'frequency','-',' ')
    )||case
      when jsonb_typeof(proposal_row.service_scope->'areas_included')='array'
        and jsonb_array_length(proposal_row.service_scope->'areas_included')>0
      then proposal_row.service_scope->'areas_included'
      else '[]'::jsonb end;
    if not public.crm_proposal_scope_lines_valid(scope_lines) then
      raise exception 'proposal package set content unavailable' using errcode='23514';
    end if;
    scope_hash:=public.crm_estimate_sha256(scope_lines);
    association_hash:=public.crm_estimate_sha256(jsonb_build_object(
      'display_position',i,'work_package_id',package_row.id,
      'estimate_run_id',estimate_row.id,'title',package_title,
      'scope_sha256',scope_hash,'amount_minor',estimate_row.selected_amount_minor,
      'currency',estimate_row.currency,'pricing_basis',estimate_row.pricing_basis,
      'estimate_input_sha256',estimate_row.input_sha256,
      'estimate_output_sha256',estimate_row.output_sha256));
    association_items:=association_items||jsonb_build_array(jsonb_build_object(
      'displayPosition',i,'workPackageId',package_row.id,'estimateRunId',estimate_row.id,
      'associationSha256',association_hash));
    package_items:=package_items||jsonb_build_array(jsonb_build_object(
      'displayPosition',i,'workPackageId',package_row.id,'estimateRunId',estimate_row.id,
      'title',package_title,'scopeLines',scope_lines,
      'pricing',jsonb_build_object('amountMinor',estimate_row.selected_amount_minor,
        'currency',estimate_row.currency,'basis',estimate_row.pricing_basis),
      'estimateInputSha256',estimate_row.input_sha256,
      'estimateOutputSha256',estimate_row.output_sha256,
      'scopeSha256',scope_hash,'associationSha256',association_hash));
    total_amount:=total_amount+estimate_row.selected_amount_minor;
    rendered_packages:=rendered_packages||case when i=1 then '' else E'\n\n' end
      ||'## '||package_title||E'\n'
      ||coalesce((select string_agg('- '||(line#>>'{}'),E'\n' order by ordinality)
          from jsonb_array_elements(scope_lines) with ordinality listed(line,ordinality)),
        '- Scope to be confirmed')||E'\n'
      ||'Price: '||estimate_row.currency||' '
      ||to_char(estimate_row.selected_amount_minor/100.0,'FM999999999999990.00')||' '
      ||replace(estimate_row.pricing_basis,'_',' ');
  end loop;

  package_set_hash:=public.crm_estimate_sha256(association_items);
  snapshot:=jsonb_build_object(
    'schemaVersion','crm_proposal_version.v2','title',proposal_row.title,
    'customer',jsonb_build_object('name',proposal_row.client_name),
    'serviceLocation',jsonb_build_object('address',proposal_row.service_location),
    'packages',package_items,
    'pricing',jsonb_build_object('amountMinor',total_amount,'currency','USD'),
    'template',jsonb_build_object('id',coalesce(proposal_row.template_id::text,'default'),
      'rendererVersion','release1-markdown.v2'),
    'provenance',jsonb_build_object('proposalId',p_proposal,'opportunityId',p_opportunity,
      'propertyId',p_property,'packageSetSha256',package_set_hash));
  rendered:='# '||proposal_row.title||E'\n\nPrepared for: '||proposal_row.client_name
    ||E'\nService location: '||proposal_row.service_location||E'\n\n'
    ||rendered_packages||E'\n\nOffered total ('||replace(common_basis,'_',' ')||'): USD '
    ||to_char(total_amount/100.0,'FM999999999999990.00');
  content_hash:=public.crm_estimate_sha256(snapshot);
  rendered_hash:=public.crm_proposal_sha256(rendered);
  payload_hash:=public.crm_estimate_sha256(jsonb_build_object(
    'request_seed_sha256',request_seed_hash,'content_sha256',content_hash,
    'rendered_sha256',rendered_hash,'package_set_sha256',package_set_hash));

  select coalesce(max(v.version_number),0)+1 into next_number
    from public.crm_proposal_versions v
    where v.organization_id=p_organization and v.proposal_id=p_proposal;
  insert into public.crm_proposal_versions(id,organization_id,proposal_id,opportunity_id,
    property_id,work_package_id,estimate_run_id,version_number,request_key,content_snapshot,
    rendered_content,display_amount_minor,currency,pricing_basis,content_sha256,rendered_sha256,
    estimate_input_sha256,estimate_output_sha256,schema_version,package_count,
    package_set_sha256,created_by)
  values(new_version_id,p_organization,p_proposal,p_opportunity,p_property,null,null,
    next_number,p_request_key,snapshot,rendered,total_amount,'USD',null,content_hash,
    rendered_hash,public.crm_estimate_sha256(jsonb_build_object('packages',package_items)),
    public.crm_estimate_sha256(jsonb_build_object('packages',association_items)),
    'crm_proposal_version.v2',item_count,package_set_hash,p_actor);

  for i in 1..item_count loop
    select p.* into package_row from public.crm_site_work_packages p
      where p.organization_id=p_organization and p.id=p_package_ids[i];
    select e.* into estimate_row from public.crm_estimate_runs e
      where e.organization_id=p_organization and e.id=package_row.estimate_run_id;
    insert into public.crm_proposal_version_packages(
      organization_id,proposal_version_id,opportunity_id,property_id,work_package_id,
      estimate_run_id,display_position,customer_visible_title,customer_visible_scope,
      amount_minor,currency,pricing_basis,estimate_input_sha256,estimate_output_sha256,
      scope_sha256,association_sha256)
    values(p_organization,new_version_id,p_opportunity,p_property,package_row.id,
      estimate_row.id,i,package_items->(i-1)->>'title',package_items->(i-1)->'scopeLines',
      estimate_row.selected_amount_minor,estimate_row.currency,estimate_row.pricing_basis,
      estimate_row.input_sha256,estimate_row.output_sha256,scope_hash,
      package_items->(i-1)->>'associationSha256');
  end loop;

  changed_at:=clock_timestamp();
  perform set_config('veltex.proposal_version_command','1',true);
  update public.crm_site_work_packages set proposal_version_id=new_version_id,
    updated_by=p_actor,updated_at=changed_at
  where organization_id=p_organization and id=any(p_package_ids);
  perform set_config('veltex.proposal_version_command','',true);
  select coalesce(jsonb_agg(jsonb_build_object('workPackageId',p.id,
      'updatedAt',p.updated_at) order by position), '[]'::jsonb)
    into result_tokens
  from unnest(p_package_ids) with ordinality requested(id,position)
  join public.crm_site_work_packages p
    on p.organization_id=p_organization and p.id=requested.id;

  insert into public.crm_proposal_version_commands(organization_id,proposal_version_id,
    command_key,payload_sha256,resulting_package_updated_ats,actor_user_id)
  values(p_organization,new_version_id,p_request_key,payload_hash,result_tokens,p_actor);
  insert into public.organization_audit_log(organization_id,actor_user_id,action,
    entity_type,entity_id,metadata)
  values(p_organization,p_actor,'crm_proposal_versions.insert','crm_proposal_versions',
    new_version_id::text,jsonb_build_object('operation','INSERT','schema_version','v2'));
  insert into public.organization_event_outbox(organization_id,event_type,aggregate_type,
    aggregate_id,payload)
  values(p_organization,'proposal.version_prepared','crm_proposal_versions',
    new_version_id::text,jsonb_build_object('record_id',new_version_id::text));
  return query select new_version_id,next_number,result_tokens,false;
end;
$$;
revoke all on function public.command_crm_publish_proposal_package_set_internal(
  uuid,uuid,uuid,uuid,uuid,uuid[],timestamptz[],text
) from public,anon,authenticated;
grant execute on function public.command_crm_publish_proposal_package_set_internal(
  uuid,uuid,uuid,uuid,uuid,uuid[],timestamptz[],text
) to service_role;

commit;
