-- R2 isolated-preview-only add-on ACL repair.
-- Status: PREPARED / NOT HOSTED-EXECUTED.
-- Source: supabase/migrations/20260925008000_r2_addon_acl_alignment.sql
-- Source SHA-256: ad6bbb6ad7c8d3d2406efe70a9cc19b025999906c963cb3f1ab65480e0b3f8c4
-- Recorded preview: ynzkwctwlssjcsjmahey. Production is not authorized.

begin;

do $$
declare
  prerequisite_count bigint;
  r2_history_count bigint;
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
  if to_regclass('public.organizations') is null
     or to_regclass('public.organization_memberships') is null
     or to_regclass('public.proposal_additional_services') is null
     or to_regclass('public.additional_service_catalog') is null then
    raise exception 'R2 add-on ACL repair refused: required installed schema is missing';
  end if;
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
  select count(*) into r2_history_count
  from supabase_migrations.schema_migrations
  where version in (
    '20260925002000','20260925003000','20260925004000','20260925005000',
    '20260925006000','20260925007000'
  );
  if (select count(*) from supabase_migrations.schema_migrations) <> 58
     or prerequisite_count <> 52
     or r2_history_count <> 6
     or exists (select 1 from supabase_migrations.schema_migrations where version = '20260925008000') then
    raise exception 'R2 add-on ACL repair refused: expected exact 58-version post-07000 history';
  end if;
  if (select count(*) from public.profiles) <> 0
     or (select count(*) from public.proposals) <> 0
     or (select count(*) from public.organizations) <> 0
     or (select count(*) from public.organization_memberships) <> 0 then
    raise exception 'R2 add-on ACL repair refused: isolated-preview baseline is not empty';
  end if;
end $$;

revoke all on table public.proposal_additional_services from anon, service_role;
grant select, insert, update, delete on table public.proposal_additional_services to authenticated;
revoke truncate, references, trigger on table public.proposal_additional_services from authenticated;

revoke all on table public.additional_service_catalog from anon, service_role;
grant select, insert, update, delete on table public.additional_service_catalog to authenticated;
revoke truncate, references, trigger on table public.additional_service_catalog from authenticated;
grant select, insert on table public.additional_service_catalog to service_role;
revoke update, delete, truncate, references, trigger on table public.additional_service_catalog from service_role;

do $$
declare
  relation_name text;
  privilege_name text;
begin
  foreach relation_name in array array['public.proposal_additional_services','public.additional_service_catalog'] loop
    foreach privilege_name in array array['SELECT','INSERT','UPDATE','DELETE'] loop
      if not has_table_privilege('authenticated', relation_name, privilege_name) then
        raise exception 'R2 add-on ACL repair failed: authenticated lacks % on %', privilege_name, relation_name;
      end if;
    end loop;
    foreach privilege_name in array array['TRUNCATE','REFERENCES','TRIGGER'] loop
      if has_table_privilege('authenticated', relation_name, privilege_name) then
        raise exception 'R2 add-on ACL repair failed: authenticated retains % on %', privilege_name, relation_name;
      end if;
    end loop;
    if has_table_privilege('anon', relation_name, 'SELECT,INSERT,UPDATE,DELETE') then
      raise exception 'R2 add-on ACL repair failed: unapproved role retains CRUD on %', relation_name;
    end if;
  end loop;
  if has_table_privilege('service_role', 'public.proposal_additional_services', 'SELECT,INSERT,UPDATE,DELETE')
     or not has_table_privilege('service_role', 'public.additional_service_catalog', 'SELECT')
     or not has_table_privilege('service_role', 'public.additional_service_catalog', 'INSERT')
     or has_table_privilege('service_role', 'public.additional_service_catalog', 'UPDATE')
     or has_table_privilege('service_role', 'public.additional_service_catalog', 'DELETE')
     or has_table_privilege('service_role', 'public.additional_service_catalog', 'TRUNCATE')
     or has_table_privilege('service_role', 'public.additional_service_catalog', 'REFERENCES')
     or has_table_privilege('service_role', 'public.additional_service_catalog', 'TRIGGER') then
    raise exception 'R2 add-on ACL repair failed: service-role privileges are not exact';
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, statements, name)
values ('20260925008000', array[]::text[], 'r2_addon_acl_alignment');

do $$
begin
  if (select count(*) from supabase_migrations.schema_migrations) <> 59
     or (select count(*) from supabase_migrations.schema_migrations where version = '20260925008000') <> 1 then
    raise exception 'R2 add-on ACL repair history postcondition failed';
  end if;
end $$;

commit;

select
  'r2_addon_acl_alignment_repair' as evidence_key,
  '20260925008000' as applied_version,
  'ad6bbb6ad7c8d3d2406efe70a9cc19b025999906c963cb3f1ab65480e0b3f8c4' as source_sha256,
  (select count(*) from supabase_migrations.schema_migrations) as migration_history_count,
  has_table_privilege('authenticated', 'public.proposal_additional_services', 'SELECT') as proposal_addons_select,
  has_table_privilege('authenticated', 'public.additional_service_catalog', 'SELECT') as addon_catalog_select;
