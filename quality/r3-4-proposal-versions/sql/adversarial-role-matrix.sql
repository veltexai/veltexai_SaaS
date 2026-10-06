\set ON_ERROR_STOP on

alter table public.profiles disable trigger profiles_protect_entitlements;
insert into auth.users(id,email) values
  ('84444444-4444-4444-8444-444444444444','version-admin@example.test'),
  ('85555555-5555-4555-8555-555555555555','version-estimator@example.test'),
  ('86666666-6666-4666-8666-666666666666','version-viewer@example.test'),
  ('87777777-7777-4777-8777-777777777777','version-unassigned@example.test')
on conflict(id) do nothing;
alter table public.profiles enable trigger profiles_protect_entitlements;

begin;

alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.organization_memberships(organization_id,user_id,role)
select p.active_organization_id,v.user_id,v.role
from public.profiles p cross join (values
  ('84444444-4444-4444-8444-444444444444'::uuid,'admin'::text),
  ('85555555-5555-4555-8555-555555555555'::uuid,'estimator'::text),
  ('86666666-6666-4666-8666-666666666666'::uuid,'viewer'::text),
  ('87777777-7777-4777-8777-777777777777'::uuid,'estimator'::text)
) v(user_id,role)
where p.id='11111111-1111-4111-8111-111111111111';
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

insert into public.crm_customers(id,organization_id,customer_type,name,created_by)
select '83000000-0000-4000-8000-000000000001',active_organization_id,
  'household','Version customer',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,address_line_1,city,region,postal_code,created_by)
select '83000000-0000-4000-8000-000000000002',active_organization_id,
  '83000000-0000-4000-8000-000000000001','Version property','1 Test Way',
  'Test City','CA','90000',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,address_line_1,city,region,postal_code,created_by)
select '83000000-0000-4000-8000-000000000006',active_organization_id,
  '83000000-0000-4000-8000-000000000001','Other real property','2 Test Way',
  'Test City','CA','90000',id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,property_id,
  idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by)
select '83000000-0000-4000-8000-000000000003',p.organization_id,
  '83000000-0000-4000-8000-000000000001',p.id,s.id,'83000000-0000-4000-8000-000000000002',
  'version-fixture-opportunity','Version opportunity','11111111-1111-4111-8111-111111111111',
  '85555555-5555-4555-8555-555555555555','residential','manual',
  '11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='residential_turnover_v1' order by s.position limit 1;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,crm_opportunity_id,crm_customer_id,crm_property_id)
select '83000000-0000-4000-8000-000000000004',active_organization_id,id,
  'Prepared cleaning proposal','Version Customer','version-customer@example.test',
  '555-0100','1 Test Way',1000,'residential','weekly','Rendered working copy',
  '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000002'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_site_work_packages(id,organization_id,opportunity_id,property_id,
  proposal_id,idempotency_key,created_by)
select '83000000-0000-4000-8000-000000000005',active_organization_id,
  '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000004','version-fixture-package',id
from public.profiles where id='11111111-1111-4111-8111-111111111111';
select set_config('r34.org',(select active_organization_id::text from public.profiles
  where id='11111111-1111-4111-8111-111111111111'),true);

set local role service_role;
do $$
declare org uuid:=current_setting('r34.org')::uuid; token timestamptz;
  estimate_result record; old_null_result record; new_null_result record;
  input jsonb:='{"catalogVersion":"2026-09-22.2","segment":"residential","jobType":"recurring_standard","frequency":"weekly"}'::jsonb;
  output jsonb:='{"version":"2026-09-22.2","unit":"per_visit","low":{"suggestedPrice":100},"base":{"suggestedPrice":125},"high":{"suggestedPrice":150}}'::jsonb;
