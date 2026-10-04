\set ON_ERROR_STOP on
begin;

alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.organization_memberships(organization_id,user_id,role)
select active_organization_id,'75555555-5555-4555-8555-555555555555','estimator'
from public.profiles where id='11111111-1111-4111-8111-111111111111'
on conflict(organization_id,user_id) do update set role=excluded.role;
insert into public.organization_memberships(organization_id,user_id,role)
select active_organization_id,'76666666-6666-4666-8666-666666666666','viewer'
from public.profiles where id='11111111-1111-4111-8111-111111111111'
on conflict(organization_id,user_id) do update set role=excluded.role;
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
select '73000000-0000-4000-8000-000000000001',active_organization_id,'household','Estimate fixture',id
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,created_by)
select '73000000-0000-4000-8000-000000000002',active_organization_id,
  '73000000-0000-4000-8000-000000000001','Estimate property',id
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '73000000-0000-4000-8000-000000000003',p.organization_id,
  '73000000-0000-4000-8000-000000000001',p.id,s.id,'73000000-0000-4000-8000-000000000002',
  'estimate-fixture-opportunity','Estimate opportunity','11111111-1111-4111-8111-111111111111',
  '75555555-5555-4555-8555-555555555555',
  'residential','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='residential_turnover_v1' order by s.position limit 1;
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,
  idempotency_key,created_by)
select '73000000-0000-4000-8000-000000000004',active_organization_id,
  '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000002',
  'estimate-fixture-package',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '73000000-0000-4000-8000-000000000005',p.organization_id,
  '73000000-0000-4000-8000-000000000001',p.id,s.id,'73000000-0000-4000-8000-000000000002',
  'estimate-commercial-opportunity','Commercial estimate fixture','11111111-1111-4111-8111-111111111111',
  '75555555-5555-4555-8555-555555555555','commercial','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='commercial_facility_v1' order by s.position limit 1;
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,idempotency_key,created_by)
select '73000000-0000-4000-8000-000000000006',active_organization_id,
  '73000000-0000-4000-8000-000000000005','73000000-0000-4000-8000-000000000002',
  'estimate-commercial-package',id from public.profiles where id='11111111-1111-4111-8111-111111111111';
select set_config('r3.estimate_org',(select active_organization_id::text from public.profiles
  where id='11111111-1111-4111-8111-111111111111'),true);

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare org uuid; token timestamptz; first_result record; replay_result record;
  input jsonb:='{"catalogVersion":"2026-09-22.2","jobType":"recurring_standard","frequency":"weekly"}'::jsonb;
  output jsonb:='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'::jsonb;
begin
  org:=current_setting('r3.estimate_org')::uuid;
  select updated_at into token from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004';
  select * into first_result from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',token);
  if first_result.replayed or first_result.package_updated_at is null then raise exception 'first estimate failed'; end if;
  if not exists(select 1 from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004'
      and status='estimated' and estimate_run_id=first_result.estimate_run_id
      and updated_at=first_result.package_updated_at) then raise exception 'package estimate pointer mismatch'; end if;
  select * into replay_result from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',token);
  if not replay_result.replayed or replay_result.estimate_run_id<>first_result.estimate_run_id then raise exception 'exact replay failed'; end if;
  begin perform * from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'high',15000,'USD','per_visit',token); raise exception 'changed replay accepted';
  exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0002','service_catalog','2026-09-22.2',
    input,output,'high',15000,'USD','per_visit',token); raise exception 'stale token accepted';
  exception when serialization_failure then null; end;
  begin perform * from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000005','73000000-0000-4000-8000-000000000006',
    '73000000-0000-4000-8000-000000000002','estimate-commercial-blocked','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',
    (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000006'));
    raise exception 'commercial estimate without completed walkthrough accepted';
  exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-engine-blocked','unknown_engine','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'unknown estimate engine accepted'; exception when check_violation then null; end;
  begin insert into public.crm_estimate_runs(organization_id,opportunity_id,property_id,request_key,
    engine_key,engine_version,input_snapshot,output_snapshot,selected_scenario,selected_amount_minor,
    pricing_basis,input_sha256,output_sha256,created_by) values(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000002','direct-denied',
    'service_catalog','2026-09-22.2','{}','{}','base',1,'per_visit',repeat('0',64),repeat('0',64),auth.uid());
    raise exception 'direct estimate insert accepted'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.read_crm_estimate_runs(org,'73000000-0000-4000-8000-000000000003'))<>1
    then raise exception 'owner estimate history unavailable'; end if;
end $$;

select set_config('request.jwt.claim.sub','75555555-5555-4555-8555-555555555555',true);
do $$ declare org uuid; begin
  org:=current_setting('r3.estimate_org')::uuid;
  if (select count(*) from public.read_crm_estimate_runs(org,'73000000-0000-4000-8000-000000000003'))<>1
    then raise exception 'assigned estimator estimate history unavailable'; end if;
  if (select count(*) from public.read_crm_estimate_summaries(org))<>1
    then raise exception 'assigned estimator summary unavailable'; end if;
end $$;

select set_config('request.jwt.claim.sub','76666666-6666-4666-8666-666666666666',true);
do $$ declare org uuid; begin
  org:=current_setting('r3.estimate_org')::uuid;
  if exists(select 1 from public.read_crm_estimate_summaries(org)) then raise exception 'viewer received estimate amount'; end if;
  begin perform * from public.command_crm_estimate_run(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-viewer-denied','service_catalog','2026-09-22.2',
    '{"catalogVersion":"2026-09-22.2","jobType":"recurring_standard","frequency":"weekly"}',
    '{"version":"2026-09-22.2","unit":"per_visit","base":{"suggestedPrice":125}}','base',12500,'USD','per_visit',null);
    raise exception 'viewer estimate accepted'; exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$ begin
  if exists(select 1 from public.organization_event_outbox where event_type='estimate.saved'
    and payload<>jsonb_build_object('record_id',aggregate_id)) then
    raise exception 'estimate outbox leaked snapshot data'; end if;
  if has_function_privilege('service_role','public.command_crm_estimate_run(uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamptz)','execute')
     or has_function_privilege('service_role','public.read_crm_estimate_runs(uuid,uuid)','execute') then
    raise exception 'service role retained unreviewed estimate access'; end if;
end $$;
select 'R3_3_ADVERSARIAL_ROLE_MATRIX_PASS' as result;
rollback;
