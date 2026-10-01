-- R2 G3 production discovery. READ ONLY: no DDL/DML and no customer content.
-- Run only after confirming the dashboard project ref is iwoaaljitifloolszxlu.
begin transaction read only;

with expected(version) as (
  values ('001'),('002'),('003'),('004'),('005'),('006'),('009'),('010'),
    ('011'),('012'),('013'),('014'),('015'),('016'),('017'),('018'),('019'),
    ('020'),('021'),('022'),('023'),('024'),('025'),('026'),('027'),('028'),
    ('029'),('030'),('20250901194222')
), history as (
  select count(*)::int as count,
    coalesce(jsonb_agg(version order by version), '[]'::jsonb) as versions
  from supabase_migrations.schema_migrations
), counts as (
  select
    (select count(*) from public.profiles)::int profiles,
    (select count(*) from public.proposals)::int proposals,
    (select count(*) from public.proposal_tracking)::int proposal_tracking,
    (select count(*) from public.company_profiles)::int company_profiles,
    (select count(*) from public.user_branding_settings)::int user_branding_settings,
    (select count(*) from public.subscriptions)::int subscriptions,
    (select count(*) from public.proposals p left join public.profiles pr on pr.id=p.user_id where pr.id is null)::int proposals_without_profile,
    (select count(*) from public.proposal_tracking t left join public.proposals p on p.id=t.proposal_id where p.id is null)::int tracking_without_proposal
), digests as (
  select
    (select encode(digest(coalesce(string_agg(id::text, ',' order by id),''),'sha256'),'hex') from public.profiles) profiles_identity,
    (select encode(digest(coalesce(string_agg(id::text||':'||user_id::text||':'||encode(digest(coalesce(generated_content,''),'sha256'),'hex'), ',' order by id),''),'sha256'),'hex') from public.proposals) proposals_identity_and_content,
    (select encode(digest(coalesce(string_agg(id::text||':'||proposal_id::text||':'||coalesce(view_count,0)::text||':'||coalesce(download_count,0)::text, ',' order by id),''),'sha256'),'hex') from public.proposal_tracking) tracking_identity_and_counters,
    (select encode(digest(coalesce(string_agg(user_id::text, ',' order by user_id),''),'sha256'),'hex') from public.user_branding_settings) branding_identity,
    (select encode(digest(coalesce(string_agg(id::text||':'||user_id::text, ',' order by id),''),'sha256'),'hex') from public.subscriptions) subscriptions_identity
), objects as (
  select jsonb_build_object(
    '031', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='031'), 'complete', (select count(*)=4 from information_schema.columns where table_schema='public' and table_name='additional_service_catalog' and column_name in ('category','show_in_proposals','description','notes'))),
    '032', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='032'), 'complete', exists(select 1 from pg_policies where schemaname='public' and tablename='additional_service_catalog' and policyname='Admins can manage add-on catalog')),
    '033', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='033'), 'complete', to_regprocedure('public.start_user_trial(uuid,text)') is not null and to_regprocedure('public.get_user_usage_info(uuid)') is not null),
    '034', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='034'), 'complete', position('free_trial' in coalesce(pg_get_functiondef(to_regprocedure('public.handle_new_user()')),''))>0),
    '035', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='035'), 'complete', to_regclass('public.email_automation_log') is not null),
    '036', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='036'), 'complete', (select count(*)=3 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('company_founded_date','industries_served','satisfaction_guarantee'))),
    '037', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='037'), 'complete', to_regclass('public.marketing_attribution') is not null and to_regclass('public.marketing_funnel_events') is not null),
    '038', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='038'), 'complete', to_regclass('public.calculator_estimate_requests') is not null),
    '039', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='039'), 'complete', to_regclass('public.acquisition_conversion_funnel') is not null and to_regprocedure('public.record_proposal_funnel_event()') is not null),
    '040', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='040'), 'complete', to_regprocedure('public.can_user_access_template(uuid,uuid)') is not null),
    '041', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='041'), 'complete', to_regclass('public.growth_funnel_daily') is not null and (select count(*)=5 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('buyer_role','cleaning_business_type','bids_per_month_bucket','qualified_at','is_internal'))),
    '20260908000000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260908000000'), 'complete', to_regprocedure('public.protect_profile_entitlements()') is not null),
    '20260913000000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260913000000'), 'complete', exists(select 1 from pg_constraint where conname='proposals_service_frequency_check' and position('6x-week' in pg_get_constraintdef(oid))>0)),
    '20260922000000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260922000000'), 'complete', to_regclass('public.service_catalog_versions') is not null and to_regclass('public.business_service_profiles') is not null),
    '20260922010000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260922010000'), 'complete', to_regprocedure('public.read_tracked_proposal(text)') is not null),
    '20260924000000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924000000'), 'complete', to_regprocedure('public.r0_assert_self_or_service(uuid)') is not null),
    '20260924010000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924010000'), 'complete', to_regclass('public.enhanced_proposals') is not null and coalesce((select reloptions @> array['security_invoker=true'] from pg_class where oid=to_regclass('public.enhanced_proposals')),false)),
    '20260924010500', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924010500'), 'complete', exists(select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Admins can view all profiles' and coalesce(qual,'') like '%is_admin%')),
    '20260924011000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924011000'), 'complete', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='logo_url')),
    '20260924012000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924012000'), 'complete', exists(select 1 from pg_constraint where conname='proposal_tracking_delivery_method_check' and position('pdf_only' in pg_get_constraintdef(oid))>0 and position('online_only' in pg_get_constraintdef(oid))>0)),
    '20260924013000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260924013000'), 'complete', to_regprocedure('public.record_tracked_view(text)') is not null and to_regprocedure('public.tracked_proposal_has_paid_access(text)') is not null),
    '20260925000000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260925000000'), 'complete', to_regclass('public.pricing_source_versions') is not null and to_regclass('public.geographic_pricing_markets') is not null),
    -- 250010 is a seed-only migration. Table absence proves it is absent in the
    -- current production baseline; exact seed cardinalities are postconditions
    -- of the apply step, not guessed through a reference to an absent table.
    '20260925001000', jsonb_build_object('history', exists(select 1 from supabase_migrations.schema_migrations where version='20260925001000'), 'complete', to_regclass('public.pricing_source_versions') is not null)
  ) value
), r2 as (
  select not exists(select 1 from supabase_migrations.schema_migrations where version >= '20260925002000')
    and to_regclass('public.organizations') is null
    and to_regclass('public.organization_memberships') is null as absent
)
select jsonb_pretty(jsonb_build_object(
  'contract_version',1,'captured_at',clock_timestamp(),'project_ref','OPERATOR_MUST_RECORD_DASHBOARD_REF',
  'environment','production','read_only',true,
  'migration_history',jsonb_build_object('count',h.count,'versions',h.versions),
  'row_counts',jsonb_build_object('profiles',c.profiles,'proposals',c.proposals,'proposal_tracking',c.proposal_tracking,'company_profiles',c.company_profiles,'user_branding_settings',c.user_branding_settings,'subscriptions',c.subscriptions),
  'orphan_counts',jsonb_build_object('proposals_without_profile',c.proposals_without_profile,'tracking_without_proposal',c.tracking_without_proposal),
  'content_digests',to_jsonb(d), 'steps',o.value, 'r2_absent',r.absent
)) as redacted_fingerprint
from history h cross join counts c cross join digests d cross join objects o cross join r2 r;

rollback;
