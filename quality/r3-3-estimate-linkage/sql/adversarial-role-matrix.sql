\set ON_ERROR_STOP on
begin;

alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.organization_memberships(organization_id,user_id,role)
select active_organization_id,'75555555-5555-4555-8555-555555555555','estimator'
from public.profiles where id='11111111-1111-4111-8111-111111111111'
on conflict(organization_id,user_id) do update set role=excluded.role;
insert into public.organization_memberships(organization_id,user_id,role)
select active_organization_id,'76666666-6666-4666-8666-666666666666','estimator'
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
insert into public.crm_walkthroughs(id,organization_id,opportunity_id,property_id,
  estimator_user_id,idempotency_key,window_start,window_end,timezone,status,created_by,updated_by)
select '73000000-0000-4000-8000-000000000011',active_organization_id,
  '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000002',
  '75555555-5555-4555-8555-555555555555','estimate-evidence-walkthrough',
  '2026-11-06 17:00:00+00','2026-11-06 18:00:00+00','UTC','scheduled',id,id
from public.profiles where id='11111111-1111-4111-8111-111111111111';
update public.crm_site_work_packages
set walkthrough_id='73000000-0000-4000-8000-000000000011'
where id='73000000-0000-4000-8000-000000000004';
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,crm_opportunity_id)
select '73000000-0000-4000-8000-000000000012',active_organization_id,id,
  'Estimate proposal fixture','Synthetic estimate client','estimate-client@example.test',
  '555-0112','Synthetic estimate location',1000,'residential','weekly',
  'Synthetic immutable proposal evidence','73000000-0000-4000-8000-000000000003'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,crm_opportunity_id)
select '73000000-0000-4000-8000-000000000013',active_organization_id,id,
  'Replacement proposal fixture','Synthetic estimate client','estimate-client@example.test',
  '555-0113','Synthetic estimate location',1000,'residential','weekly',
  'Synthetic replacement proposal evidence','73000000-0000-4000-8000-000000000003'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
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
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '73000000-0000-4000-8000-000000000007',p.organization_id,
  '73000000-0000-4000-8000-000000000001',p.id,s.id,'73000000-0000-4000-8000-000000000002',
  'estimate-specialty-opportunity','Specialty estimate fixture','11111111-1111-4111-8111-111111111111',
  '75555555-5555-4555-8555-555555555555','specialty','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='commercial_facility_v1' order by s.position limit 1;
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,idempotency_key,created_by)
select '73000000-0000-4000-8000-000000000008',active_organization_id,
  '73000000-0000-4000-8000-000000000007','73000000-0000-4000-8000-000000000002',
  'estimate-specialty-package',id from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '73000000-0000-4000-8000-000000000009',p.organization_id,
  '73000000-0000-4000-8000-000000000001',p.id,s.id,'73000000-0000-4000-8000-000000000002',
  'estimate-turnover-opportunity','Turnover estimate fixture','11111111-1111-4111-8111-111111111111',
  '75555555-5555-4555-8555-555555555555','turnover','manual','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='residential_turnover_v1' order by s.position limit 1;
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,idempotency_key,created_by)
select '73000000-0000-4000-8000-000000000010',active_organization_id,
  '73000000-0000-4000-8000-000000000009','73000000-0000-4000-8000-000000000002',
  'estimate-turnover-package',id from public.profiles where id='11111111-1111-4111-8111-111111111111';
select set_config('r3.estimate_org',(select active_organization_id::text from public.profiles
  where id='11111111-1111-4111-8111-111111111111'),true);

set local role service_role;
do $$
declare org uuid; token timestamptz; first_result record; replay_result record;
  input jsonb:='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'::jsonb;
  output jsonb:='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'::jsonb;
