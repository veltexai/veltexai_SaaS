\set ON_ERROR_STOP on

alter table public.profiles disable trigger profiles_protect_entitlements;
insert into auth.users(id,email) values
  ('11111111-1111-4111-8111-111111111111','r341-owner@example.test'),
  ('94444444-4444-4444-8444-444444444444','r341-estimator@example.test'),
  ('95555555-5555-4555-8555-555555555555','r341-viewer@example.test')
on conflict(id) do nothing;
alter table public.profiles enable trigger profiles_protect_entitlements;

begin;

alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.organization_memberships(organization_id,user_id,role)
select p.active_organization_id,v.user_id,v.role
from public.profiles p cross join (values
  ('94444444-4444-4444-8444-444444444444'::uuid,'estimator'::text),
  ('95555555-5555-4555-8555-555555555555'::uuid,'viewer'::text)
) v(user_id,role)
where p.id='11111111-1111-4111-8111-111111111111';
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
select '93000000-0000-4000-8000-000000000001',active_organization_id,
  'household','R3-4.1 customer',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,address_line_1,city,region,postal_code,created_by)
select '93000000-0000-4000-8000-000000000002',active_organization_id,
  '93000000-0000-4000-8000-000000000001','R3-4.1 property','41 Package Way',
  'Test City','CA','90000',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '93000000-0000-4000-8000-000000000003',p.organization_id,
  '93000000-0000-4000-8000-000000000001',p.id,s.id,'93000000-0000-4000-8000-000000000002',
  'r341-fixture-opportunity','R3-4.1 opportunity','11111111-1111-4111-8111-111111111111',
  '94444444-4444-4444-8444-444444444444','residential','manual',
  '11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='residential_turnover_v1' order by s.position limit 1;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,service_scope,crm_opportunity_id,crm_customer_id,crm_property_id)
select '93000000-0000-4000-8000-000000000004',active_organization_id,id,
  'R3-4.1 package-set proposal','Package Customer','package-customer@example.test',
  '555-0141','41 Package Way',1000,'residential','weekly','Rendered working copy',
  '{"areas_included":["Kitchen","Bathrooms"]}'::jsonb,
  '93000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000002'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,
  proposal_id,idempotency_key,created_by)
select package_id,active_organization_id,'93000000-0000-4000-8000-000000000003',
  '93000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000004',
  command_key,id
from public.profiles cross join (values
  ('93000000-0000-4000-8000-000000000005'::uuid,'r341-fixture-package-a'::text),
  ('93000000-0000-4000-8000-000000000006'::uuid,'r341-fixture-package-b'::text)
) fixture(package_id,command_key)
where id='11111111-1111-4111-8111-111111111111';
select set_config('r341.org',(select active_organization_id::text from public.profiles
  where id='11111111-1111-4111-8111-111111111111'),true);

create function pg_temp.r341_version_valid(p_version uuid,p_ids uuid[],p_rendered text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
  select exists(select 1 from public.crm_proposal_versions v
      where v.id=p_version and v.schema_version='crm_proposal_version.v2'
        and v.package_count=2 and v.display_amount_minor=32500 and v.pricing_basis is null
        and v.rendered_content=p_rendered)
    and (select count(*) from public.crm_proposal_version_packages a
      where a.proposal_version_id=p_version)=2
    and (select sum(amount_minor) from public.crm_proposal_version_packages a
      where a.proposal_version_id=p_version)=32500
    and not exists(select 1 from unnest(p_ids) id where not exists(
      select 1 from public.crm_site_work_packages p
      where p.id=id and p.proposal_version_id=p_version));
$$;
revoke all on function pg_temp.r341_version_valid(uuid,uuid[],text) from public;
grant execute on function pg_temp.r341_version_valid(uuid,uuid[],text) to service_role;

set local role service_role;
do $$
declare org uuid:=current_setting('r341.org')::uuid; token timestamptz;
  estimate_result record; package_id uuid; command_key text; amount bigint; price numeric;
  input jsonb:='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'::jsonb;
  output jsonb;
begin
  for package_id,command_key,amount,price in select * from (values
    ('93000000-0000-4000-8000-000000000005'::uuid,'r341-estimate-a'::text,12500::bigint,125::numeric),
    ('93000000-0000-4000-8000-000000000006'::uuid,'r341-estimate-b'::text,20000::bigint,200::numeric)
  ) fixture loop
    output:=jsonb_build_object('version','2026-09-22.2','unit','per_visit',
      'low',jsonb_build_object('suggestedPrice',price-25),
      'base',jsonb_build_object('suggestedPrice',price),
      'high',jsonb_build_object('suggestedPrice',price+25));
    select updated_at into token from public.crm_site_work_packages where id=package_id;
    select * into estimate_result from public.command_crm_estimate_run_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '93000000-0000-4000-8000-000000000003',package_id,
      '93000000-0000-4000-8000-000000000002',command_key,'service_catalog',
      '2026-09-22.2',input,output,'base',amount,'USD','per_visit',token);
  end loop;
