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
     or to_regclass('public.organization_memberships') is null then
    raise exception 'R2 candidate is not applied';
  end if;
  if not exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925007000'
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