begin
  org:=current_setting('r3.estimate_org')::uuid;
  select updated_at into token from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004';
  perform set_config('r3.initial_package_token',token::text,true);
  select * into first_result from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',token);
  if first_result.replayed or first_result.package_updated_at is null then raise exception 'first estimate failed'; end if;
  if not exists(select 1 from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004'
      and status='estimated' and estimate_run_id=first_result.estimate_run_id
      and updated_at=first_result.package_updated_at) then raise exception 'package estimate pointer mismatch'; end if;
  select * into replay_result from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',token);
  if not replay_result.replayed or replay_result.estimate_run_id<>first_result.estimate_run_id then raise exception 'exact replay failed'; end if;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'high',15000,'USD','per_visit',token); raise exception 'changed replay accepted';
  exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000007','73000000-0000-4000-8000-000000000008',
    '73000000-0000-4000-8000-000000000002','estimate-specialty-blocked','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',
    (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000008'));
    raise exception 'specialty estimate disguised as residential accepted';
  exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0002','service_catalog','2026-09-22.2',
    input,output,'high',15000,'USD','per_visit',token); raise exception 'stale token accepted';
  exception when serialization_failure then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000005','73000000-0000-4000-8000-000000000006',
    '73000000-0000-4000-8000-000000000002','estimate-commercial-blocked','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',
    (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000006'));
    raise exception 'commercial estimate without completed walkthrough accepted';
  exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-engine-blocked','unknown_engine','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'unknown estimate engine accepted'; exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('76666666-6666-4666-8666-666666666666',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-viewer-blocked','service_catalog','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'unassigned estimator estimate accepted'; exception when insufficient_privilege then null; end;
  begin perform * from public.command_crm_estimate_run_internal('22222222-2222-4222-8222-222222222222',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-cross-tenant-blocked','service_catalog','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'cross-tenant actor estimate accepted'; exception when insufficient_privilege then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-private-note-blocked','service_catalog','2026-09-22.2',input||'{"access":"Gate 4815"}',
    output,'base',12500,'USD','per_visit',null);
    raise exception 'private access note persisted'; exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-free-text-blocked','service_catalog','2026-09-22.2',input||'{"operatorNotes":"Gate 4815"}',
    output,'base',12500,'USD','per_visit',null);
    raise exception 'private free text persisted'; exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-segment-missing','service_catalog','2026-09-22.2',input-'segment',
    output,'base',12500,'USD','per_visit',null);
    raise exception 'segment-less snapshot accepted'; exception when check_violation then null; end;
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
    'estimate-amount-blocked','service_catalog','2026-09-22.2',input,output,'base',12600,'USD','per_visit',null);
    raise exception 'mismatched selected amount accepted'; exception when check_violation then null; end;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare org uuid; token timestamptz; err_msg text; begin
  org:=current_setting('r3.estimate_org')::uuid;
  select updated_at into token from public.crm_site_work_packages
    where id='73000000-0000-4000-8000-000000000004';
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimated-pointer-clear-blocked','estimated',null,null,null,token);
    raise exception 'estimated package walkthrough pointer cleared';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'package evidence pointer cannot be changed' then raise; end if;
  end;
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimated-regression-blocked','scoping',null,null,null,token);
    raise exception 'estimated package regressed through legacy command';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'package lifecycle cannot be regressed' then raise; end if;
  end;
  if not exists(select 1 from public.crm_site_work_packages
      where id='73000000-0000-4000-8000-000000000004'
        and status='estimated'
        and walkthrough_id='73000000-0000-4000-8000-000000000011'
        and estimate_run_id is not null) then
    raise exception 'estimated package evidence changed after refused legacy commands';
  end if;
