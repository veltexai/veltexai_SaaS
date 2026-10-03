\set ON_ERROR_STOP on
-- R3-2 executable authorization, replay, concurrency and privacy proof.
-- Synthetic fixtures only; every CRM/evidence mutation rolls back.
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
where p.id='11111111-1111-4111-8111-111111111111'
on conflict(organization_id,user_id) do update set role=excluded.role;
alter table public.organization_memberships enable trigger guard_organization_membership_changes;

insert into public.crm_customers(id,organization_id,customer_type,name,created_by,updated_by)
select '73000000-0000-4000-8000-000000000001',active_organization_id,
  'commercial','Evidence customer',id,id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_properties(id,organization_id,customer_id,name,created_by,updated_by)
select '73000000-0000-4000-8000-000000000002',active_organization_id,
  '73000000-0000-4000-8000-000000000001','Evidence site',id,id from public.profiles
where id='11111111-1111-4111-8111-111111111111';
insert into public.crm_opportunities(id,organization_id,customer_id,pipeline_id,stage_id,
  property_id,idempotency_key,name,owner_user_id,estimator_user_id,segment,source,created_by,updated_by)
select '73000000-0000-4000-8000-000000000003',p.organization_id,
  '73000000-0000-4000-8000-000000000001',p.id,s.id,'73000000-0000-4000-8000-000000000002',
  'r3-2-evidence-opportunity','Evidence opportunity',
  '11111111-1111-4111-8111-111111111111','75555555-5555-4555-8555-555555555555',
  'commercial','manual','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111'
from public.crm_pipelines p join public.crm_pipeline_stages s
  on s.organization_id=p.organization_id and s.pipeline_id=p.id and s.category='new'
join public.profiles pr on pr.active_organization_id=p.organization_id
where pr.id='11111111-1111-4111-8111-111111111111'
  and p.template_key='commercial_facility_v1'
order by s.position limit 1;
insert into public.crm_walkthroughs(id,organization_id,opportunity_id,property_id,
  estimator_user_id,idempotency_key,window_start,window_end,timezone,status,created_by,updated_by)
select v.id,p.active_organization_id,'73000000-0000-4000-8000-000000000003',
  '73000000-0000-4000-8000-000000000002',v.estimator_id,
  v.command_key,v.starts_at,v.starts_at+interval '1 hour','UTC','scheduled',p.id,p.id
from public.profiles p cross join (values
  ('73000000-0000-4000-8000-000000000004'::uuid,'r3-2-owner-evidence','2026-11-02 17:00:00+00'::timestamptz,'11111111-1111-4111-8111-111111111111'::uuid),
  ('73000000-0000-4000-8000-000000000005'::uuid,'r3-2-estimator-evidence','2026-11-03 17:00:00+00'::timestamptz,'75555555-5555-4555-8555-555555555555'::uuid),
  ('73000000-0000-4000-8000-000000000006'::uuid,'r3-2-admin-evidence','2026-11-04 17:00:00+00'::timestamptz,'75555555-5555-4555-8555-555555555555'::uuid)
) v(id,command_key,starts_at,estimator_id)
where p.id='11111111-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare owner_org uuid; original_token timestamptz; first_result record; replay_result record;
begin
  select active_organization_id into owner_org from public.profiles where id=auth.uid();
  select updated_at into original_token from public.crm_walkthroughs
    where id='73000000-0000-4000-8000-000000000004';
  select * into first_result from public.command_crm_walkthrough_evidence(
    owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    'r3-2-owner-command-1',original_token,'Two restrooms and resilient flooring observed.',true);
  if first_result.replayed or first_result.evidence_completed_at is null
     or first_result.updated_at is distinct from (select updated_at from public.crm_walkthroughs
       where id='73000000-0000-4000-8000-000000000004') then
    raise exception 'owner evidence result did not match stored completion';
  end if;
  select * into replay_result from public.command_crm_walkthrough_evidence(
    owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
    'r3-2-owner-command-1',original_token,'Two restrooms and resilient flooring observed.',true);
  if not replay_result.replayed or replay_result.updated_at is distinct from first_result.updated_at then
    raise exception 'exact evidence replay failed';
  end if;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
      'r3-2-owner-command-1',original_token,'Changed replay.',true);
    raise exception 'changed evidence replay was accepted';
  exception when check_violation then null; end;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
      'r3-2-final-edit-0001',first_result.updated_at,'Edited after completion.',false);
    raise exception 'completed evidence was edited';
  exception when check_violation then null; end;
  begin
    update public.crm_walkthroughs set evidence_notes='direct write' where id=first_result.walkthrough_id;
    raise exception 'authenticated direct evidence update was accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.crm_walkthrough_evidence_commands limit 1;
    raise exception 'authenticated caller read private evidence receipts';
  exception when insufficient_privilege then null; end;
  begin
    update public.crm_walkthrough_evidence_commands set command_key='blocked';
    raise exception 'authenticated caller updated private evidence receipts';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.crm_walkthrough_evidence_commands;
    raise exception 'authenticated caller deleted private evidence receipts';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.crm_walkthrough_evidence_commands default values;
    raise exception 'authenticated caller inserted private evidence receipts';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','75555555-5555-4555-8555-555555555555',true);
