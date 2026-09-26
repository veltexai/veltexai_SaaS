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
