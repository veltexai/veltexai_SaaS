-- Run after the migration chain. Metadata/ACL assertions require no customer data.
do $$
declare definition text; signature regprocedure;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='proposal_tracking'
      and column_name='revoked_at' and is_nullable='YES'
  ) then raise exception 'revoked_at must exist and remain nullable'; end if;

  if has_function_privilege('anon','public.revoke_tracked_proposal_link(uuid,uuid,text)','execute')
     or not has_function_privilege('authenticated','public.revoke_tracked_proposal_link(uuid,uuid,text)','execute') then
    raise exception 'revocation RPC ACL mismatch';
  end if;
  if has_table_privilege('authenticated','public.proposal_tracking','update')
     or has_table_privilege('anon','public.proposal_tracking','update') then
    raise exception 'browser role regained direct tracking update';
  end if;

  foreach signature in array array[
    'public.read_tracked_proposal(text)'::regprocedure,
    'public.read_tracked_proposal_print(text)'::regprocedure,
    'public.record_tracked_view(text)'::regprocedure,
    'public.record_tracked_download(text)'::regprocedure,
    'public.record_tracking_click(text,text,text,text)'::regprocedure,
    'public.record_tracking_metric(text,text,integer)'::regprocedure,
    'public.tracked_proposal_has_paid_access(text)'::regprocedure
  ] loop
    definition := pg_get_functiondef(signature);
    if position('revoked_at is null' in lower(definition)) = 0 then
      raise exception 'token function lacks fail-closed revocation predicate';
    end if;
    if not exists (
      select 1 from pg_proc where oid=signature
        and proconfig @> array['search_path=pg_catalog, public']
    ) then
      raise exception 'token function search_path is not pinned';
    end if;
  end loop;
end $$;

-- Execute the authorization and lifecycle contract against disposable synthetic
-- tenants. Every mutation rolls back with this transaction.
begin;

alter table public.profiles disable trigger profiles_protect_entitlements;
alter table public.organization_memberships disable trigger guard_organization_membership_changes;
insert into auth.users(id,email) values
  ('44444444-4444-4444-8444-444444444444','admin@example.test'),
  ('55555555-5555-4555-8555-555555555555','estimator@example.test'),
  ('66666666-6666-4666-8666-666666666666','viewer@example.test');
-- The enclosing transaction rolls back the temporary trigger disable. Re-enabling
-- it before rollback is invalid while signup-trigger events are still pending.

select set_config('revocation.test.organization', active_organization_id::text, true)
from public.profiles where id='11111111-1111-4111-8111-111111111111';
select set_config('revocation.test.tracking', id::text, true)
from public.proposal_tracking where tracking_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select set_config('revocation.test.legacy_tracking', id::text, true)
from public.proposal_tracking where tracking_id='track_1790000000000_abc123xyz';

insert into public.organization_memberships(organization_id,user_id,role) values
  (current_setting('revocation.test.organization')::uuid,'44444444-4444-4444-8444-444444444444','admin'),
  (current_setting('revocation.test.organization')::uuid,'55555555-5555-4555-8555-555555555555','estimator'),
  (current_setting('revocation.test.organization')::uuid,'66666666-6666-4666-8666-666666666666','viewer');

set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
do $$ begin
  if public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', null
  ) then raise exception 'estimator revoked a tracked link'; end if;
end $$;

select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
do $$ begin
  if public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', null
  ) then raise exception 'viewer revoked a tracked link'; end if;
end $$;

select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  if public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', null
  ) then raise exception 'cross-tenant user revoked a tracked link'; end if;
end $$;

select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
do $$ declare before_audit integer; after_audit integer; begin
  if public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '77777777-7777-4777-8777-777777777777', null
  ) then raise exception 'admin revoked a token through the wrong proposal id'; end if;
  select count(*) into before_audit from public.organization_audit_log
   where action='proposal_tracking.revoked' and entity_id=current_setting('revocation.test.tracking');
  if not public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', 'Replaced proposal'
  ) then raise exception 'admin could not revoke a same-tenant link'; end if;
  if not public.revoke_tracked_proposal_link(
    current_setting('revocation.test.tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', 'Duplicate request'
  ) then raise exception 'idempotent revoke did not return success'; end if;
  select count(*) into after_audit from public.organization_audit_log
   where action='proposal_tracking.revoked' and entity_id=current_setting('revocation.test.tracking');
  if after_audit <> before_audit + 1 then raise exception 'revocation audit was missing or duplicated'; end if;
end $$;

reset role;
do $$ begin
  if not exists (
    select 1 from public.proposal_tracking
    where id=current_setting('revocation.test.tracking')::uuid
      and revoked_at is not null
      and revoked_by='44444444-4444-4444-8444-444444444444'
      and revocation_reason='Replaced proposal'
  ) then raise exception 'revocation actor or reason was not persisted'; end if;
end $$;

set local role anon;
do $$ begin
  if public.read_tracked_proposal('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') is not null
     or public.read_tracked_proposal_print('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') is not null
     or public.tracked_proposal_has_paid_access('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     or public.record_tracked_view('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     or public.record_tracked_download('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     or public.record_tracking_click('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','button',null,null)
     or public.record_tracking_metric('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','time',10)
  then raise exception 'revoked token retained public access'; end if;
  if public.read_tracked_proposal('track_1790000000000_abc123xyz') is null then
    raise exception 'revoking one delivery disabled another token';
  end if;
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ begin
  if not public.revoke_tracked_proposal_link(
    current_setting('revocation.test.legacy_tracking')::uuid,
    '33333333-3333-4333-8333-333333333333', null
  ) then raise exception 'owner could not revoke a same-tenant link'; end if;
end $$;

rollback;