end $$;
reset role;
update public.crm_site_work_packages
set status='proposed',proposal_id='73000000-0000-4000-8000-000000000012'
where id='73000000-0000-4000-8000-000000000004';
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare org uuid; token timestamptz; err_msg text; decline_reason uuid; begin
  org:=current_setting('r3.estimate_org')::uuid;
  select updated_at into token from public.crm_site_work_packages
    where id='73000000-0000-4000-8000-000000000004';
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','proposed-pointer-replace-blocked','proposed',
    '73000000-0000-4000-8000-000000000011','73000000-0000-4000-8000-000000000013',null,token);
    raise exception 'proposed package proposal pointer replaced';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'package evidence pointer cannot be changed' then raise; end if;
  end;
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','proposed-regression-blocked','scoping',null,null,null,token);
    raise exception 'proposed package regressed through legacy command';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'package lifecycle cannot be regressed' then raise; end if;
  end;
  select id into decline_reason from public.crm_loss_reasons
    where organization_id=org and active and applies_to in ('lost','both')
    order by created_at,id limit 1;
  perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','proposed-to-declined-preserved','declined',
    '73000000-0000-4000-8000-000000000011','73000000-0000-4000-8000-000000000012',decline_reason,token);
  if not exists(select 1 from public.crm_site_work_packages
      where id='73000000-0000-4000-8000-000000000004'
        and status='declined'
        and walkthrough_id='73000000-0000-4000-8000-000000000011'
        and proposal_id='73000000-0000-4000-8000-000000000012'
        and estimate_run_id is not null) then
    raise exception 'proposed-to-declined package evidence was not preserved';
  end if;
end $$;
reset role;
do $$ declare org uuid; run_id uuid; begin
  org:=current_setting('r3.estimate_org')::uuid;
  select id into run_id from public.crm_estimate_runs where request_key='estimate-command-0001';
  begin
    update public.crm_site_work_packages set estimate_run_id=run_id
    where id='73000000-0000-4000-8000-000000000006';
    raise exception 'cross-package estimate pointer accepted';
  exception when foreign_key_violation then null; end;
end $$;
alter table public.organization_memberships disable trigger guard_organization_membership_changes;
update public.organization_memberships set role='viewer'
where organization_id=current_setting('r3.estimate_org')::uuid
  and user_id='76666666-6666-4666-8666-666666666666';
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

set local role service_role;
do $$ declare org uuid; token timestamptz; replay_result record; err_msg text;
  input jsonb:='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'::jsonb;
  output jsonb:='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'::jsonb;
