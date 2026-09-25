begin;

-- A national benchmark is not owned by any one state. The first foundation
-- migration was deliberately corrected before data activation.
alter table public.geographic_pricing_markets alter column state_code drop not null;
alter table public.geographic_pricing_markets drop constraint if exists geographic_pricing_markets_state_code_check;
alter table public.geographic_pricing_markets add constraint geographic_pricing_markets_state_code_check check (
  (resolution = 'national' and state_code is null)
  or (resolution <> 'national' and state_code ~ '^[A-Z]{2}$')
);

-- Checksums cover the exact canonical reviewed row payload committed with this
-- migration. They are not represented as vendor-file checksums.
insert into public.pricing_source_versions
  (dataset_key, version, source_agency, source_url, source_vintage, retrieved_at, checksum, active)
values
  ('bls_oews_national_cleaning', '2025-05', 'BLS', 'https://www.bls.gov/news.release/ocwage.t01.htm', '2025-05', '2026-09-25T12:00:00Z', 'payload-sha256:f0406deb6944518b6f8b1aa86a5e2010ea3b895b8f466473e15b2dafe196af10', true),
  ('dol_state_minimum_wages', '2026-07-01', 'DOL', 'https://www.dol.gov/agencies/whd/mw-consolidated', '2026-07-01', '2026-09-25T12:00:00Z', 'payload-sha256:7051450504ac3cf161b880e30c9497d772125de8f96287b1fd1beb94421e2ed5', true),
  ('irs_business_mileage', '2026-07-01', 'IRS', 'https://www.irs.gov/tax-professionals/standard-mileage-rates', '2026-07-01', '2026-09-25T12:00:00Z', 'payload-sha256:e66c57a511fd6dcc4cd0544388c4cf4572b1aa2c41f07a44f6ba9f947e764cbc', true),
  ('bea_rpp_reviewed_states', '2024', 'BEA', 'https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area', '2024', '2026-09-25T12:00:00Z', 'payload-sha256:eeda67e6daf6fd685edda5da093e2404e71cf300e88f6fbd8f8083149c31cf30', true)
on conflict (dataset_key, version) do update set
  source_url = excluded.source_url,
  source_vintage = excluded.source_vintage,
  retrieved_at = excluded.retrieved_at,
  checksum = excluded.checksum,
  active = excluded.active;

insert into public.geographic_pricing_markets
  (market_code, dataset_version, market_name, country_code, state_code, resolution, confidence)
values ('US-NATIONAL', 'us-location-2026-09-25.1', 'United States national fallback', 'US', null, 'national', 'D')
on conflict (market_code, dataset_version) do update set
  market_name = excluded.market_name, state_code = excluded.state_code,
  resolution = excluded.resolution, confidence = excluded.confidence;

insert into public.geographic_pricing_markets
  (market_code, dataset_version, market_name, country_code, state_code, resolution, confidence)
select 'US-' || state_code, 'us-location-2026-09-25.1', state_code || ' statewide fallback', 'US', state_code, 'state', 'C'
from (values
  ('AL'),('AK'),('AZ'),('AR'),('CA'),('CO'),('CT'),('DE'),('DC'),('FL'),('GA'),('HI'),('ID'),('IL'),('IN'),('IA'),('KS'),('KY'),('LA'),('ME'),('MD'),('MA'),('MI'),('MN'),('MS'),('MO'),('MT'),('NE'),('NV'),('NH'),('NJ'),('NM'),('NY'),('NC'),('ND'),('OH'),('OK'),('OR'),('PA'),('RI'),('SC'),('SD'),('TN'),('TX'),('UT'),('VT'),('VA'),('WA'),('WV'),('WI'),('WY')
) states(state_code)
on conflict (market_code, dataset_version) do update set
  market_name = excluded.market_name, state_code = excluded.state_code,
  resolution = excluded.resolution, confidence = excluded.confidence;

insert into public.occupational_wage_benchmarks
  (market_code, dataset_version, occupation_code, statistic, hourly_wage, source_version_id)
values
  ('US-NATIONAL', 'us-location-2026-09-25.1', '37-2011', 'median', 17.71,
    (select id from public.pricing_source_versions where dataset_key='bls_oews_national_cleaning' and version='2025-05')),
  ('US-NATIONAL', 'us-location-2026-09-25.1', '37-2012', 'median', 17.07,
    (select id from public.pricing_source_versions where dataset_key='bls_oews_national_cleaning' and version='2025-05'))
on conflict (market_code, dataset_version, occupation_code, statistic) do update set
  hourly_wage = excluded.hourly_wage, source_version_id = excluded.source_version_id;

insert into public.minimum_wage_rules
  (jurisdiction_code, dataset_version, jurisdiction_type, hourly_floor, effective_from, confirmation_required, source_version_id)
select state_code, 'us-location-2026-09-25.1', 'state', hourly_floor, '2026-07-01'::date, true,
  (select id from public.pricing_source_versions where dataset_key='dol_state_minimum_wages' and version='2026-07-01')
from (values
  ('AL',7.25),('AK',14.00),('AZ',15.15),('AR',11.00),('CA',16.90),('CO',15.16),('CT',16.94),('DE',15.00),('DC',18.40),('FL',14.00),('GA',7.25),('HI',16.00),('ID',7.25),('IL',15.00),('IN',7.25),('IA',7.25),('KS',7.25),('KY',7.25),('LA',7.25),('ME',15.10),('MD',15.00),('MA',15.00),('MI',13.73),('MN',11.41),('MS',7.25),('MO',15.00),('MT',10.85),('NE',15.00),('NV',12.00),('NH',7.25),('NJ',15.92),('NM',12.00),('NY',16.00),('NC',7.25),('ND',7.25),('OH',11.00),('OK',7.25),('OR',15.55),('PA',7.25),('RI',16.00),('SC',7.25),('SD',11.85),('TN',7.25),('TX',7.25),('UT',7.25),('VT',14.42),('VA',12.77),('WA',17.13),('WV',8.75),('WI',7.25),('WY',7.25)
) wages(state_code, hourly_floor)
on conflict (jurisdiction_code, dataset_version, effective_from) do update set
  hourly_floor = excluded.hourly_floor,
  confirmation_required = excluded.confirmation_required,
  source_version_id = excluded.source_version_id;

insert into public.regional_price_parities
  (market_code, dataset_version, category, parity, source_version_id)
select 'US-' || state_code, 'us-location-2026-09-25.1', 'all_items', parity,
  (select id from public.pricing_source_versions where dataset_key='bea_rpp_reviewed_states' and version='2024')
from (values
  ('CA',110.7),('HI',110.0),('NJ',108.8),('DC',109.9),
  ('AR',86.9),('MS',87.0),('IA',87.8),('OK',87.8)
) rpp(state_code, parity)
on conflict (market_code, dataset_version, category) do update set
  parity = excluded.parity, source_version_id = excluded.source_version_id;

insert into public.mileage_rate_versions
  (dataset_version, business_rate, effective_from, source_version_id)
values ('us-location-2026-09-25.1', 0.76, '2026-07-01',
  (select id from public.pricing_source_versions where dataset_key='irs_business_mileage' and version='2026-07-01'))
on conflict (dataset_version) do update set
  business_rate = excluded.business_rate,
  effective_from = excluded.effective_from,
  source_version_id = excluded.source_version_id;

commit;
