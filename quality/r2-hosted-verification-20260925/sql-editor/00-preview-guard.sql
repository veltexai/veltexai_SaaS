-- R2 SQL Editor pre-migration fingerprint.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- The psql runners remain the hosted execution path.
-- Identity is the recorded isolated-preview baseline, not a pasted project ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.
-- Recorded preview name (not a database proof): ynzkwctwlssjcsjmahey

do $$
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
end $$;

do $$
declare
  history_count bigint := 0;
  prerequisite_count bigint := 0;
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if to_regclass('public.organizations') is not null
     or to_regprocedure('public.guard_organization_membership()') is not null then
    raise exception 'R2 fingerprint failed: database is not the recorded pre-R2 isolated preview';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    select count(*) into prerequisite_count
    from supabase_migrations.schema_migrations
    where version in (
      '001','002','003','004','005','006','009','010','011','012','013','014','015','016',
      '017','018','019','020','021','022','023','024','025','026','027','028','029','030',
      '031','032','033','034','035','036','037','038','039','040','041','20250901194222',
      '20260908000000','20260913000000','20260922000000','20260922010000',
      '20260924000000','20260924010000','20260924010500','20260924011000',
      '20260924012000','20260924013000','20260925000000','20260925001000'
    );
    select count(*) into history_count
    from supabase_migrations.schema_migrations
    where version in (
      '20260925002000',
      '20260925003000',
      '20260925004000',
      '20260925005000',
      '20260925006000'
    );
  end if;
  if history_count <> 0 then
    raise exception 'R2 fingerprint failed: R2 migration-history rows already exist';
  end if;
  if prerequisite_count <> 52
     or (select count(*) from supabase_migrations.schema_migrations) <> 52 then
    raise exception 'R2 fingerprint failed: migration history is not the exact recorded 52-version prerequisite set';
  end if;
  if to_regclass('public.proposal_templates') is null
     or to_regclass('public.template_tier_access') is null
     or to_regprocedure('public.can_user_access_template(uuid,uuid)') is null then
    raise exception 'R2 fingerprint failed: repaired migration-029 objects are incomplete';
  end if;
  if not exists (
    select 1 from pg_proc p
    where p.oid='public.can_user_access_template(uuid,uuid)'::regprocedure
      and p.prosecdef and p.proconfig @> array['search_path=public']
  ) or position(
    'active-free-trial exception for Executive Premium'
    in coalesce(obj_description('public.can_user_access_template(uuid,uuid)'::regprocedure),'')
  ) = 0 then
    raise exception 'R2 fingerprint failed: post-040 template access hardening is absent';
  end if;
  select count(*) into profile_count from public.profiles;
  select count(*) into proposal_count from public.proposals;
  select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    into proposal_digest
    from public.proposals;
  if profile_count <> 0 or proposal_count <> 0 then
    raise exception 'R2 fingerprint failed: profile/proposal counts do not match isolated-preview baseline';
  end if;
  if proposal_digest is distinct from 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' then
    raise exception 'R2 fingerprint failed: proposal-content digest does not match isolated-preview baseline';
  end if;
end $$;

select
  'sql_editor_preview_fingerprint' as evidence_key,
  'pre_r2_isolated_preview_baseline' as identity,
  (select count(*) from public.profiles) as profile_count,
  (select count(*) from public.proposals) as proposal_count,
  (
    select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    from public.proposals
  ) as proposal_content_sha256;