begin
  select updated_at into token from public.crm_site_work_packages
    where id='83000000-0000-4000-8000-000000000005';
  select * into estimate_result from public.command_crm_estimate_run_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000005',
    '83000000-0000-4000-8000-000000000002','version-estimate-command','service_catalog',
    '2026-09-22.2',input,output,'base',12500,'USD','per_visit',token);
  perform set_config('r34.estimate',estimate_result.estimate_run_id::text,true);
  select * into old_null_result from public.command_crm_estimate_run_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '83000000-0000-4000-8000-000000000003',null,
    '83000000-0000-4000-8000-000000000002','version-null-estimate-old','service_catalog',
    '2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
  select * into new_null_result from public.command_crm_estimate_run_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '83000000-0000-4000-8000-000000000003',null,
    '83000000-0000-4000-8000-000000000002','version-null-estimate-new','service_catalog',
    '2026-09-22.2',input,output,'base',12500,'USD','per_visit',null);
  perform set_config('r34.old_null_estimate',old_null_result.estimate_run_id::text,true);
  perform set_config('r34.new_null_estimate',new_null_result.estimate_run_id::text,true);
end $$;

reset role;
update public.crm_estimate_runs set created_at=clock_timestamp()-interval '2 minutes'
  where id=current_setting('r34.old_null_estimate')::uuid;
update public.crm_estimate_runs set created_at=clock_timestamp()-interval '1 minute'
  where id=current_setting('r34.new_null_estimate')::uuid;
set local role service_role;

do $$
declare org uuid:=current_setting('r34.org')::uuid;
  estimate_id uuid:=current_setting('r34.estimate')::uuid;
  old_null_estimate uuid:=current_setting('r34.old_null_estimate')::uuid;
  token timestamptz; first_result record; replay_result record; second_result record;
  snapshot jsonb; changed_snapshot jsonb; null_package_snapshot jsonb; err text;