begin
  org:=current_setting('r3.estimate_org')::uuid;
  begin
    perform * from public.command_crm_estimate_run_internal('75555555-5555-4555-8555-555555555555',org,
      '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
      'estimate-assigned-estimator','service_catalog','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception using errcode='P0002',message='rollback assigned-estimator success probe';
  exception when sqlstate 'P0002' then null; end;
  begin
    perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
      '73000000-0000-4000-8000-000000000009','73000000-0000-4000-8000-000000000010',
      '73000000-0000-4000-8000-000000000002','estimate-turnover-success','service_catalog','2026-09-22.2',
      '{"catalogVersion":"2026-09-22.2","segment":"short_term_rental","jobType":"airbnb_turnover","frequency":"one-time","turnover":{}}'::jsonb,
      '{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'::jsonb,
      'base',12500,'USD','per_turn',
      (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000010'));
    raise exception using errcode='P0002',message='rollback turnover success probe';
  exception when sqlstate 'P0002' then null; end;
  begin
    perform * from public.command_crm_estimate_run_internal('76666666-6666-4666-8666-666666666666',org,
      '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
      'estimate-viewer-command-blocked','service_catalog','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'viewer estimate command accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
      '73000000-0000-4000-8000-000000000009','73000000-0000-4000-8000-000000000010',
      '73000000-0000-4000-8000-000000000002','estimate-turnover-mismatch','service_catalog','2026-09-22.2',
      input,output,'base',12500,'USD','per_visit',
      (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000010'));
    raise exception 'turnover opportunity accepted residential snapshot';
  exception when check_violation then null; end;
  select updated_at into token from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004';
  begin perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-lifecycle-blocked','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',token);
    raise exception 'later package state regressed by estimate';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'package lifecycle cannot be regressed by an estimate' then raise; end if;
  end;
  update public.crm_opportunities set stage_id=(select id from public.crm_pipeline_stages
    where organization_id=org and pipeline_id=(select pipeline_id from public.crm_opportunities
      where id='73000000-0000-4000-8000-000000000003') and category='lost' limit 1),
    loss_reason_id=(select id from public.crm_loss_reasons where organization_id=org
      and active and applies_to in ('lost','both') order by created_at,id limit 1)
    where id='73000000-0000-4000-8000-000000000003';
  if not exists (
    select 1
    from public.crm_opportunities o
    join public.crm_pipeline_stages s on s.id=o.stage_id and s.organization_id=o.organization_id
    where o.id='73000000-0000-4000-8000-000000000003'
      and o.organization_id=org
      and s.category='lost'
      and o.loss_reason_id is not null
  ) then
    raise exception 'closed-opportunity refusal fixture did not reach lost state';
  end if;
  begin
    perform * from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
      '73000000-0000-4000-8000-000000000003',null,'73000000-0000-4000-8000-000000000002',
      'estimate-closed-blocked','service_catalog','2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
    raise exception 'closed opportunity estimate accepted';
  exception when check_violation then
    get stacked diagnostics err_msg=message_text;
    if err_msg<>'closed opportunity cannot be estimated' then raise; end if;
  end;
  select * into replay_result from public.command_crm_estimate_run_internal('11111111-1111-4111-8111-111111111111',org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','estimate-command-0001','service_catalog','2026-09-22.2',
    input,output,'base',12500,'USD','per_visit',
    current_setting('r3.initial_package_token')::timestamptz);
  if not replay_result.replayed then raise exception 'later-state exact replay failed'; end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare org uuid; begin
  org:=current_setting('r3.estimate_org')::uuid;
  if has_function_privilege('authenticated',
    'public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamptz)','execute')
    then raise exception 'authenticated can execute internal estimate command'; end if;
  begin insert into public.crm_estimate_runs(organization_id,opportunity_id,property_id,request_key,
    engine_key,engine_version,input_snapshot,output_snapshot,selected_scenario,selected_amount_minor,
    pricing_basis,input_sha256,output_sha256,created_by) values(org,
    '73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000002','direct-denied',
    'service_catalog','2026-09-22.2','{}','{}','base',1,'per_visit',repeat('0',64),repeat('0',64),auth.uid());
    raise exception 'direct estimate insert accepted'; exception when insufficient_privilege then null; end;
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000005','73000000-0000-4000-8000-000000000006',
    '73000000-0000-4000-8000-000000000002','estimate-without-evidence','estimated',null,null,null,
    (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000006'));
    raise exception 'package became estimated without selected evidence'; exception when check_violation then null; end;
  begin perform * from public.save_crm_site_work_package(
    org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    '73000000-0000-4000-8000-000000000002','declined-package-reopen-blocked','scoping',null,null,null,
    (select updated_at from public.crm_site_work_packages where id='73000000-0000-4000-8000-000000000004'));
    raise exception 'declined package reopened through legacy command'; exception when check_violation then null; end;
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
end $$;

reset role;
do $$ begin
  if exists(select 1 from public.organization_event_outbox where event_type='estimate.saved'
    and payload<>jsonb_build_object('record_id',aggregate_id)) then
    raise exception 'estimate outbox leaked snapshot data'; end if;
  if not has_function_privilege('service_role','public.command_crm_estimate_run_internal(uuid,uuid,uuid,uuid,uuid,text,text,text,jsonb,jsonb,text,bigint,text,text,timestamptz)','execute')
     or has_function_privilege('service_role','public.read_crm_estimate_runs(uuid,uuid)','execute') then
    raise exception 'estimate privilege boundary mismatch'; end if;
end $$;
select 'R3_3_ADVERSARIAL_ROLE_MATRIX_PASS' as result;
rollback;
