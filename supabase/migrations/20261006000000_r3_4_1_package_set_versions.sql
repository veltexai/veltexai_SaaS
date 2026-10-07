begin;

-- R3-4.1 is additive. The accepted R3-4 migration remains byte-for-byte
-- frozen; this migration only introduces the v2 parent shape and its
-- append-only ordered package associations.
alter table public.crm_proposal_versions
  alter column estimate_run_id drop not null,
  add column package_count integer,
  add column package_set_sha256 text;

alter table public.crm_proposal_versions
  drop constraint crm_proposal_versions_schema_version_check;
alter table public.crm_proposal_versions
  add constraint crm_proposal_versions_schema_shape_check check (
    (
      schema_version='crm_proposal_version.v1'
      and estimate_run_id is not null
      and package_count is null
      and package_set_sha256 is null
    )
    or
    (
      schema_version='crm_proposal_version.v2'
      and work_package_id is null
      and estimate_run_id is null
      and package_count>0
      and package_set_sha256 ~ '^[a-f0-9]{64}$'
    )
  );

alter table public.crm_proposal_versions
  add constraint crm_proposal_versions_v2_context_unique
  unique(organization_id,id,opportunity_id,property_id);

create function public.crm_proposal_scope_lines_valid(value jsonb)
returns boolean language sql immutable security definer
set search_path=pg_catalog,public as $$
  select jsonb_typeof(value)='array'
    and not exists(
      select 1 from jsonb_array_elements(
        case when jsonb_typeof(value)='array' then value else '[]'::jsonb end
      ) item
      where jsonb_typeof(item)<>'string'
        or length(trim(item#>>'{}')) not between 1 and 1000
    )
    and jsonb_array_length(
      case when jsonb_typeof(value)='array' then value else '[]'::jsonb end
    ) between 1 and 500;
$$;
revoke all on function public.crm_proposal_scope_lines_valid(jsonb)
  from public,anon,authenticated,service_role;

create table public.crm_proposal_version_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  proposal_version_id uuid not null,
  opportunity_id uuid not null,
  property_id uuid not null,
  work_package_id uuid not null,
  estimate_run_id uuid not null,
  display_position integer not null check(display_position>0),
  customer_visible_title text not null
    check(length(trim(customer_visible_title)) between 1 and 240),
  customer_visible_scope jsonb not null
    check(public.crm_proposal_scope_lines_valid(customer_visible_scope)),
  amount_minor bigint not null check(amount_minor>=0),
  currency text not null check(currency='USD'),
  pricing_basis text not null
    check(pricing_basis in ('per_visit','per_turn','one_time')),
  estimate_input_sha256 text not null check(estimate_input_sha256 ~ '^[a-f0-9]{64}$'),
  estimate_output_sha256 text not null check(estimate_output_sha256 ~ '^[a-f0-9]{64}$'),
  scope_sha256 text not null check(scope_sha256 ~ '^[a-f0-9]{64}$'),
  association_sha256 text not null check(association_sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique(organization_id,id),
  unique(organization_id,proposal_version_id,display_position),
  unique(organization_id,proposal_version_id,work_package_id),
  foreign key(organization_id,proposal_version_id,opportunity_id,property_id)
    references public.crm_proposal_versions(
      organization_id,id,opportunity_id,property_id
    ) on delete restrict,
  foreign key(organization_id,work_package_id)
    references public.crm_site_work_packages(organization_id,id) on delete restrict,
  foreign key(organization_id,work_package_id,opportunity_id,property_id,estimate_run_id)
    references public.crm_estimate_runs(
      organization_id,work_package_id,opportunity_id,property_id,id
    ) on delete restrict
);

create index crm_proposal_version_packages_context_idx
  on public.crm_proposal_version_packages(
    organization_id,proposal_version_id,display_position
  );

alter table public.crm_proposal_version_packages enable row level security;
revoke all on public.crm_proposal_version_packages
  from public,anon,authenticated,service_role;

create trigger guard_crm_proposal_version_package_immutable
  before update or delete on public.crm_proposal_version_packages
  for each row execute function public.guard_crm_proposal_version_immutable();
create trigger guard_crm_proposal_version_package_truncate
  before truncate on public.crm_proposal_version_packages
  for each statement execute function public.guard_crm_proposal_version_immutable();

commit;
