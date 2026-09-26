-- R2 SQL Editor single-session last-owner proof.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- SQL Editor cannot open two independent sessions. Two-session concurrency
-- remains the authoritative psql runner (run-last-owner-concurrency.sh).
-- This file proves the last-owner deny path twice in one session, then
-- rolls back and runs idempotent cleanup. UUID prefix 92000000.
-- Identity is the recorded isolated-preview fingerprint, not a pasted ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.

do $$
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
end $$;

do $$
declare
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 fingerprint failed: candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925006000'
  ) then
    raise exception 'R2 fingerprint failed: migration version is absent';
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
  if profile_count <> 1 or proposal_count <> 2 then
    raise exception 'R2 fingerprint failed: legacy profile/proposal counts do not match isolated-preview baseline';
  end if;
  if proposal_digest is distinct from 'b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f' then
    raise exception 'R2 fingerprint failed: legacy proposal-content digest does not match isolated-preview baseline';
  end if;
end $$;

begin;

do $$ begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925006000'
  ) then
    raise exception 'R2 migration version is absent';
  end if;
end $$;

insert into auth.users(id, email) values
  ('92000000-0000-4000-8000-000000000011', 'r2-concurrent-a@example.test');

do $$ begin
  if (select count(*) from public.organization_memberships
      where user_id = '92000000-0000-4000-8000-000000000011' and role = 'owner') <> 1 then
    raise exception 'last-owner signup bootstrap failed';
  end if;
end $$;

select set_config('r2.test.last_owner_org', (
  select active_organization_id::text from public.profiles
  where id = '92000000-0000-4000-8000-000000000011'
), true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-4000-8000-000000000011', true);

do $$ begin
  begin
    delete from public.organization_memberships
    where organization_id = current_setting('r2.test.last_owner_org')::uuid
      and user_id = auth.uid();
    raise exception 'last owner removed on first single-session attempt';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.organization_memberships
    where organization_id = current_setting('r2.test.last_owner_org')::uuid
      and user_id = '92000000-0000-4000-8000-000000000011';
    raise exception 'last owner removed on second sequential attempt';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.organization_memberships
      where organization_id = current_setting('r2.test.last_owner_org')::uuid
        and role = 'owner') <> 1 then
    raise exception 'single-session last-owner count changed';
  end if;
end $$;

reset role;

select
  'sql_editor_last_owner_single_session' as evidence_key,
  'PASS' as verdict,
  'single-session only; two-session concurrency remains psql-authoritative' as limitation,
  'post_r2_isolated_preview_baseline' as identity,
  current_setting('r2.test.last_owner_org')::uuid as organization_id,
  (
    select count(*) from public.organization_memberships
    where organization_id = current_setting('r2.test.last_owner_org')::uuid
      and role = 'owner'
  ) as remaining_owners;

rollback;

do $$ begin
  if exists (select 1 from auth.users where id = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.profiles where id = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.organizations where created_by = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.organization_memberships where user_id = '92000000-0000-4000-8000-000000000011') then
    raise exception 'last-owner rollback left synthetic residue';
  end if;
end $$;

-- Idempotent cleanup for an aborted prior paste that committed the 9200 fixture.
delete from auth.users where id = '92000000-0000-4000-8000-000000000011';
do $$ begin
  if exists (select 1 from auth.users where id = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.profiles where id = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.organizations where created_by = '92000000-0000-4000-8000-000000000011')
     or exists (select 1 from public.organization_memberships where user_id = '92000000-0000-4000-8000-000000000011') then
    raise exception 'last-owner cleanup left synthetic user or tenant residue';
  end if;
end $$;

select
  'sql_editor_last_owner_cleanup' as evidence_key,
  'PASS' as verdict;