end $$;

do $$
declare org uuid:=current_setting('r341.org')::uuid;
  ids uuid[]:=array['93000000-0000-4000-8000-000000000005'::uuid,
    '93000000-0000-4000-8000-000000000006'::uuid];
  tokens timestamptz[]; result record; replay_result record; err text; preview jsonb;
begin
  select array_agg(updated_at order by ordinality) into tokens
  from unnest(ids) with ordinality requested(id,ordinality)
  join public.crm_site_work_packages p on p.organization_id=org and p.id=requested.id;
  preview:=public.read_crm_proposal_package_set_preview_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',ids);
  if preview->>'amount_minor'<>'32500' or jsonb_array_length(preview->'packages')<>2
     or preview->>'rendered_content' not like '%Offered total: USD 325.00%'
     or preview->'packages'->0->>'expected_package_updated_at' is null then
    raise exception 'caller-bound package-set preview failed';
  end if;
  select * into result from public.command_crm_publish_proposal_package_set_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',ids,tokens,'r341-publish-owner-0001');
  if result.replayed or result.version_number<>1 or jsonb_array_length(result.package_updated_ats)<>2 then
    raise exception 'owner package-set publish failed';
  end if;
  if not pg_temp.r341_version_valid(result.proposal_version_id,ids,
      preview->>'rendered_content') then
    raise exception 'package-set parent/association/pointer correspondence failed';
  end if;
  select * into replay_result from public.command_crm_publish_proposal_package_set_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
    '93000000-0000-4000-8000-000000000002',ids,tokens,'r341-publish-owner-0001');
  if not replay_result.replayed or replay_result.proposal_version_id<>result.proposal_version_id then
    raise exception 'exact package-set replay failed';
  end if;
  begin
    perform public.read_crm_proposal_package_set_preview_internal(
      '95555555-5555-4555-8555-555555555555',org,
      '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000002',ids);
    raise exception 'viewer package-set preview accepted';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal package set unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_package_set_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000002',array[ids[2],ids[1]],
      array[tokens[2],tokens[1]],'r341-publish-owner-0001');
    raise exception 'changed-order replay accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version key already used' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_package_set_internal(
      '95555555-5555-4555-8555-555555555555',org,
      '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000002',ids,tokens,'r341-viewer-0002');
    raise exception 'viewer package-set publish accepted';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal package set unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_package_set_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000003',
      '93000000-0000-4000-8000-000000000002',ids,tokens,'r341-stale-token-0003');
    raise exception 'stale package-set tokens accepted';
  exception when serialization_failure then null; end;
end $$;

reset role;
do $$
begin
  begin
    update public.crm_proposal_version_packages set customer_visible_title='Changed';
    raise exception 'immutable package association update accepted';
  exception when others then
    if sqlstate not in ('42501','55000') then raise; end if;
  end;
  begin
    delete from public.crm_proposal_version_packages;
    raise exception 'immutable package association delete accepted';
  exception when others then
    if sqlstate not in ('42501','55000') then raise; end if;
  end;
end $$;

select 'R3_4_1_ADVERSARIAL_ROLE_MATRIX_PASS';
rollback;
