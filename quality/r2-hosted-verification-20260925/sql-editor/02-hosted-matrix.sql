-- R2 SQL Editor hosted matrix (two-tenant owner plus uninvited-role denial)
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- SQL Editor variant. The psql runners remain the hosted execution path.
-- No secrets. Fixtures use .example.test addresses.
-- Identity is the recorded isolated-preview fingerprint, not a pasted ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.

-- Isolated-preview identity after the R2 candidate is applied.
-- Legacy non-fixture rows must still match the recorded baseline digest.
-- A pasted ref is not evidence of database identity.
do $$
declare
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 fingerprint failed: candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925007000'
  ) then
    raise exception 'R2 fingerprint failed: migration version is absent';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 58
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '001','002','003','004','005','006','009','010','011','012','013','014','015','016',
       '017','018','019','020','021','022','023','024','025','026','027','028','029','030',
       '031','032','033','034','035','036','037','038','039','040','041','20250901194222',
       '20260908000000','20260913000000','20260922000000','20260922010000',
       '20260924000000','20260924010000','20260924010500','20260924011000',
       '20260924012000','20260924013000','20260925000000','20260925001000'
     )) <> 52
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '20260925002000','20260925003000','20260925004000','20260925005000','20260925006000','20260925007000'
     )) <> 6 then
    raise exception 'R2 fingerprint failed: migration history is not the exact 52 prerequisites plus six R2 versions';
  end if;
  select count(*) into profile_count
  from public.profiles
  where id::text not like '91000000-%'
    and id::text not like '92000000-%'
    and id::text not like '93000000-%';
  select count(*) into proposal_count
  from public.proposals
  where id::text not like '91000000-%'
    and id::text not like '92000000-%'
    and id::text not like '93000000-%';
  select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    into proposal_digest
    from public.proposals
    where id::text not like '91000000-%'
      and id::text not like '92000000-%'
      and id::text not like '93000000-%';
  if profile_count <> 0 or proposal_count <> 0 then
    raise exception 'R2 fingerprint failed: legacy profile/proposal counts do not match isolated-preview baseline';
  end if;
  if proposal_digest is distinct from 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' then
    raise exception 'R2 fingerprint failed: legacy proposal-content digest does not match isolated-preview baseline';
  end if;
end $$;
begin;

do $$ begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_event_inbox') is null then
    raise exception 'R2 candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925007000'
  ) then raise exception 'R2 migration version is absent'; end if;
end $$;

