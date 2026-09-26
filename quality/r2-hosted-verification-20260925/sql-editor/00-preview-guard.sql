-- R2 SQL Editor pre-migration fingerprint.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- The psql runners remain the hosted execution path.
-- Identity is the recorded isolated-preview baseline, not a pasted project ref.
-- Production project iwoaaljitifloolszxlu is named only as defense in depth.
-- Recorded preview name (not a database proof): wcnfhriosemgchmtwgof

do $$
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
end $$;

do $$
declare
  history_count bigint := 0;
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if to_regclass('public.organizations') is not null
     or to_regprocedure('public.guard_organization_membership()') is not null then
    raise exception 'R2 fingerprint failed: database is not the recorded pre-R2 isolated preview';
  end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null then
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
  select count(*) into profile_count from public.profiles;
  select count(*) into proposal_count from public.proposals;
  select encode(digest(coalesce(string_agg(id::text || ':' || coalesce(generated_content,''), '|' order by id),''),'sha256'),'hex')
    into proposal_digest
    from public.proposals;
  if profile_count <> 1 or proposal_count <> 2 then
    raise exception 'R2 fingerprint failed: profile/proposal counts do not match isolated-preview baseline';
  end if;
  if proposal_digest is distinct from 'b6e9b28c32c8ea56f1d2110a476466fce2976be18225e3b2415b1c67009a371f' then
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
