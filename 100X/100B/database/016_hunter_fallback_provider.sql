begin;

-- Add Hunter as a distinct, auditable provider source. This does not enable calls,
-- create credentials, weaken verification, or bypass suppression. Only the existing
-- controlled 100B persistence function may write Hunter results.
alter table public.prospect_contact_sources
  drop constraint if exists prospect_contact_sources_provider_check;
alter table public.prospect_contact_sources
  add constraint prospect_contact_sources_provider_check
  check (provider in ('apollo','hunter','data_axle','csv_import','referral','fixture'));

commit;
