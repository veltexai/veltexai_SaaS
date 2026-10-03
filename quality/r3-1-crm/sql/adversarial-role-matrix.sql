\set ON_ERROR_STOP on
-- Reproducible R3-1 security/semantic matrix. Synthetic UUIDs and .test data
-- only. Synthetic auth identities are installed in the disposable harness;
-- all tenant-role and CRM mutations under test roll back.
alter table public.profiles disable trigger profiles_protect_entitlements;
insert into auth.users(id,email) values
  ('74444444-4444-4444-8444-444444444444','crm-admin@example.test'),
  ('75555555-5555-4555-8555-555555555555','crm-estimator@example.test'),
  ('76666666-6666-4666-8666-666666666666','crm-viewer@example.test');
alter table public.profiles enable trigger profiles_protect_entitlements;

begin;

alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into public.organization_memberships(organization_id,user_id,role)
select p.active_organization_id,v.user_id,v.role
from public.profiles p
cross join (values
  ('74444444-4444-4444-8444-444444444444'::uuid,'admin'::text),
  ('75555555-5555-4555-8555-555555555555'::uuid,'estimator'::text),
  ('76666666-6666-4666-8666-666666666666'::uuid,'viewer'::text)
) v(user_id,role)
where p.id='11111111-1111-4111-8111-111111111111';
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

-- Install an owner-scoped account/opportunity without exercising the commands
-- under test. auth.uid() is null here, so caller-scope triggers stay dormant.
insert into public.crm_customers(id,organization_id,customer_type,name,created_by,updated_by)
select '71000000-0000-4000-8000-000000000001',active_organization_id,
  'commercial','Owner customer',id,id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_contacts(id,organization_id,first_name,email,created_by,updated_by)
select '71000000-0000-4000-8000-000000000002',active_organization_id,
  'Owner','owner-contact@example.test',id,id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_customer_contacts(organization_id,customer_id,contact_id,contact_role,is_primary,created_by)
select active_organization_id,'71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002','decision_maker',true,id
from public.profiles where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,created_by,updated_by)
select '71000000-0000-4000-8000-000000000004',active_organization_id,
  '71000000-0000-4000-8000-000000000001','Owner site',id,id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,
  property_id,idempotency_key,name,owner_user_id,segment,source,created_by,updated_by)
select '71000000-0000-4000-8000-000000000003',p.organization_id,
  '71000000-0000-4000-8000-000000000001',p.id,s.id,'71000000-0000-4000-8000-000000000004',
  'matrix-opportunity-0001','Owner opportunity',
  '11111111-1111-4111-8111-111111111111','commercial','manual',
  '11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='commercial_facility_v1'
order by s.position limit 1;

select set_config('r3.owner_org',(select active_organization_id::text from public.profiles
  where id='11111111-1111-4111-8111-111111111111'),true);

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);

do $$
declare owner_org uuid; first_result record; first_token timestamptz; second_result record;
begin
  select active_organization_id into owner_org from public.profiles
    where id=auth.uid();
  select * into first_result from public.create_crm_manual_lead(
    owner_org,'matrix-lead-owner-0001','Matrix customer','Owner contact',
    'matrix-owner@example.test',null,null,null,null,'{}'::jsonb
  );
  if first_result.replayed or first_result.lead_status <> 'new' then
    raise exception 'owner command did not create the expected lead';
  end if;
  perform * from public.create_crm_manual_lead(
    owner_org,'matrix-lead-owner-0001','Matrix customer','Owner contact',
    'matrix-owner@example.test',null,null,null,null,'{}'::jsonb
  );
  begin
    perform * from public.create_crm_manual_lead(
      owner_org,'matrix-lead-owner-0001','changed payload','Owner contact',
      'matrix-owner@example.test',null,null,null,null,'{}'::jsonb
    );
    raise exception 'changed lead replay was accepted';
  exception when check_violation then null; end;
  begin
    insert into public.crm_leads(organization_id,idempotency_key,created_by)
      values(owner_org,'direct-write-must-fail',auth.uid());
    raise exception 'authenticated direct lead insert was accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.crm_opportunities set acceptance_method='customer_acceptance'
      where id='71000000-0000-4000-8000-000000000003';
    raise exception 'authenticated direct opportunity update was accepted';
  exception when insufficient_privilege then null; end;

  select c.updated_at into first_token from public.crm_customers c
    where c.organization_id=owner_org and c.id='71000000-0000-4000-8000-000000000001';
  select * into second_result from public.save_crm_customer_record(
    owner_org,'71000000-0000-4000-8000-000000000001',first_token,
    'commercial','Owner customer updated');
  if (select c.updated_at from public.crm_customers c
      where c.id='71000000-0000-4000-8000-000000000001')
      is distinct from second_result.updated_at then
    raise exception 'customer command returned a token different from stored updated_at';
  end if;
  perform * from public.save_crm_customer_record(
    owner_org,'71000000-0000-4000-8000-000000000001',second_result.updated_at,
    'commercial','Owner customer updated twice');
