begin;

create table if not exists public.pricing_source_versions (
  id uuid primary key default gen_random_uuid(),
  dataset_key text not null,
  version text not null,
  source_agency text not null check (source_agency in ('BLS','BEA','DOL','IRS','CENSUS','OPERATOR')),
  source_url text not null,
  source_vintage text not null,
  retrieved_at timestamptz not null,
  checksum text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(dataset_key, version)
);

create unique index if not exists pricing_source_versions_one_active
  on public.pricing_source_versions(dataset_key) where active;

create table if not exists public.geographic_pricing_markets (
  market_code text not null,
  dataset_version text not null,
  market_name text not null,
  country_code text not null default 'US' check (country_code = 'US'),
  state_code text not null check (state_code ~ '^[A-Z]{2}$'),
  resolution text not null check (resolution in ('metro','nonmetro','state','national')),
  census_geography_id text,
  confidence text not null check (confidence in ('A','B','C','D')),
  primary key (market_code, dataset_version)
);

create table if not exists public.occupational_wage_benchmarks (
  market_code text not null,
  dataset_version text not null,
  occupation_code text not null check (occupation_code in ('37-2011','37-2012')),
  statistic text not null check (statistic in ('median','mean')),
  hourly_wage numeric(10,2) not null check (hourly_wage > 0),
  source_version_id uuid not null references public.pricing_source_versions(id),
  primary key (market_code, dataset_version, occupation_code, statistic),
  foreign key (market_code, dataset_version) references public.geographic_pricing_markets(market_code, dataset_version)
);

create table if not exists public.minimum_wage_rules (
  jurisdiction_code text not null,
  dataset_version text not null,
  jurisdiction_type text not null check (jurisdiction_type in ('federal','state','county','city')),
  hourly_floor numeric(10,2) not null check (hourly_floor >= 0),
  effective_from date not null,
  effective_to date,
  confirmation_required boolean not null default false,
  source_version_id uuid not null references public.pricing_source_versions(id),
  primary key (jurisdiction_code, dataset_version, effective_from)
);

create table if not exists public.regional_price_parities (
  market_code text not null,
  dataset_version text not null,
  category text not null default 'all_items',
  parity numeric(8,2) not null check (parity between 50 and 200),
  source_version_id uuid not null references public.pricing_source_versions(id),
  primary key (market_code, dataset_version, category)
);

create table if not exists public.mileage_rate_versions (
  dataset_version text primary key,
  business_rate numeric(8,4) not null check (business_rate >= 0),
  effective_from date not null,
  effective_to date,
  source_version_id uuid not null references public.pricing_source_versions(id)
);

alter table public.pricing_source_versions enable row level security;
alter table public.geographic_pricing_markets enable row level security;
alter table public.occupational_wage_benchmarks enable row level security;
alter table public.minimum_wage_rules enable row level security;
alter table public.regional_price_parities enable row level security;
alter table public.mileage_rate_versions enable row level security;

revoke all on public.pricing_source_versions, public.geographic_pricing_markets,
  public.occupational_wage_benchmarks, public.minimum_wage_rules,
  public.regional_price_parities, public.mileage_rate_versions from anon;
grant select on public.pricing_source_versions, public.geographic_pricing_markets,
  public.occupational_wage_benchmarks, public.minimum_wage_rules,
  public.regional_price_parities, public.mileage_rate_versions to authenticated, service_role;
grant insert, update, delete on public.pricing_source_versions, public.geographic_pricing_markets,
  public.occupational_wage_benchmarks, public.minimum_wage_rules,
  public.regional_price_parities, public.mileage_rate_versions to service_role;

drop policy if exists pricing_benchmarks_authenticated_read on public.pricing_source_versions;
create policy pricing_benchmarks_authenticated_read on public.pricing_source_versions for select to authenticated using (active);
drop policy if exists pricing_markets_authenticated_read on public.geographic_pricing_markets;
create policy pricing_markets_authenticated_read on public.geographic_pricing_markets for select to authenticated using (true);
drop policy if exists pricing_wages_authenticated_read on public.occupational_wage_benchmarks;
create policy pricing_wages_authenticated_read on public.occupational_wage_benchmarks for select to authenticated using (true);
drop policy if exists pricing_minimums_authenticated_read on public.minimum_wage_rules;
create policy pricing_minimums_authenticated_read on public.minimum_wage_rules for select to authenticated using (true);
drop policy if exists pricing_rpp_authenticated_read on public.regional_price_parities;
create policy pricing_rpp_authenticated_read on public.regional_price_parities for select to authenticated using (true);
drop policy if exists pricing_mileage_authenticated_read on public.mileage_rate_versions;
create policy pricing_mileage_authenticated_read on public.mileage_rate_versions for select to authenticated using (true);

commit;