do $$
declare owner_org uuid; token timestamptz; saved record; completed record;
begin
  select organization_id into owner_org from public.organization_memberships
    where user_id=auth.uid() and role='estimator';
  select updated_at into token from public.crm_walkthroughs
    where id='73000000-0000-4000-8000-000000000005';
  select * into saved from public.command_crm_walkthrough_evidence(
    owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000005',
    'r3-2-estimator-command',token,'Estimator observation.',false);
  if saved.replayed or saved.evidence_completed_at is not null then
    raise exception 'assigned estimator could not save draft evidence';
  end if;
  if (select count(*) from public.read_crm_walkthroughs(owner_org))<>2
     or not exists(select 1 from public.read_crm_walkthroughs(owner_org)
       where id='73000000-0000-4000-8000-000000000005'
         and evidence_notes='Estimator observation.') then
    raise exception 'assigned estimator evidence projection is incorrect';
  end if;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000005',
      'r3-2-estimator-stale',token,'Stale estimator update.',false);
    raise exception 'stale evidence token was accepted';
  exception when serialization_failure then null; end;
  select * into completed from public.command_crm_walkthrough_evidence(
    owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000005',
    'r3-2-estimator-complete',saved.updated_at,'Estimator observation complete.',true);
  if completed.replayed or completed.evidence_completed_at is null
     or completed.updated_at is distinct from (select updated_at from public.crm_walkthroughs
       where id='73000000-0000-4000-8000-000000000005') then
    raise exception 'assigned estimator could not complete saved evidence with returned token';
  end if;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000004',
      'r3-2-unrelated-estimator',saved.updated_at,'Blocked.',false);
    raise exception 'unrelated estimator changed owner evidence';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','74444444-4444-4444-8444-444444444444',true);
do $$
declare owner_org uuid; token timestamptz; saved record;
begin
  select organization_id into owner_org from public.organization_memberships
    where user_id=auth.uid() and role='admin';
  select updated_at into token from public.crm_walkthroughs
    where id='73000000-0000-4000-8000-000000000006';
  select * into saved from public.command_crm_walkthrough_evidence(
    owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000006',
    'r3-2-admin-command',token,repeat('x',5000),false);
  if saved.replayed or length(saved.evidence_notes)<>5000 then
    raise exception 'admin could not save maximum-length evidence';
  end if;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000099','73000000-0000-4000-8000-000000000006',
      'r3-2-mismatched-opportunity',saved.updated_at,'Blocked mismatch.',false);
    raise exception 'opportunity/walkthrough identity mismatch was accepted';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','76666666-6666-4666-8666-666666666666',true);
do $$
declare owner_org uuid; token timestamptz;
begin
  select organization_id into owner_org from public.organization_memberships where user_id=auth.uid();
  select updated_at into token from public.crm_walkthroughs where id='73000000-0000-4000-8000-000000000005';
  if exists(select 1 from public.read_crm_walkthroughs(owner_org)) then
    raise exception 'viewer received walkthrough evidence';
  end if;
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000005',
      'r3-2-viewer-command',token,'Blocked viewer.',false);
    raise exception 'viewer changed walkthrough evidence';
  exception when insufficient_privilege then null; end;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$
declare owner_org uuid; token timestamptz;
begin
  select active_organization_id into owner_org from public.profiles
    where id='11111111-1111-4111-8111-111111111111';
  select updated_at into token from public.crm_walkthroughs where id='73000000-0000-4000-8000-000000000005';
  begin
    perform * from public.command_crm_walkthrough_evidence(
      owner_org,'73000000-0000-4000-8000-000000000003','73000000-0000-4000-8000-000000000005',
      'r3-2-cross-tenant-01',token,'Blocked tenant.',false);
    raise exception 'cross-tenant caller changed walkthrough evidence';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
set local role anon;
do $$
begin
  begin
    perform * from public.command_crm_walkthrough_evidence(
      '00000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000003',
      '73000000-0000-4000-8000-000000000006','r3-2-anonymous-command',now(),'Blocked.',false);
    raise exception 'anonymous caller changed walkthrough evidence';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$
begin
  if exists(select 1 from public.organization_event_outbox e
    where e.event_type in ('walkthrough.completed','walkthrough.evidence_saved')
      and (e.payload-'record_id')<>'{}'::jsonb) then
    raise exception 'walkthrough evidence outbox leaked note contents';
  end if;
  if exists(select 1 from public.organization_audit_log a
    where a.entity_type='crm_walkthroughs'
      and (a.metadata::text ilike '%restrooms%'
        or a.metadata::text ilike '%estimator observation%')) then
    raise exception 'walkthrough evidence audit metadata leaked note contents';
  end if;
  if (select count(*) from public.crm_walkthrough_evidence_commands)<>4 then
    raise exception 'unexpected evidence receipt count';
  end if;
end $$;

select 'R3_2_ADVERSARIAL_ROLE_MATRIX_PASS' as result;
rollback;
