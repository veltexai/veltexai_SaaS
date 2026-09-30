-- R2 isolated-preview-only hosted parity repair.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- Source: supabase/migrations/20260925007000_r2_service_role_proposal_read.sql
-- Source SHA-256: 20a23877c8a60e4190882c7fc35ca1027347cc9ee5470d248b136c9c9b986578
-- Recorded preview: ynzkwctwlssjcsjmahey. Production is not authorized.
-- Database-state fingerprinting is authoritative; the recorded ref is only an operator label.

begin;

do $$
declare
  r2_history_count bigint;
  prerequisite_count bigint;
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;

  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null
     or to_regclass('public.proposals') is null
     or to_regclass('public.proposal_tracking') is null then
    raise exception 'R2 repair fingerprint failed: required installed schema is missing';
  end if;

  select count(*) into r2_history_count
  from supabase_migrations.schema_migrations
  where version in (
    '20260925002000', '20260925003000', '20260925004000',
    '20260925005000', '20260925006000'
  );

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

  if (select count(*) from supabase_migrations.schema_migrations) <> 57
     or prerequisite_count <> 52
     or r2_history_count <> 5
     or exists (
       select 1 from supabase_migrations.schema_migrations
       where version = '20260925007000'
     ) then
    raise exception 'R2 repair fingerprint failed: expected exact 57-version post-R2/pre-repair history';
  end if;

  if (select count(*) from public.profiles) <> 0
     or (select count(*) from public.proposals) <> 0
     or (select count(*) from public.organizations) <> 0
     or (select count(*) from public.organization_memberships) <> 0 then
    raise exception 'R2 repair fingerprint failed: isolated-preview baseline is not empty';
  end if;

end $$;

revoke all on table public.proposals from service_role;
grant select on table public.proposals to service_role;
revoke all on table public.proposal_tracking from service_role;

do $$
begin
  if not has_table_privilege('service_role', 'public.proposals', 'SELECT')
     or has_table_privilege('service_role', 'public.proposals', 'INSERT')
     or has_table_privilege('service_role', 'public.proposals', 'UPDATE')
     or has_table_privilege('service_role', 'public.proposals', 'DELETE')
     or has_table_privilege('service_role', 'public.proposals', 'TRUNCATE')
     or has_table_privilege('service_role', 'public.proposals', 'REFERENCES')
     or has_table_privilege('service_role', 'public.proposals', 'TRIGGER')
     or has_table_privilege('service_role', 'public.proposal_tracking', 'SELECT')
     or has_table_privilege('service_role', 'public.proposal_tracking', 'INSERT')
     or has_table_privilege('service_role', 'public.proposal_tracking', 'UPDATE')
     or has_table_privilege('service_role', 'public.proposal_tracking', 'DELETE') then
    raise exception 'R2 repair postcondition failed: least-privilege ACL contract is not exact';
  end if;

  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260925007000'
  ) then
    raise exception 'R2 repair postcondition failed: history appeared before verification';
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, statements, name)
values ('20260925007000', array[]::text[], 'r2_service_role_proposal_read');

do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 58
     or (select count(*) from supabase_migrations.schema_migrations where version = '20260925007000') <> 1 then
    raise exception 'R2 repair history postcondition failed';
  end if;
end $$;

commit;

select
  'r2_service_role_proposal_read_repair' as evidence_key,
  '20260925007000' as applied_version,
  '20a23877c8a60e4190882c7fc35ca1027347cc9ee5470d248b136c9c9b986578' as source_sha256,
  (select count(*) from supabase_migrations.schema_migrations) as migration_history_count,
  has_table_privilege('service_role', 'public.proposals', 'SELECT') as service_role_proposals_select,
  has_table_privilege('service_role', 'public.proposals', 'UPDATE') as service_role_proposals_update,
  has_table_privilege('service_role', 'public.proposal_tracking', 'SELECT') as service_role_tracking_select;
