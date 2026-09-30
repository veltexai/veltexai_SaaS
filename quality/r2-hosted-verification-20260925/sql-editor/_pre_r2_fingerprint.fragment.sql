-- Isolated-preview identity for the SQL Editor migration bundle.
-- Source: quality/r2-hosted-verification-20260925/preview-baseline-ynzkwctwlssjcsjmahey-20260930.json
-- A pasted ref is not evidence of database identity.
do $$
declare
  history_count bigint := 0;
  prerequisite_count bigint := 0;
  profile_count bigint;
  proposal_count bigint;
  proposal_digest text;
begin
  if current_setting('r2.sql_editor.preview_ref', true) = 'iwoaaljitifloolszxlu' then
    raise exception 'Refusing production project';
  end if;
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
     or to_regclass('public.user_template_preferences') is null
     or to_regprocedure('public._r0_can_user_access_template_impl(uuid,uuid)') is null
     or to_regprocedure('public.can_user_access_template(uuid,uuid)') is null then
    raise exception 'R2 fingerprint failed: repaired migration-029 objects are incomplete';
  end if;
  if (select count(*) from pg_class where oid in (
       'public.proposal_templates'::regclass,'public.template_tier_access'::regclass,
       'public.user_template_preferences'::regclass
     ) and relrowsecurity) <> 3
     or (select count(*) from pg_indexes where schemaname='public' and (
       (tablename='proposal_templates' and indexname in ('idx_proposal_templates_type','idx_proposal_templates_active'))
       or (tablename='template_tier_access' and indexname in ('idx_template_tier_access_tier','idx_template_tier_access_template'))
       or (tablename='user_template_preferences' and indexname='idx_user_template_preferences_user')
       or (tablename='proposals' and indexname='idx_proposals_template_id')
     )) <> 6
     or (select count(*) from pg_policies where schemaname='public' and (
       (tablename='proposal_templates' and policyname in ('Users can view active templates','Admins can manage all templates'))
       or (tablename='template_tier_access' and policyname in ('Users can view template tier access','Admins can manage template tier access'))
       or (tablename='user_template_preferences' and policyname in (
         'Users can view own template preferences','Users can insert own template preferences',
         'Users can update own template preferences','Users can delete own template preferences',
         'Admins can view all template preferences'
       ))
     )) <> 9
     or (select count(*) from pg_trigger where not tgisinternal and (
       (tgname='proposal_templates_updated_at' and tgrelid='public.proposal_templates'::regclass and tgfoid='public.handle_updated_at()'::regprocedure)
       or (tgname='user_template_preferences_updated_at' and tgrelid='public.user_template_preferences'::regclass and tgfoid='public.handle_updated_at()'::regprocedure)
     )) <> 2
     or not exists (select 1 from pg_constraint where conname='template_tier_access_template_id_fkey' and conrelid='public.template_tier_access'::regclass and confrelid='public.proposal_templates'::regclass and confdeltype='c')
     or (select count(*) from pg_constraint where conrelid in ('public.proposal_templates'::regclass,'public.template_tier_access'::regclass,'public.user_template_preferences'::regclass) and contype in ('p','u')) <> 5
     or (select count(*) from pg_constraint where conname in ('proposal_templates_template_type_check','template_tier_access_subscription_tier_check')) <> 2
     or not exists (select 1 from pg_constraint where conname='user_template_preferences_user_id_fkey' and conrelid='public.user_template_preferences'::regclass and confrelid='public.profiles'::regclass and confdeltype='c')
     or not exists (select 1 from pg_constraint where conname='user_template_preferences_preferred_template_id_fkey' and conrelid='public.user_template_preferences'::regclass and confrelid='public.proposal_templates'::regclass and confdeltype='n')
     or not exists (select 1 from pg_constraint where conname='proposals_template_id_fkey' and conrelid='public.proposals'::regclass and confrelid='public.proposal_templates'::regclass and confdeltype='n')
     or (select count(*) from information_schema.columns where table_schema='public' and ((table_name='proposal_templates' and column_name in ('id','template_config','is_active','sort_order','created_at','updated_at')) or (table_name='template_tier_access' and column_name in ('id','created_at')) or (table_name='user_template_preferences' and column_name in ('id','created_at','updated_at')) or (table_name='user_branding_settings' and column_name='template_version')) and column_default is not null) <> 12
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='proposals' and column_name='template_id' and data_type='uuid')
     or (select count(*) from public.proposal_templates) <> 4
     or (select count(*) from public.proposal_templates where name in ('Basic Professional','Executive Premium','Modern Corporate','Luxury Elite')) <> 4
     or (select count(*) from public.template_tier_access) <> 7
     or (select count(*) from public.template_tier_access tta join public.proposal_templates pt on pt.id=tta.template_id where (pt.name='Basic Professional' and tta.subscription_tier in ('starter','professional','enterprise')) or (pt.name='Executive Premium' and tta.subscription_tier in ('professional','enterprise')) or (pt.name in ('Modern Corporate','Luxury Elite') and tta.subscription_tier='enterprise')) <> 7
     or (select count(*) from public.user_template_preferences) <> 0
     or not has_table_privilege('authenticated','public.proposal_templates','SELECT,INSERT,UPDATE,DELETE')
     or not has_table_privilege('authenticated','public.template_tier_access','SELECT,INSERT,UPDATE,DELETE')
     or not has_table_privilege('authenticated','public.user_template_preferences','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'R2 fingerprint failed: migration-029 schema/policy/trigger/index/FK/seed contract is incomplete';
  end if;
  if encode(digest(pg_get_functiondef('public._r0_can_user_access_template_impl(uuid,uuid)'::regprocedure),'sha256'),'hex') <> '7c871b2d16b15e81620ed02ad786deeac3df4dc96ce15995d5d6b3f95e3b7f94'
     or encode(digest(pg_get_functiondef('public.can_user_access_template(uuid,uuid)'::regprocedure),'sha256'),'hex') <> '6cc3ca802581cd4f430e1489ff8c6cb6781e8e013c592955631f226c17563428'
     or not exists (select 1 from pg_proc p where p.oid='public._r0_can_user_access_template_impl(uuid,uuid)'::regprocedure and p.prosecdef and p.provolatile='s' and p.proconfig @> array['search_path=pg_catalog, public'])
     or not exists (select 1 from pg_proc p where p.oid='public.can_user_access_template(uuid,uuid)'::regprocedure and p.prosecdef and p.provolatile='s' and p.proconfig @> array['search_path=pg_catalog, public'])
     or position('active-free-trial exception for Executive Premium' in coalesce(obj_description('public._r0_can_user_access_template_impl(uuid,uuid)'::regprocedure),'')) = 0
     or has_function_privilege('authenticated','public._r0_can_user_access_template_impl(uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public._r0_can_user_access_template_impl(uuid,uuid)','EXECUTE')
     or not has_function_privilege('authenticated','public.can_user_access_template(uuid,uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.can_user_access_template(uuid,uuid)','EXECUTE')
     or exists (select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where p.oid in ('public._r0_can_user_access_template_impl(uuid,uuid)'::regprocedure,'public.can_user_access_template(uuid,uuid)'::regprocedure) and a.grantee=0 and a.privilege_type='EXECUTE') then
    raise exception 'R2 fingerprint failed: post-R0 template implementation/wrapper contract is absent or tampered';
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
