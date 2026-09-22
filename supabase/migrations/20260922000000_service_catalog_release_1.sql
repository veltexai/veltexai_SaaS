-- Additive migration. No legacy service_type/frequency constraints or rows change.
begin;
create table if not exists public.service_catalog_versions (
  version text primary key,
  effective_date date not null,
  approval_status text not null check (approval_status in ('operator_review_required', 'approved', 'retired')),
  schema_version integer not null check (schema_version > 0),
  description text not null
);
insert into public.service_catalog_versions values
  ('2026-09-22.1', '2026-09-22', 'operator_review_required', 1,
   'Code-versioned residential and short-term-rental category packs. Operator and founder acceptance pending.')
on conflict (version) do nothing;
alter table public.service_catalog_versions enable row level security;
drop policy if exists service_catalog_versions_read on public.service_catalog_versions;
create policy service_catalog_versions_read on public.service_catalog_versions
  for select to authenticated using (true);
grant select on public.service_catalog_versions to authenticated;
revoke insert, update, delete on public.service_catalog_versions from anon, authenticated;

create table if not exists public.business_service_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  updated_at timestamptz not null default now()
);
alter table public.business_service_profiles enable row level security;
drop policy if exists business_service_profiles_read on public.business_service_profiles;
create policy business_service_profiles_read on public.business_service_profiles
  for select to authenticated using (user_id = auth.uid());
drop policy if exists business_service_profiles_insert on public.business_service_profiles;
create policy business_service_profiles_insert on public.business_service_profiles
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists business_service_profiles_update on public.business_service_profiles;
create policy business_service_profiles_update on public.business_service_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.business_service_profiles to authenticated;
revoke all on public.business_service_profiles from anon;

-- Snapshot stays in existing proposal JSON so old rows remain byte-for-byte intact.
-- Guard downgrade paths including direct Supabase edits in older clients.
create or replace function public.guard_proposal_catalog_version() returns trigger
language plpgsql set search_path = public as $$
begin
  if TG_OP = 'UPDATE' and old.service_specific_data ? 'catalogJob' then
    if not (coalesce(new.service_specific_data, '{}'::jsonb) ? 'catalogJob') then
      raise exception 'Catalog proposals must retain their versioned job snapshot';
    end if;
    if old.service_specific_data->'catalogJob'->>'catalogVersion' is distinct from
       new.service_specific_data->'catalogJob'->>'catalogVersion' then
      raise exception 'Catalog version changes require a new proposal';
    end if;
  end if;
  if new.service_specific_data ? 'catalogJob' then
    if new.service_type <> 'residential' or
       not exists (select 1 from public.service_catalog_versions where version = new.service_specific_data->'catalogJob'->>'catalogVersion') or
       new.service_specific_data->'catalogJob'->>'catalogVersion' is distinct from new.service_specific_data->'catalogSnapshot'->>'version' then
      raise exception 'Invalid catalog snapshot';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists proposal_catalog_version_guard on public.proposals;
create trigger proposal_catalog_version_guard before insert or update on public.proposals
  for each row execute function public.guard_proposal_catalog_version();
-- Keep taxonomy on the historical event; profile changes must not relabel old jobs.
create or replace view public.service_catalog_funnel_daily with (security_invoker = true) as
select date_trunc('day', e.created_at at time zone 'America/Los_Angeles') as day_pacific,
  coalesce(e.properties->>'business_segment', 'legacy_unspecified') as business_segment,
  e.properties->>'service_family' as service_family,
  e.properties->>'job_type' as job_type,
  e.properties->>'catalog_version' as catalog_version,
  e.event_name, count(*) as events, count(distinct e.user_id) as operators
from public.marketing_funnel_events e
join public.profiles p on p.id = e.user_id
where not coalesce(p.is_internal, false)
group by 1, 2, 3, 4, 5, 6;
revoke all on public.service_catalog_funnel_daily from anon, authenticated;
grant select on public.service_catalog_funnel_daily to service_role;
commit;
