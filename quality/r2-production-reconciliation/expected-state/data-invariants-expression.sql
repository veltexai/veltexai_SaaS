jsonb_build_object(
  '031', case when exists (
    select 1 from information_schema.columns where table_schema='public'
      and table_name='additional_service_catalog' and column_name='category'
  ) then (select jsonb_build_object(
      'applicable',true,'null_category',x.null_category,'invalid_category',x.invalid_category,
      'null_visibility',x.null_visibility,'seed_key_count',x.seed_key_count,
      'duplicate_seed_keys',x.duplicate_seed_keys,'seed_projection_sha256',x.seed_projection_sha256
    ) from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
      select
        count(*) filter(where category is null)::bigint null_category,
        count(*) filter(where category not in ('cleaning','maintenance','specialty','seasonal','other'))::bigint invalid_category,
        count(*) filter(where show_in_proposals is null)::bigint null_visibility,
        count(*) filter(where sku in ('carpet_extraction','strip_wax_vct','window_wash_in_out','breakroom_fridge_micro'))::bigint seed_key_count,
        (count(*) filter(where sku in ('carpet_extraction','strip_wax_vct','window_wash_in_out','breakroom_fridge_micro'))-
         count(distinct sku) filter(where sku in ('carpet_extraction','strip_wax_vct','window_wash_in_out','breakroom_fridge_micro')))::bigint duplicate_seed_keys,
        encode(digest(coalesce(string_agg(
          encode(digest(jsonb_build_array(sku,category,description,show_in_proposals)::text,'sha256'),'hex'),',' order by sku
        ) filter(where sku in ('carpet_extraction','strip_wax_vct','window_wash_in_out','breakroom_fridge_micro')),''),'sha256'),'hex') seed_projection_sha256
      from public.additional_service_catalog
    $inv$,false,true,'') columns
      null_category bigint path '*[local-name()="null_category"]', invalid_category bigint path '*[local-name()="invalid_category"]',
      null_visibility bigint path '*[local-name()="null_visibility"]', seed_key_count bigint path '*[local-name()="seed_key_count"]',
      duplicate_seed_keys bigint path '*[local-name()="duplicate_seed_keys"]', seed_projection_sha256 text path '*[local-name()="seed_projection_sha256"]'
    ) x) else jsonb_build_object('applicable',false) end,

  '034', case when exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='subscription_status'
  ) then (select jsonb_build_object(
      'applicable',true,'pending_profiles',x.pending_profiles,
      'active_free_trials_missing_usage',x.active_free_trials_missing_usage,
      'usage_orphans',x.usage_orphans
    ) from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
      with captured as (select transaction_timestamp() as at)
      select
        count(*) filter(where p.subscription_status='pending')::bigint pending_profiles,
        count(*) filter(where p.subscription_status='free_trial' and p.trial_end_at>(select at from captured)
          and not exists (select 1 from public.usage u where u.user_id=p.id
            and u.period_start<=(select at from captured) and u.period_end>=(select at from captured)))::bigint active_free_trials_missing_usage,
        (select count(*) from public.usage u left join public.profiles q on q.id=u.user_id where q.id is null)::bigint usage_orphans
      from public.profiles p
    $inv$,false,true,'') columns
      pending_profiles bigint path '*[local-name()="pending_profiles"]',
      active_free_trials_missing_usage bigint path '*[local-name()="active_free_trials_missing_usage"]',
      usage_orphans bigint path '*[local-name()="usage_orphans"]'
    ) x) else jsonb_build_object('applicable',false) end,

  '041', case when exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_internal'
  ) then (select jsonb_build_object('applicable',true,'matching_internal_false',x.matching_internal_false)
    from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
      select count(*)::bigint matching_internal_false from public.profiles
      where (lower(email) like 'veltexclean+%@gmail.com' or lower(email) like '%@veltexai.com'
        or lower(email) like '%@veltexclean.com'
        or split_part(lower(email),'@',2) in ('example.com','test.com','mailinator.com'))
        and is_internal is distinct from true
    $inv$,false,true,'') columns matching_internal_false bigint path '*[local-name()="matching_internal_false"]') x)
    else jsonb_build_object('applicable',false) end,

  '20260922000000', case when to_regclass('public.service_catalog_versions') is not null
    then (select jsonb_build_object('applicable',true,'exact_rows',x.exact_rows,'key_rows',x.key_rows)
      from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
        select
          count(*) filter(where version='2026-09-22.1' and effective_date='2026-09-22'::date
            and approval_status='operator_review_required' and schema_version=1
            and description='Code-versioned residential and short-term-rental category packs. Operator and founder acceptance pending.')::bigint exact_rows,
          count(*) filter(where version='2026-09-22.1')::bigint key_rows
        from public.service_catalog_versions
      $inv$,false,true,'') columns exact_rows bigint path '*[local-name()="exact_rows"]', key_rows bigint path '*[local-name()="key_rows"]') x)
    else jsonb_build_object('applicable',false) end,

  '20260922010000', case when to_regclass('public.service_catalog_versions') is not null
    then (select jsonb_build_object('applicable',true,'exact_rows',x.exact_rows,'key_rows',x.key_rows)
      from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
        select
          count(*) filter(where version='2026-09-22.2' and effective_date='2026-09-22'::date
            and approval_status='operator_review_required' and schema_version=2
            and description='Room-sensitive per-visit pricing, private access notes and turnover agreements')::bigint exact_rows,
          count(*) filter(where version='2026-09-22.2')::bigint key_rows
        from public.service_catalog_versions
      $inv$,false,true,'') columns exact_rows bigint path '*[local-name()="exact_rows"]', key_rows bigint path '*[local-name()="key_rows"]') x)
    else jsonb_build_object('applicable',false) end,

  '20260925001000', case when to_regclass('public.pricing_source_versions') is not null
    then (select jsonb_build_object(
      'applicable',true,'source_rows',x.source_rows,'market_rows',x.market_rows,
      'wage_rows',x.wage_rows,'minimum_wage_rows',x.minimum_wage_rows,
      'rpp_rows',x.rpp_rows,'mileage_rows',x.mileage_rows,'source_checksum_matches',x.source_checksum_matches,
      'source_projection_sha256',x.source_projection_sha256,'market_projection_sha256',x.market_projection_sha256,
      'wage_projection_sha256',x.wage_projection_sha256,'minimum_wage_projection_sha256',x.minimum_wage_projection_sha256,
      'rpp_projection_sha256',x.rpp_projection_sha256,'mileage_projection_sha256',x.mileage_projection_sha256
    ) from xmltable('/*[local-name()="row"]' passing query_to_xml($inv$
      select
        (select count(*) from public.pricing_source_versions where (dataset_key,version) in (
          ('bls_oews_national_cleaning','2025-05'),('dol_state_minimum_wages','2026-07-01'),
          ('irs_business_mileage','2026-07-01'),('bea_rpp_reviewed_states','2024')))::bigint source_rows,
        (select count(*) from public.geographic_pricing_markets where dataset_version='us-location-2026-09-25.1')::bigint market_rows,
        (select count(*) from public.occupational_wage_benchmarks where dataset_version='us-location-2026-09-25.1')::bigint wage_rows,
        (select count(*) from public.minimum_wage_rules where dataset_version='us-location-2026-09-25.1')::bigint minimum_wage_rows,
        (select count(*) from public.regional_price_parities where dataset_version='us-location-2026-09-25.1')::bigint rpp_rows,
        (select count(*) from public.mileage_rate_versions where dataset_version='us-location-2026-09-25.1')::bigint mileage_rows,
        (select count(*) from public.pricing_source_versions where
          (dataset_key='bls_oews_national_cleaning' and version='2025-05' and checksum='payload-sha256:f0406deb6944518b6f8b1aa86a5e2010ea3b895b8f466473e15b2dafe196af10') or
          (dataset_key='dol_state_minimum_wages' and version='2026-07-01' and checksum='payload-sha256:7051450504ac3cf161b880e30c9497d772125de8f96287b1fd1beb94421e2ed5') or
          (dataset_key='irs_business_mileage' and version='2026-07-01' and checksum='payload-sha256:e66c57a511fd6dcc4cd0544388c4cf4572b1aa2c41f07a44f6ba9f947e764cbc') or
          (dataset_key='bea_rpp_reviewed_states' and version='2024' and checksum='payload-sha256:eeda67e6daf6fd685edda5da093e2404e71cf300e88f6fbd8f8083149c31cf30'))::bigint source_checksum_matches,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by dataset_key,version),''),'sha256'),'hex') from (
          select dataset_key,version,source_agency,source_url,source_vintage,retrieved_at,checksum,active
          from public.pricing_source_versions where (dataset_key,version) in (
            ('bls_oews_national_cleaning','2025-05'),('dol_state_minimum_wages','2026-07-01'),
            ('irs_business_mileage','2026-07-01'),('bea_rpp_reviewed_states','2024'))
        ) q)::text source_projection_sha256,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by market_code),''),'sha256'),'hex') from (
          select market_code,dataset_version,market_name,country_code,state_code,resolution,confidence
          from public.geographic_pricing_markets where dataset_version='us-location-2026-09-25.1'
        ) q)::text market_projection_sha256,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by occupation_code,statistic),''),'sha256'),'hex') from (
          select w.market_code,w.dataset_version,w.occupation_code,w.statistic,w.hourly_wage,s.dataset_key source_dataset_key,s.version source_version
          from public.occupational_wage_benchmarks w join public.pricing_source_versions s on s.id=w.source_version_id
          where w.dataset_version='us-location-2026-09-25.1'
        ) q)::text wage_projection_sha256,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by jurisdiction_code,effective_from),''),'sha256'),'hex') from (
          select w.jurisdiction_code,w.dataset_version,w.jurisdiction_type,w.hourly_floor,w.effective_from,w.confirmation_required,
            s.dataset_key source_dataset_key,s.version source_version
          from public.minimum_wage_rules w join public.pricing_source_versions s on s.id=w.source_version_id
          where w.dataset_version='us-location-2026-09-25.1'
        ) q)::text minimum_wage_projection_sha256,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by market_code,category),''),'sha256'),'hex') from (
          select r.market_code,r.dataset_version,r.category,r.parity,s.dataset_key source_dataset_key,s.version source_version
          from public.regional_price_parities r join public.pricing_source_versions s on s.id=r.source_version_id
          where r.dataset_version='us-location-2026-09-25.1'
        ) q)::text rpp_projection_sha256,
        (select encode(digest(coalesce(string_agg(to_jsonb(q)::text,',' order by dataset_version),''),'sha256'),'hex') from (
          select m.dataset_version,m.business_rate,m.effective_from,s.dataset_key source_dataset_key,s.version source_version
          from public.mileage_rate_versions m join public.pricing_source_versions s on s.id=m.source_version_id
          where m.dataset_version='us-location-2026-09-25.1'
        ) q)::text mileage_projection_sha256
    $inv$,false,true,'') columns
      source_rows bigint path '*[local-name()="source_rows"]', market_rows bigint path '*[local-name()="market_rows"]',
      wage_rows bigint path '*[local-name()="wage_rows"]', minimum_wage_rows bigint path '*[local-name()="minimum_wage_rows"]',
      rpp_rows bigint path '*[local-name()="rpp_rows"]', mileage_rows bigint path '*[local-name()="mileage_rows"]',
      source_checksum_matches bigint path '*[local-name()="source_checksum_matches"]',
      source_projection_sha256 text path '*[local-name()="source_projection_sha256"]',
      market_projection_sha256 text path '*[local-name()="market_projection_sha256"]',
      wage_projection_sha256 text path '*[local-name()="wage_projection_sha256"]',
      minimum_wage_projection_sha256 text path '*[local-name()="minimum_wage_projection_sha256"]',
      rpp_projection_sha256 text path '*[local-name()="rpp_projection_sha256"]',
      mileage_projection_sha256 text path '*[local-name()="mileage_projection_sha256"]'
    ) x) else jsonb_build_object('applicable',false) end
)