end $$;

select set_config('request.jwt.claim.sub','74444444-4444-4444-8444-444444444444',true);
do $$
declare owner_org uuid; result_row record;
begin
  select organization_id into owner_org from public.organization_memberships
    where user_id=auth.uid() and role='admin';
  select * into result_row from public.create_crm_manual_lead(
    owner_org,'matrix-lead-admin-0001','Admin customer','Admin contact',
    'matrix-admin@example.test',null,null,null,null,'{}'::jsonb
  );
  if result_row.replayed then raise exception 'admin lead unexpectedly replayed'; end if;
end $$;

select set_config('request.jwt.claim.sub','75555555-5555-4555-8555-555555555555',true);
do $$
declare owner_org uuid; leaked integer; result_row record;
begin
  select organization_id into owner_org from public.organization_memberships
    where user_id=auth.uid() and role='estimator';
  select count(*) into leaked from public.find_crm_duplicate_candidates(
    owner_org,'owner-contact@example.test',null
  );
  if leaked <> 0 then raise exception 'estimator received an out-of-scope duplicate id'; end if;
  select * into result_row from public.create_crm_manual_lead(
    owner_org,'matrix-lead-est-0001','Estimator customer','Estimator contact',
    'matrix-estimator@example.test',null,null,null,auth.uid(),'{}'::jsonb
  );
  if result_row.replayed then raise exception 'estimator lead unexpectedly replayed'; end if;
  if public.can_access_crm_opportunity('71000000-0000-4000-8000-000000000003') then
    raise exception 'estimator can access an unrelated owner opportunity';
  end if;
end $$;

select set_config('request.jwt.claim.sub','76666666-6666-4666-8666-666666666666',true);
do $$
declare owner_org uuid;
begin
  select organization_id into owner_org from public.organization_memberships
    where user_id=auth.uid() and role='viewer';
  begin
    perform * from public.create_crm_manual_lead(
      owner_org,'matrix-lead-view-0001',null,null,null,null,null,null,null,'{}'::jsonb
    );
    raise exception 'viewer created a lead';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare owner_org uuid; existing_error text; unknown_error text;
begin
  owner_org := current_setting('r3.owner_org')::uuid;
  begin
    perform * from public.create_crm_manual_lead(
      owner_org,'matrix-cross-tenant-0001',null,null,null,null,null,null,null,'{}'::jsonb
    );
    raise exception 'cross-tenant caller created a lead';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.create_crm_direct_opportunity(
      owner_org,'72000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002','matrix-opportunity-0001',
      '71000000-0000-4000-8000-000000000001',null,
      '72000000-0000-4000-8000-000000000003','Blocked','22222222-2222-4222-8222-222222222222',null);
    raise exception 'non-member replayed a known opportunity key';
  exception when insufficient_privilege then
    get stacked diagnostics existing_error=message_text;
  end;
  begin
    perform * from public.create_crm_direct_opportunity(
      owner_org,'72000000-0000-4000-8000-000000000004',
      '72000000-0000-4000-8000-000000000005','matrix-opportunity-unknown',
      '71000000-0000-4000-8000-000000000001',null,
      '72000000-0000-4000-8000-000000000003','Blocked','22222222-2222-4222-8222-222222222222',null);
    raise exception 'non-member created an opportunity with an unknown key';
  exception when insufficient_privilege then
    get stacked diagnostics unknown_error=message_text;
  end;
  if existing_error is distinct from unknown_error then
    raise exception 'direct-opportunity denial leaks key existence';
  end if;
