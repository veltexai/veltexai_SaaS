-- ==============================================
-- 1️⃣ Catalog of Add-On Services
-- ==============================================

create table if not exists public.additional_service_catalog (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null, -- e.g. "carpet_extraction"
  label text not null, -- e.g. "Carpet Extraction (Hot Water)"
  unit_type text not null check (unit_type in ('sqft','pane','visit','hour','flat')),
  rate numeric not null, -- price per unit
  min_qty numeric not null default 0, -- minimum units charged
  default_frequency text not null check (default_frequency in ('one_time','monthly','quarterly','annual')),
  frequency_options text[] not null, -- allowed frequencies
  amortize_to_monthly boolean not null default false,
  default_qty_source text not null default 'manual', -- 'manual','facility_sqft','windows_count', etc.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ==============================================
-- 2️⃣ Per-Proposal Selections
-- ==============================================

create table if not exists public.proposal_additional_services (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  sku text not null references public.additional_service_catalog(sku),
  label text not null,
  unit_type text not null,
  rate numeric not null,
  qty numeric not null, -- user-entered or auto-derived
  min_qty numeric not null default 0,
  frequency text not null check (frequency in ('one_time','monthly','quarterly','annual')),
  subtotal numeric generated always as (greatest(qty, min_qty) * rate) stored,
  monthly_amount numeric, -- computed in trigger
  notes text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ==============================================
-- 3️⃣ Helper Function for Monthly Amount Calculation
-- ==============================================

create or replace function public.calc_monthly_amount(
  p_subtotal numeric, 
  p_frequency text, 
  p_amortize bool
) returns numeric language sql immutable as $$
select case
  when not p_amortize then null
  when p_frequency = 'monthly' then p_subtotal
  when p_frequency = 'quarterly' then round(p_subtotal / 3.0, 2)
  when p_frequency = 'annual' then round(p_subtotal / 12.0, 2)
  else null
end;
$$;

-- ==============================================
-- 4️⃣ Trigger Function to Apply Monthly Amount Logic
-- ==============================================

create or replace function public.apply_pas_monthly()
returns trigger language plpgsql as $$
declare
  cat record;
begin
  select amortize_to_monthly into cat
  from public.additional_service_catalog
  where sku = new.sku;

  new.monthly_amount := public.calc_monthly_amount(
    new.subtotal,
    new.frequency,
    coalesce(cat.amortize_to_monthly, false)
  );
  return new;
end;
$$;

-- ==============================================
-- 5️⃣ Trigger Definition
-- ==============================================

drop trigger if exists trg_pas_monthly_amount on public.proposal_additional_services;

create trigger trg_pas_monthly_amount
before insert or update on public.proposal_additional_services
for each row execute procedure public.apply_pas_monthly();

-- ==============================================
-- 6️⃣ Row Level Security (RLS)
-- ==============================================

alter table public.additional_service_catalog enable row level security;
alter table public.proposal_additional_services enable row level security;

-- ==============================================
-- 7️⃣ Policies for Admins
-- ==============================================

drop policy if exists admin_all_catalog on public.additional_service_catalog;
create policy admin_all_catalog
on public.additional_service_catalog
for all
using (auth.jwt()->>'role' = 'admin')
with check (auth.jwt()->>'role' = 'admin');

drop policy if exists admin_all_pas on public.proposal_additional_services;
create policy admin_all_pas
on public.proposal_additional_services
for all
using (auth.jwt()->>'role' = 'admin')
with check (auth.jwt()->>'role' = 'admin');

-- ==============================================
-- 8️⃣ Policies for Regular Users (Owners)
-- ==============================================

drop policy if exists owner_pas_select on public.proposal_additional_services;
create policy owner_pas_select
on public.proposal_additional_services
for select
using (created_by = auth.uid());

drop policy if exists owner_pas_insert on public.proposal_additional_services;
create policy owner_pas_insert
on public.proposal_additional_services
for insert
with check (created_by = auth.uid());

drop policy if exists owner_pas_update on public.proposal_additional_services;
create policy owner_pas_update
on public.proposal_additional_services
for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists owner_pas_delete on public.proposal_additional_services;
create policy owner_pas_delete
on public.proposal_additional_services
for delete
using (created_by = auth.uid());

drop policy if exists catalog_read on public.additional_service_catalog;
create policy catalog_read
on public.additional_service_catalog
for select
using (true);

-- ==============================================
-- 9️⃣ Seed Initial Add-On Services
-- ==============================================

insert into public.additional_service_catalog
(sku, label, unit_type, rate, min_qty, default_frequency, frequency_options, amortize_to_monthly, default_qty_source)
values
('carpet_extraction',
 'Carpet Cleaning (Hot Water Extraction)',
 'sqft', 0.20, 2000, 'annual', array['one_time','annual'], false, 'manual'),

('strip_wax_vct',
 'Strip & Wax (VCT)',
 'sqft', 1.25, 1000, 'annual', array['one_time','annual','quarterly'], false, 'manual'),

('window_wash_in_out',
 'Window Washing (Interior/Exterior)',
 'pane', 8.00, 30, 'quarterly', array['one_time','quarterly','annual'], true, 'manual'),

('breakroom_fridge_micro',
 'Breakroom Fridge & Microwave Clean',
 'visit', 35.00, 1, 'monthly', array['monthly'], true, 'manual')
on conflict (sku) do nothing;
