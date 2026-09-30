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
  if (select count(*) from supabase_migrations.schema_migrations) <> 57
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '001','002','003','004','005','006','009','010','011','012','013','014','015','016',
       '017','018','019','020','021','022','023','024','025','026','027','028','029','030',
       '031','032','033','034','035','036','037','038','039','040','041','20250901194222',
       '20260908000000','20260913000000','20260922000000','20260922010000',
       '20260924000000','20260924010000','20260924010500','20260924011000',
       '20260924012000','20260924013000','20260925000000','20260925001000'
     )) <> 52
     or (select count(*) from supabase_migrations.schema_migrations where version in (
       '20260925002000','20260925003000','20260925004000','20260925005000','20260925006000'
     )) <> 5 then
    raise exception 'R2 fingerprint failed: migration history is not the exact 52 prerequisites plus five R2 versions';
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