end $$;

select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare owner_org uuid; v_pipeline_id uuid; lost_stage uuid; new_stage uuid;
  qualifying_stage uuid; sibling_stage uuid; loss_reason uuid; conversion_lead uuid;
  walkthrough uuid; original_token timestamptz;
  first_command record; replay_command record; second_command record;
begin
  select active_organization_id into owner_org from public.profiles
    where id='11111111-1111-4111-8111-111111111111';
  select s.id into lost_stage from public.crm_pipeline_stages s join public.crm_pipelines p
    on p.id=s.pipeline_id and p.organization_id=s.organization_id
    where s.organization_id=owner_org and p.template_key='commercial_facility_v1'
      and s.category='lost' order by s.position limit 1;
  select s.id into new_stage from public.crm_pipeline_stages s join public.crm_pipelines p
    on p.id=s.pipeline_id and p.organization_id=s.organization_id
    where s.organization_id=owner_org and p.template_key='commercial_facility_v1'
      and s.category='new' order by s.position limit 1;
  select p.id into v_pipeline_id from public.crm_pipelines p
    where p.organization_id=owner_org and p.template_key='commercial_facility_v1';
  select s.id into qualifying_stage from public.crm_pipeline_stages s
    where s.organization_id=owner_org and s.pipeline_id=v_pipeline_id
      and s.category='qualifying' order by s.position limit 1;
  sibling_stage := '72000000-0000-4000-8000-000000000010';
  perform * from public.configure_crm_pipeline_stage(owner_org,v_pipeline_id,sibling_stage,
    'Second qualification','qualifying',25,false,null);
  perform * from public.create_crm_direct_opportunity(
    owner_org,'72000000-0000-4000-8000-000000000011',
    '72000000-0000-4000-8000-000000000012','matrix-direct-replay-0001',
    '71000000-0000-4000-8000-000000000001',null,v_pipeline_id,
    'Matrix direct opportunity','11111111-1111-4111-8111-111111111111',null);
  begin
    perform * from public.create_crm_direct_opportunity(
      owner_org,'72000000-0000-4000-8000-000000000011',
      '72000000-0000-4000-8000-000000000012','matrix-direct-replay-0001',
      '71000000-0000-4000-8000-000000000001',null,v_pipeline_id,
      'Changed replay payload','11111111-1111-4111-8111-111111111111',null);
    raise exception 'changed direct-opportunity replay was accepted';
  exception when check_violation then null; end;
  perform * from public.move_crm_opportunity_stage(owner_org,
    '72000000-0000-4000-8000-000000000011',qualifying_stage,
    'matrix-stage-qualifying-1',null,null,null);
  perform * from public.move_crm_opportunity_stage(owner_org,
    '72000000-0000-4000-8000-000000000011',sibling_stage,
    'matrix-stage-qualifying-2',null,null,null);

  select lead_id into conversion_lead from public.create_crm_manual_lead(
    owner_org,'matrix-conversion-lead-1','Conversion customer','Conversion contact',
    'conversion@example.test',null,null,null,null,'{}'::jsonb);
  perform * from public.convert_crm_lead(owner_org,conversion_lead,
    'matrix-conversion-command-1',v_pipeline_id,'Conversion opportunity','commercial',
    null,null,null);
  begin
    perform * from public.convert_crm_lead(owner_org,conversion_lead,
      'matrix-conversion-command-1',v_pipeline_id,'Changed conversion','commercial',
      null,null,null);
    raise exception 'changed conversion replay was accepted';
  exception when check_violation then null; end;
  select id into loss_reason from public.crm_loss_reasons
    where organization_id=owner_org and active and applies_to in ('lost','both') order by code limit 1;
  perform * from public.move_crm_opportunity_stage(owner_org,
    '71000000-0000-4000-8000-000000000003',lost_stage,
    'matrix-stage-lost-0001',loss_reason,null,null);
  begin
    perform * from public.move_crm_opportunity_stage(owner_org,
      '71000000-0000-4000-8000-000000000003',lost_stage,
      'matrix-stage-same-0001',null,null,null);
    raise exception 'same-stage terminal rewrite was accepted';
  exception when check_violation then null; end;
  begin
    perform * from public.move_crm_opportunity_stage(owner_org,
      '71000000-0000-4000-8000-000000000003',new_stage,
      'matrix-stage-reopen-0001',null,null,null);
    raise exception 'terminal opportunity was reopened';
  exception when check_violation then null; end;
  perform * from public.reactivate_crm_opportunity(owner_org,
    '71000000-0000-4000-8000-000000000003','matrix-reactivation-0001','Reactivated owner opportunity');
  begin
    perform * from public.reactivate_crm_opportunity(owner_org,
      '71000000-0000-4000-8000-000000000003','matrix-reactivation-0001','Changed reactivation');
    raise exception 'changed reactivation replay was accepted';
  exception when check_violation then null; end;

  select walkthrough_id into walkthrough from public.schedule_crm_walkthrough(
    owner_org,'71000000-0000-4000-8000-000000000003',
    '71000000-0000-4000-8000-000000000004',auth.uid(),null,
    'matrix-walkthrough-create-1','2026-11-01 17:00:00+00','2026-11-01 18:00:00+00','UTC');
  select updated_at into original_token from public.crm_walkthroughs where id=walkthrough;
  select * into first_command from public.command_crm_walkthrough(
    owner_org,walkthrough,'matrix-walkthrough-move-01','reschedule',
    original_token,
    '2026-11-01 18:00:00+00','2026-11-01 19:00:00+00','UTC');
  if first_command.replayed
     or first_command.updated_at is distinct from
       (select updated_at from public.crm_walkthroughs where id=walkthrough) then
    raise exception 'walkthrough command token was not stored consistently';
  end if;
  select * into replay_command from public.command_crm_walkthrough(
    owner_org,walkthrough,'matrix-walkthrough-move-01','reschedule',
    original_token,
    '2026-11-01 18:00:00+00','2026-11-01 19:00:00+00','UTC');
  if not replay_command.replayed or replay_command.updated_at is distinct from first_command.updated_at then
    raise exception 'walkthrough exact replay did not return its stored token';
  end if;
  begin
    perform * from public.command_crm_walkthrough(
      owner_org,walkthrough,'matrix-walkthrough-move-01','reschedule',
      original_token,
      '2026-11-01 20:00:00+00','2026-11-01 21:00:00+00','UTC');
    raise exception 'changed walkthrough replay was accepted';
  exception when check_violation then null; end;
  begin
    perform * from public.command_crm_walkthrough(
      owner_org,walkthrough,'matrix-walkthrough-stale-01','cancel',
      first_command.updated_at - interval '1 microsecond');
    raise exception 'stale walkthrough token was accepted';
  exception when serialization_failure then null; end;
  select * into second_command from public.command_crm_walkthrough(
    owner_org,walkthrough,'matrix-walkthrough-cancel-1','cancel',first_command.updated_at);
  if second_command.updated_at is distinct from
       (select updated_at from public.crm_walkthroughs where id=walkthrough)
     or exists(select 1 from public.read_crm_walkthroughs(owner_org) where id=walkthrough) then
    raise exception 'walkthrough cancellation token or active projection is incorrect';
  end if;
  begin
    perform 1 from public.crm_walkthrough_commands limit 1;
    raise exception 'authenticated caller read private walkthrough receipts';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
declare owner_org uuid; terminal_stage uuid;
begin
  select active_organization_id into owner_org from public.profiles
    where id='11111111-1111-4111-8111-111111111111';
  select s.id into terminal_stage from public.crm_pipeline_stages s join public.crm_pipelines p
    on p.id=s.pipeline_id and p.organization_id=s.organization_id
    where s.organization_id=owner_org and p.template_key='commercial_facility_v1'
      and s.category='won' order by s.position limit 1;
  begin
    update public.crm_pipeline_stages set category='qualifying' where id=terminal_stage;
    raise exception 'last required terminal category was erased';
  exception when check_violation then null; end;
  if exists (
    select 1 from public.organization_event_outbox e
    where e.event_type like any(array['lead.%','customer.%','contact.%','property.%','opportunity.%','work_package.%','walkthrough.%','task.%'])
      and (e.payload - 'record_id') <> '{}'::jsonb
  ) then raise exception 'CRM outbox payload contains more than record_id'; end if;
end $$;

select 'R3_1_ADVERSARIAL_ROLE_MATRIX_PASS' as result;
rollback;