-- Snapshot the existing data before synthetic fixtures. The digest is emitted
-- both before and after the matrix, proving the transaction did not rewrite it.
create temp table r2_baseline as
select
  (select count(*) from public.profiles) profile_count,
  (select count(*) from public.proposals) proposal_count,
  (select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex') from public.proposals) proposal_digest;
table r2_baseline;

insert into auth.users(id,email) values
 ('91000000-0000-4000-8000-000000000011','r2-owner-a@example.test'),
 ('91000000-0000-4000-8000-000000000012','r2-admin-a@example.test'),
 ('91000000-0000-4000-8000-000000000013','r2-estimator-a@example.test'),
 ('91000000-0000-4000-8000-000000000014','r2-viewer-a@example.test'),
 ('91000000-0000-4000-8000-000000000015','r2-owner-b@example.test'),
 ('91000000-0000-4000-8000-000000000016','r2-outsider@example.test'),
 ('91000000-0000-4000-8000-000000000017','r2-empty-delete@example.test'),
 ('91000000-0000-4000-8000-000000000018','r2-direct-cleanup@example.test');

-- Signup trigger plus R2 bootstrap must create one owner organization each.
do $$ declare uid uuid; begin
  for uid in select id from auth.users where email like 'r2-%@example.test' loop
    if (select count(*) from public.organization_memberships where user_id=uid and role='owner') <> 1 then
      raise exception 'signup bootstrap failed for %', uid;
    end if;
    if not exists (select 1 from public.profiles where id=uid and active_organization_id is not null) then
      raise exception 'active organization bootstrap failed for %', uid;
    end if;
  end loop;
end $$;

-- The same cleanup is valid when the empty profile itself is removed by a
-- trusted maintenance transaction. The auth identity is then removed after
-- proving that no tenant-scoped residue remains.
select set_config('r2.test.direct_org', (
  select active_organization_id::text from public.profiles
  where id = '91000000-0000-4000-8000-000000000018'
), true);
delete from public.profiles where id='91000000-0000-4000-8000-000000000018';
set constraints all immediate;
do $$ begin
  if exists(select 1 from public.profiles where id='91000000-0000-4000-8000-000000000018')
     or exists(select 1 from public.organizations where id=current_setting('r2.test.direct_org')::uuid)
     or exists(select 1 from public.organization_memberships where organization_id=current_setting('r2.test.direct_org')::uuid)
     or exists(select 1 from public.organization_audit_log where organization_id=current_setting('r2.test.direct_org')::uuid)
     or exists(select 1 from public.organization_event_outbox where organization_id=current_setting('r2.test.direct_org')::uuid)
     or exists(select 1 from public.organization_event_inbox where organization_id=current_setting('r2.test.direct_org')::uuid) then
    raise exception 'direct private cleanup left tenant residue';
  end if;
end $$;
delete from auth.users where id='91000000-0000-4000-8000-000000000018';

-- The residue assertion above temporarily forces deferred constraints to run.
-- Restore the transaction's normal deferred mode before exercising the next
-- independent account-cleanup case.
set constraints all deferred;

-- Empty signup accounts must delete end-to-end, including their private tenant.
-- Accounts with proposal work remain protected by tenant-owned RESTRICT FKs.
select set_config('r2.test.empty_org', (
  select active_organization_id::text from public.profiles
  where id = '91000000-0000-4000-8000-000000000017'
), true);
delete from auth.users where id='91000000-0000-4000-8000-000000000017';
set constraints all immediate;
do $$ begin
  if exists(select 1 from public.profiles where id='91000000-0000-4000-8000-000000000017')
     or exists(select 1 from public.organizations where id=current_setting('r2.test.empty_org')::uuid)
     or exists(select 1 from public.organization_memberships where organization_id=current_setting('r2.test.empty_org')::uuid)
     or exists(select 1 from public.organization_audit_log where organization_id=current_setting('r2.test.empty_org')::uuid)
     or exists(select 1 from public.organization_event_outbox where organization_id=current_setting('r2.test.empty_org')::uuid)
     or exists(select 1 from public.organization_event_inbox where organization_id=current_setting('r2.test.empty_org')::uuid) then
    raise exception 'empty auth account cleanup left tenant residue';
  end if;
end $$;

select set_config('r2.test.org_a', (
  select active_organization_id::text from public.profiles
  where id = '91000000-0000-4000-8000-000000000011'
), true);
select set_config('r2.test.org_b', (
  select active_organization_id::text from public.profiles
  where id = '91000000-0000-4000-8000-000000000015'
), true);

-- Team invitations are intentionally not implemented. Even service_role may
-- not manufacture memberships; each synthetic signup remains in its own org.
set local role service_role;
do $$ begin
  begin
    insert into public.organization_memberships(organization_id,user_id,role)
    values (current_setting('r2.test.org_a')::uuid,'91000000-0000-4000-8000-000000000012','admin');
    raise exception 'service role manufactured an unconsented membership';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into public.proposals(
  id,organization_id,user_id,title,client_name,client_email,contact_phone,
  service_location,facility_size,service_type,service_frequency,generated_content
) values
 ('91000000-0000-4000-8000-000000000101',current_setting('r2.test.org_a')::uuid,'91000000-0000-4000-8000-000000000011','R2 A','Synthetic A','client-a@example.test','555-0101','Synthetic A',1000,'residential','one-time','R2-CONTENT-A'),
 ('91000000-0000-4000-8000-000000000102',current_setting('r2.test.org_b')::uuid,'91000000-0000-4000-8000-000000000015','R2 B','Synthetic B','client-b@example.test','555-0102','Synthetic B',1000,'residential','one-time','R2-CONTENT-B');
insert into public.proposal_tracking(
  proposal_id,tracking_id,delivery_method,recipient_email,subject,message
) values (
  '91000000-0000-4000-8000-000000000101',
  '91000000-0000-4000-8000-000000000199',
  'online','public-r2@example.test','R2 public view','R2 public view'
);
set local role service_role;
do $$ begin
  begin
    insert into public.organizations(id,name,slug,created_by)
    values ('91000000-0000-4000-8000-000000000198','Ownerless R2','ownerless-r2-test',
      '91000000-0000-4000-8000-000000000011');
    raise exception 'service role committed an ownerless organization';
  exception when check_violation then null; end;
end $$;
reset role;

-- A signed-in public recipient who is not a tenant member may resolve the
-- tracked proposal without turning a view counter into audit/outbox noise.
do $$ declare audit_before bigint; outbox_before bigint; begin
  select count(*) into audit_before from public.organization_audit_log
    where organization_id=current_setting('r2.test.org_a')::uuid;
  select count(*) into outbox_before from public.organization_event_outbox
    where organization_id=current_setting('r2.test.org_a')::uuid;
  perform set_config('r2.test.audit_before', audit_before::text, true);
  perform set_config('r2.test.outbox_before', outbox_before::text, true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000016',true);
do $$ begin
  if not public.record_tracked_view('91000000-0000-4000-8000-000000000199') then
    raise exception 'signed-in public tracked view was not recorded';
  end if;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.organization_audit_log
      where organization_id=current_setting('r2.test.org_a')::uuid)
       <> current_setting('r2.test.audit_before')::bigint
     or (select count(*) from public.organization_event_outbox
      where organization_id=current_setting('r2.test.org_a')::uuid)
       <> current_setting('r2.test.outbox_before')::bigint then
    raise exception 'public tracked view created organization audit/outbox noise';
  end if;
end $$;

-- Owner: manage organization and ordinary membership; cannot forge audit/event.
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000011',true);
do $$ begin
  if not public.can_manage_organization(current_setting('r2.test.org_a')::uuid) then raise exception 'owner manage denied'; end if;
  if public.is_organization_member(current_setting('r2.test.org_b')::uuid) then raise exception 'owner crossed tenant'; end if;
  begin update public.organizations set created_by='91000000-0000-4000-8000-000000000012' where id=current_setting('r2.test.org_a')::uuid; raise exception 'creator mutation allowed'; exception when insufficient_privilege then null; end;
  begin update public.profiles set active_organization_id=current_setting('r2.test.org_b')::uuid where id=auth.uid(); raise exception 'hostile active org allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.organization_audit_log(organization_id,action,entity_type) values (current_setting('r2.test.org_a')::uuid,'forged','test'); raise exception 'audit forge allowed'; exception when insufficient_privilege then null; end;
  begin insert into public.organization_event_outbox(organization_id,event_type,aggregate_type,aggregate_id,payload) values (current_setting('r2.test.org_a')::uuid,'forged','test','1','{}'); raise exception 'outbox forge allowed'; exception when insufficient_privilege then null; end;
  if (select count(*) from public.proposals where id in ('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000102')) <> 1 then raise exception 'owner proposal tenant boundary failed'; end if;
  update public.proposals set title='R2 A owner edit' where id='91000000-0000-4000-8000-000000000101';
  begin update public.proposals set organization_id=current_setting('r2.test.org_b')::uuid where id='91000000-0000-4000-8000-000000000101'; raise exception 'proposal tenant mutation allowed'; exception when insufficient_privilege then null; end;
  begin update public.proposals set user_id='91000000-0000-4000-8000-000000000012' where id='91000000-0000-4000-8000-000000000101'; raise exception 'proposal creator mutation allowed'; exception when insufficient_privilege then null; end;
end $$;

-- Uninvited users cannot inherit admin/estimator/viewer access merely because a
-- service process names them. Role-specific positive paths remain blocked until
-- the consent-bound invitation release supplies legitimate fixtures.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000012',true);
do $$ begin
  if public.can_manage_organization(current_setting('r2.test.org_a')::uuid) then raise exception 'uninvited admin access'; end if;
  if exists(select 1 from public.proposals where id='91000000-0000-4000-8000-000000000101') then raise exception 'uninvited admin proposal read'; end if;
end $$;

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000013',true);
do $$ begin
  if public.can_edit_organization_work(current_setting('r2.test.org_a')::uuid) then raise exception 'uninvited estimator access'; end if;
end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000014',true);
do $$ declare changed integer; begin
  if public.can_edit_organization_work(current_setting('r2.test.org_a')::uuid) then raise exception 'viewer edit allowed'; end if;
  if public.is_organization_member(current_setting('r2.test.org_a')::uuid) then raise exception 'uninvited viewer membership'; end if;
  update public.proposals set title='UNAUTHORIZED VIEWER EDIT' where id='91000000-0000-4000-8000-000000000101';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'viewer changed proposal'; end if;
end $$;

-- Non-member and anonymous cannot enumerate either tenant.
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000016',true);
do $$ declare changed integer; begin
  if exists(select 1 from public.organizations where id in (current_setting('r2.test.org_a')::uuid,current_setting('r2.test.org_b')::uuid)) then raise exception 'nonmember tenant leak'; end if;
  if exists(select 1 from public.organization_memberships where organization_id=current_setting('r2.test.org_a')::uuid) then raise exception 'nonmember membership leak'; end if;
  if exists(select 1 from public.proposals where id='91000000-0000-4000-8000-000000000101') then raise exception 'nonmember proposal leak'; end if;
  update public.proposals set title='UNAUTHORIZED OUTSIDER EDIT' where id='91000000-0000-4000-8000-000000000101';
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'nonmember changed proposal'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.organizations limit 1; raise exception 'anon organizations access'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.organization_memberships limit 1; raise exception 'anon memberships access'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.proposals limit 1; raise exception 'anon raw proposal access'; exception when insufficient_privilege then null; end;
end $$;
reset role;

set local role service_role;
do $$ begin
  if (select count(*) from public.proposals where id in ('91000000-0000-4000-8000-000000000101','91000000-0000-4000-8000-000000000102')) <> 2 then raise exception 'service role cannot read both tenants'; end if;
  begin
    update public.proposals set title='UNAUTHORIZED SERVICE EDIT' where id='91000000-0000-4000-8000-000000000101';
    raise exception 'service role updated a proposal';
  exception when insufficient_privilege then null; end;
  begin
    perform 1 from public.proposal_tracking limit 1;
    raise exception 'service role read raw proposal tracking';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- The same auth-user deletion must fail closed once tenant-owned work exists,
-- and its attempted cleanup must roll back every profile/tenant/audit row.
do $$ declare audit_before bigint; outbox_before bigint; begin
  select count(*) into audit_before from public.organization_audit_log
    where organization_id=current_setting('r2.test.org_a')::uuid;
  select count(*) into outbox_before from public.organization_event_outbox
    where organization_id=current_setting('r2.test.org_a')::uuid;
  begin
    delete from auth.users where id='91000000-0000-4000-8000-000000000011';
    set constraints all immediate;
    raise exception 'protected owner account deletion unexpectedly succeeded';
  exception when foreign_key_violation then null; end;
  if not exists(select 1 from auth.users where id='91000000-0000-4000-8000-000000000011')
     or not exists(select 1 from public.profiles where id='91000000-0000-4000-8000-000000000011')
     or not exists(select 1 from public.organizations where id=current_setting('r2.test.org_a')::uuid)
     or not exists(select 1 from public.organization_memberships
        where organization_id=current_setting('r2.test.org_a')::uuid
          and user_id='91000000-0000-4000-8000-000000000011')
     or not exists(select 1 from public.proposals where id='91000000-0000-4000-8000-000000000101')
     or (select count(*) from public.organization_audit_log
         where organization_id=current_setting('r2.test.org_a')::uuid) <> audit_before
     or (select count(*) from public.organization_event_outbox
         where organization_id=current_setting('r2.test.org_a')::uuid) <> outbox_before then
    raise exception 'protected owner deletion did not roll back atomically';
  end if;
end $$;

-- Service inbox: exact replay is idempotent; altered payload conflicts.
set local role service_role;
insert into public.organization_event_inbox(consumer,event_id,organization_id,payload_sha256)
values ('r2-harness','91000000-0000-4000-8000-000000000099',current_setting('r2.test.org_a')::uuid,repeat('a',64));
insert into public.organization_event_inbox(consumer,event_id,organization_id,payload_sha256)
values ('r2-harness','91000000-0000-4000-8000-000000000099',current_setting('r2.test.org_a')::uuid,repeat('a',64))
on conflict (consumer,event_id) do nothing;
do $$ begin
  if (select count(*) from public.organization_event_inbox where consumer='r2-harness') <> 1 then raise exception 'inbox replay duplicated'; end if;
  begin
    insert into public.organization_event_inbox(consumer,event_id,organization_id,payload_sha256)
    values ('r2-harness','91000000-0000-4000-8000-000000000099',current_setting('r2.test.org_a')::uuid,repeat('b',64));
    raise exception 'altered replay accepted';
  exception when unique_violation then null; end;
end $$;
reset role;

-- Last-owner invariant, audit append-only and event generation.
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000011',true);
do $$ begin
  begin delete from public.organization_memberships where organization_id=current_setting('r2.test.org_a')::uuid and user_id=auth.uid(); raise exception 'last owner removed'; exception when insufficient_privilege then null; end;
  begin update public.organization_audit_log set action='tampered' where organization_id=current_setting('r2.test.org_a')::uuid; raise exception 'audit update allowed'; exception when insufficient_privilege then null; end;
  if not exists(select 1 from public.organization_audit_log where organization_id=current_setting('r2.test.org_a')::uuid) then raise exception 'audit trigger absent'; end if;
end $$;
reset role;

-- Fail-closed backfill and immutable historical content evidence.
do $$ begin
  if exists(select 1 from public.profiles where active_organization_id is null) then raise exception 'profile backfill orphan'; end if;
  if exists(select 1 from public.proposals where organization_id is null) then raise exception 'proposal backfill orphan'; end if;
  if exists(select organization_id from public.organization_memberships group by organization_id having count(*) filter(where role='owner')=0) then raise exception 'ownerless organization'; end if;
  if exists(select p.id from public.proposals p left join public.organization_memberships m on m.organization_id=p.organization_id and m.user_id=p.user_id where m.user_id is null) then raise exception 'proposal creator lacks membership'; end if;
end $$;
select version, count(*) as migration_history_rows
from supabase_migrations.schema_migrations
where version='20260925002000'
group by version;
select
  (select count(*) from public.organizations) organization_count,
  (select count(*) from public.organization_memberships) membership_count,
  (select count(*) from public.profiles where active_organization_id is null) null_active_organization_count,
  (select count(*) from public.proposals where organization_id is null) null_proposal_organization_count;
do $$ declare baseline record; current_count bigint; current_digest text; begin
  select * into baseline from r2_baseline;
  select count(*),
         encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    into current_count, current_digest
  from public.proposals where id::text not like '91000000-%';
  if current_count <> baseline.proposal_count or current_digest <> baseline.proposal_digest then
    raise exception 'pre-existing proposal digest changed during hosted matrix';
  end if;
end $$;
select b.proposal_count,
       (select count(*) from public.proposals where id::text not like '91000000-%') current_proposal_count,
       b.proposal_digest,
       (select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex') from public.proposals where id::text not like '91000000-%') current_proposal_digest
from r2_baseline b;


select
  'sql_editor_hosted_matrix' as evidence_key,
  'PASS' as verdict,
  'owner_plus_uninvited_role_denial' as matrix_scope,
  (
    select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    from public.proposals
    where id::text not like '91000000-%'
      and id::text not like '92000000-%'
      and id::text not like '93000000-%'
  ) as baseline_proposal_digest;

rollback;