begin
  snapshot:=jsonb_build_object(
    'schemaVersion','crm_proposal_version.v1','title','Prepared cleaning proposal',
    'introduction','Thank you for the opportunity.',
    'organization',jsonb_build_object('displayName','Veltex Test Cleaning'),
    'customer',jsonb_build_object('name','Version Customer','email','version-customer@example.test'),
    'serviceLocation',jsonb_build_object('address','1 Test Way','city','Test City','state','CA','postalCode','90000'),
    'service',jsonb_build_object('type','residential','frequency','weekly','summary','Recurring cleaning'),
    'scopeLines',jsonb_build_array('Clean agreed areas'),'exclusions',jsonb_build_array('Hazardous materials'),
    'assumptions',jsonb_build_array('Normal access'),'terms',jsonb_build_array('Operator-confirmed scope'),
    'pricing',jsonb_build_object('amountMinor',12500,'currency','USD','basis','per_visit','unitLabel','per visit'),
    'template',jsonb_build_object('id','classic','rendererVersion','v1'),
    'provenance',jsonb_build_object('proposalId','83000000-0000-4000-8000-000000000004',
      'opportunityId','83000000-0000-4000-8000-000000000003',
      'propertyId','83000000-0000-4000-8000-000000000002',
      'workPackageId','83000000-0000-4000-8000-000000000005',
      'estimateRunId',estimate_id::text));
  perform set_config('r34.snapshot',snapshot::text,true);
  null_package_snapshot:=jsonb_set(
    jsonb_set(snapshot,'{provenance,workPackageId}','null'::jsonb),
    '{provenance,estimateRunId}',to_jsonb(old_null_estimate::text));
  begin
    perform public.read_crm_proposal_version_source_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      null,'83000000-0000-4000-8000-000000000002',old_null_estimate);
    raise exception 'older package-less estimate source accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version context unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      null,'83000000-0000-4000-8000-000000000002',old_null_estimate,
      'version-publish-old-null-0000','crm_proposal_version.v1',null_package_snapshot,
      public.crm_render_proposal_snapshot_v1(null_package_snapshot),null);
    raise exception 'older package-less estimate published';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version context unavailable' then raise; end if;
  end;
  select updated_at into token from public.crm_site_work_packages
    where id='83000000-0000-4000-8000-000000000005';
  perform set_config('r34.initial_token',token::text,true);
  select * into first_result from public.command_crm_publish_proposal_version_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
    '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
    estimate_id,'version-publish-owner-0001','crm_proposal_version.v1',snapshot,
    public.crm_render_proposal_snapshot_v1(snapshot),token);
  if first_result.replayed or first_result.version_number<>1 or first_result.package_updated_at is null then
    raise exception 'owner first publish failed';
  end if;
  if not exists(select 1 from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'
      and status='estimated' and proposal_version_id=first_result.proposal_version_id
      and updated_at=first_result.package_updated_at) then raise exception 'package pointer/status mismatch'; end if;
  select * into replay_result from public.command_crm_publish_proposal_version_internal(
    '11111111-1111-4111-8111-111111111111',org,
    '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
    '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
    estimate_id,'version-publish-owner-0001','crm_proposal_version.v1',snapshot,
    public.crm_render_proposal_snapshot_v1(snapshot),token);
  if not replay_result.replayed or replay_result.proposal_version_id<>first_result.proposal_version_id
     or replay_result.version_number<>1 then raise exception 'exact version replay failed'; end if;
  changed_snapshot:=jsonb_set(snapshot,'{introduction}','"Changed introduction"'::jsonb);
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-owner-0001','crm_proposal_version.v1',changed_snapshot,
      public.crm_render_proposal_snapshot_v1(changed_snapshot),token);
    raise exception 'changed version replay accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version key already used' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '85555555-5555-4555-8555-555555555555',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-owner-0001','crm_proposal_version.v1',snapshot,
      public.crm_render_proposal_snapshot_v1(snapshot),token);
    raise exception 'actor-bound receipt reuse accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version key already used' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-stale-0002','crm_proposal_version.v1',snapshot,
      public.crm_render_proposal_snapshot_v1(snapshot),token);
    raise exception 'stale package token accepted';
  exception when serialization_failure then null; end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-private-0003','crm_proposal_version.v1',
      snapshot||jsonb_build_object('internalNotes','Gate 4815'),public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'private snapshot key accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version content unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-margin-0004','crm_proposal_version.v1',
      jsonb_set(snapshot,'{pricing}',(snapshot->'pricing')||jsonb_build_object('margin',42)),
      public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'nested private pricing key accepted';
  exception when check_violation then null; end;
  begin
    changed_snapshot:=jsonb_set(snapshot,'{customer,email}','{"private":"object"}'::jsonb);
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-object-leaf-0005','crm_proposal_version.v1',changed_snapshot,
      public.crm_render_proposal_snapshot_v1(changed_snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'object-valued customer email accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version content unavailable' then raise; end if;
  end;
  begin
    changed_snapshot:=jsonb_set(snapshot,'{pricing,amountMinor}','"12500"'::jsonb);
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-string-amount-0005','crm_proposal_version.v1',changed_snapshot,
      public.crm_render_proposal_snapshot_v1(changed_snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'string-valued amountMinor accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version content unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-amount-0005','crm_proposal_version.v1',
      jsonb_set(snapshot,'{pricing,amountMinor}','12600'::jsonb),
      public.crm_render_proposal_snapshot_v1(jsonb_set(snapshot,'{pricing,amountMinor}','12600'::jsonb)),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'mismatched estimate amount accepted';
  exception when check_violation then
    get stacked diagnostics err=message_text;
    if err<>'proposal version content unavailable' then raise; end if;
  end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000006',
      estimate_id,'version-publish-context-0006','crm_proposal_version.v1',snapshot,public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'mismatched property context accepted';
  exception when check_violation then null; end;
  select * into second_result from public.command_crm_publish_proposal_version_internal(
    '85555555-5555-4555-8555-555555555555',org,
    '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
    '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
    estimate_id,'version-publish-estimator-0004','crm_proposal_version.v1',snapshot,
    public.crm_render_proposal_snapshot_v1(snapshot),
    (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
  if second_result.replayed or second_result.version_number<>2 then raise exception 'assigned estimator publish failed'; end if;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '87777777-7777-4777-8777-777777777777',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-unassigned-0008','crm_proposal_version.v1',snapshot,
      public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'same-org unassigned estimator published a proposal version';
  exception when insufficient_privilege then null; end;
end $$;

do $$
declare org uuid:=current_setting('r34.org')::uuid;
  estimate_id uuid:=current_setting('r34.estimate')::uuid; err text;
begin
  begin
    perform public.read_crm_proposal_version_source_internal(
      '87777777-7777-4777-8777-777777777777',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',estimate_id);
    raise exception 'unassigned estimator read proposal-version source';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal version unavailable' then raise; end if;
  end;
  begin
    perform public.read_crm_proposal_version_source_internal(
      '86666666-6666-4666-8666-666666666666',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',estimate_id);
    raise exception 'viewer read proposal-version source';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal version unavailable' then raise; end if;
  end;
  begin
    perform public.read_crm_proposal_version_source_internal(
      '22222222-2222-4222-8222-222222222222',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',estimate_id);
    raise exception 'cross-tenant actor read proposal-version source';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal version unavailable' then raise; end if;
  end;
end $$;

do $$
declare org uuid:=current_setting('r34.org')::uuid; estimate_id uuid:=current_setting('r34.estimate')::uuid;
  snapshot jsonb:=current_setting('r34.snapshot')::jsonb; admin_result record; closed_error text;
begin
  select * into admin_result from public.command_crm_publish_proposal_version_internal(
    '84444444-4444-4444-8444-444444444444',org,
    '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
    '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
    estimate_id,'version-publish-admin-0005','crm_proposal_version.v1',snapshot,
    public.crm_render_proposal_snapshot_v1(snapshot),
    (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
  if admin_result.replayed or admin_result.version_number<>3
    then raise exception 'admin version allocation failed'; end if;
  update public.crm_opportunities set stage_id=(select s.id from public.crm_pipeline_stages s
    where s.organization_id=org and s.pipeline_id=public.crm_opportunities.pipeline_id
      and s.category='lost' order by s.position limit 1),
    loss_reason_id=(select r.id from public.crm_loss_reasons r where r.organization_id=org
      and r.active and r.applies_to in ('lost','both') order by r.created_at,r.id limit 1)
    where id='83000000-0000-4000-8000-000000000003';
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-closed-0007','crm_proposal_version.v1',snapshot,public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'closed opportunity proposal version accepted';
  exception when check_violation then
    get stacked diagnostics closed_error=message_text;
    if closed_error<>'closed opportunity cannot publish a proposal version' then raise; end if;
  end;
  if not (select replayed from public.command_crm_publish_proposal_version_internal(
      '11111111-1111-4111-8111-111111111111',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-owner-0001','crm_proposal_version.v1',snapshot,
      public.crm_render_proposal_snapshot_v1(snapshot),current_setting('r34.initial_token')::timestamptz)) then
    raise exception 'closed-state exact replay failed';
  end if;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '86666666-6666-4666-8666-666666666666',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-viewer-0006','crm_proposal_version.v1',snapshot,public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'viewer published a proposal version';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.command_crm_publish_proposal_version_internal(
      '22222222-2222-4222-8222-222222222222',org,
      '83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000005','83000000-0000-4000-8000-000000000002',
      estimate_id,'version-publish-cross-0007','crm_proposal_version.v1',snapshot,public.crm_render_proposal_snapshot_v1(snapshot),
      (select updated_at from public.crm_site_work_packages where id='83000000-0000-4000-8000-000000000005'));
    raise exception 'cross-tenant actor published a proposal version';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$ begin
  begin update public.crm_proposal_versions set rendered_content='mutated';
    raise exception 'immutable version update accepted';
  exception when sqlstate '55000' then null; end;
  begin delete from public.crm_proposal_versions;
    raise exception 'immutable version delete accepted';
  exception when sqlstate '55000' then null; end;
  begin truncate public.crm_proposal_versions cascade;
    raise exception 'immutable version truncate accepted';
  exception when sqlstate '55000' then null; end;
  begin update public.crm_proposal_version_commands set payload_sha256=repeat('0',64);
    raise exception 'immutable proposal-version receipt update accepted';
  exception when sqlstate '55000' then null; end;
  begin delete from public.crm_proposal_version_commands;
    raise exception 'immutable proposal-version receipt delete accepted';
  exception when sqlstate '55000' then null; end;
  begin truncate public.crm_proposal_version_commands;
    raise exception 'immutable proposal-version receipt truncate accepted';
  exception when sqlstate '55000' then null; end;
  begin update public.crm_site_work_packages set proposal_version_id=null
      where id='83000000-0000-4000-8000-000000000005';
    raise exception 'direct package proposal-version pointer clear accepted';
  exception when sqlstate '55000' then null; end;
  insert into public.crm_estimate_runs(id,organization_id,opportunity_id,work_package_id,
    property_id,request_key,engine_key,engine_version,input_snapshot,output_snapshot,
    selected_scenario,selected_amount_minor,currency,pricing_basis,input_sha256,output_sha256,
    created_by,created_at)
  select '83000000-0000-4000-8000-000000000009',organization_id,opportunity_id,work_package_id,
    property_id,'version-reestimate-pointer-reset',engine_key,engine_version,input_snapshot,
    output_snapshot,selected_scenario,selected_amount_minor,currency,pricing_basis,input_sha256,
    output_sha256,created_by,clock_timestamp()
  from public.crm_estimate_runs where id=current_setting('r34.estimate')::uuid;
  update public.crm_site_work_packages
    set estimate_run_id='83000000-0000-4000-8000-000000000009'
    where id='83000000-0000-4000-8000-000000000005';
  if exists(select 1 from public.crm_site_work_packages
      where id='83000000-0000-4000-8000-000000000005' and proposal_version_id is not null) then
    raise exception 're-estimation did not invalidate proposal-version pointer';
  end if;
  begin update public.proposals set crm_property_id='83000000-0000-4000-8000-000000000006'
      where id='83000000-0000-4000-8000-000000000004';
    raise exception 'versioned proposal binding mutation accepted';
  exception when sqlstate '55000' then null; end;
  if exists(select 1 from public.organization_event_outbox where event_type='proposal.version_prepared'
      and payload<>jsonb_build_object('record_id',aggregate_id)) then
    raise exception 'proposal-version outbox leaked customer content';
  end if;
  if exists(select 1 from public.organization_audit_log where action='crm_proposal_versions.insert'
      and metadata<>jsonb_build_object('operation','INSERT')) then
    raise exception 'proposal-version audit leaked customer content';
  end if;
  if has_function_privilege('authenticated',
      'public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamptz)','execute')
     or not has_function_privilege('service_role',
      'public.command_crm_publish_proposal_version_internal(uuid,uuid,uuid,uuid,uuid,uuid,uuid,text,text,jsonb,text,timestamptz)','execute') then
    raise exception 'proposal-version command privilege boundary mismatch';
  end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare org uuid:=current_setting('r34.org')::uuid; begin
  if (select count(*) from public.read_crm_proposal_versions(org,'83000000-0000-4000-8000-000000000003'))<>3
    then raise exception 'owner version history unavailable'; end if;
  if (select count(*) from public.read_crm_proposal_candidates(org,'83000000-0000-4000-8000-000000000003'))<>1
    then raise exception 'owner proposal candidate projection mismatch'; end if;
  begin insert into public.crm_proposal_versions(organization_id,proposal_id,opportunity_id,
    property_id,estimate_run_id,version_number,request_key,content_snapshot,rendered_content,
    display_amount_minor,pricing_basis,content_sha256,rendered_sha256,estimate_input_sha256,
    estimate_output_sha256,schema_version,created_by)
    values(org,'83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000003',
      '83000000-0000-4000-8000-000000000002',current_setting('r34.estimate')::uuid,99,
      'direct-version-denied','{}','blocked',1,'per_visit',repeat('0',64),repeat('0',64),
      repeat('0',64),repeat('0',64),'crm_proposal_version.v1',auth.uid());
    raise exception 'authenticated direct version insert accepted';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','85555555-5555-4555-8555-555555555555',true);
do $$ declare org uuid:=current_setting('r34.org')::uuid; begin
  if (select count(*) from public.read_crm_proposal_versions(org,'83000000-0000-4000-8000-000000000003'))<>3
    then raise exception 'assigned estimator version history unavailable'; end if;
  if (select count(*) from public.read_crm_proposal_candidates(org,'83000000-0000-4000-8000-000000000003'))<>1
    then raise exception 'assigned estimator proposal candidate read failed'; end if;
end $$;
reset role;
insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
  contact_phone,service_location,facility_size,service_type,service_frequency,
  generated_content,crm_opportunity_id,crm_customer_id,crm_property_id)
select '83000000-0000-4000-8000-000000000010',active_organization_id,id,
  'Inaccessible source proposal','Version Customer','version-customer@example.test',
  '555-0110','1 Test Way',1000,'residential','weekly','Unversioned source',
  '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000002'
from public.profiles where id='11111111-1111-4111-8111-111111111111';
set local role authenticated;
select set_config('request.jwt.claim.sub','87777777-7777-4777-8777-777777777777',true);
do $$ declare org uuid:=current_setting('r34.org')::uuid; err text; begin
  begin
    insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
      service_location,facility_size,service_type,service_frequency,generated_content,
      crm_opportunity_id,crm_customer_id,crm_property_id)
    values('83000000-0000-4000-8000-000000000007',org,auth.uid(),'Unauthorized bound proposal',
      'Version Customer','version-customer@example.test','1 Test Way',1000,'residential','weekly','Blocked',
      '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001',
      '83000000-0000-4000-8000-000000000002');
    raise exception 'unassigned estimator inserted a bound proposal';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal binding unavailable' then raise; end if;
  end;
  insert into public.proposals(id,organization_id,user_id,title,client_name,client_email,
    contact_phone,service_location,facility_size,service_type,service_frequency,generated_content)
  values('83000000-0000-4000-8000-000000000008',org,auth.uid(),'Unbound proposal',
    'Version Customer','version-customer@example.test','555-0108','1 Test Way',1000,
    'residential','weekly','Allowed');
  begin
    update public.proposals set crm_opportunity_id=null,crm_customer_id=null,crm_property_id=null
      where id='83000000-0000-4000-8000-000000000010';
    raise exception 'unassigned estimator cleared inaccessible old proposal binding';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal binding unavailable' then raise; end if;
  end;
  begin
    update public.proposals set crm_opportunity_id='83000000-0000-4000-8000-000000000003',
      crm_customer_id='83000000-0000-4000-8000-000000000001',
      crm_property_id='83000000-0000-4000-8000-000000000002'
    where id='83000000-0000-4000-8000-000000000008';
    raise exception 'unassigned estimator rebound an unversioned proposal';
  exception when insufficient_privilege then
    get stacked diagnostics err=message_text;
    if err<>'proposal binding unavailable' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claim.sub','86666666-6666-4666-8666-666666666666',true);
do $$ declare org uuid:=current_setting('r34.org')::uuid; begin
  if exists(select 1 from public.read_crm_proposal_versions(org,'83000000-0000-4000-8000-000000000003'))
    then raise exception 'viewer received immutable version metadata'; end if;
  if exists(select 1 from public.read_crm_proposal_candidates(org,'83000000-0000-4000-8000-000000000003'))
    then raise exception 'viewer received proposal candidates'; end if;
end $$;
reset role;

select 'R3_4_ADVERSARIAL_ROLE_MATRIX_PASS' as result;
rollback;
