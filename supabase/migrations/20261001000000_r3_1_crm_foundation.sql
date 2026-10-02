-- R3-1 CRM / sales-pipeline foundation (Prompt 3 S1 + S2 only).
-- Additive and tenant-bound. This migration does not rewrite proposal content,
-- pricing, tracking, billing, attribution, or invitation state.
begin;

create table public.crm_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_type text not null check (customer_type in ('commercial', 'household')),
  name text not null check (length(trim(name)) between 1 and 200),
  source text not null default 'manual' check (source in ('manual', 'lead_conversion', 'legacy_link')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);
create index crm_customers_org_name_idx on public.crm_customers(organization_id, lower(name))
  where deleted_at is null;

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  first_name text,
  last_name text,
  email text,
  phone text,
  preferred_channel text check (preferred_channel is null or preferred_channel in ('email', 'phone', 'sms')),
  timezone text,
  do_not_contact boolean not null default false,
  do_not_contact_reason text,
  source text not null default 'manual' check (source in ('manual', 'lead_conversion', 'legacy_link')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (nullif(trim(coalesce(first_name, '')), '') is not null
    or nullif(trim(coalesce(last_name, '')), '') is not null
    or nullif(trim(coalesce(email, '')), '') is not null
    or nullif(trim(coalesce(phone, '')), '') is not null),
  check (email is null or length(email) <= 320),
  check (phone is null or length(phone) <= 40),
  unique (organization_id, id)
);
create index crm_contacts_org_email_idx on public.crm_contacts(organization_id, lower(email))
  where email is not null and deleted_at is null;
create index crm_contacts_org_phone_idx on public.crm_contacts(organization_id, phone)
  where phone is not null and deleted_at is null;

create table public.crm_customer_contacts (
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  contact_id uuid not null,
  contact_role text not null default 'other'
    check (contact_role in ('decision_maker', 'site_contact', 'billing', 'property_manager', 'other')),
  is_primary boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, customer_id, contact_id, contact_role),
  foreign key (organization_id, customer_id)
    references public.crm_customers(organization_id, id) on delete cascade,
  foreign key (organization_id, contact_id)
    references public.crm_contacts(organization_id, id) on delete cascade
);

create table public.crm_properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid,
  name text not null check (length(trim(name)) between 1 and 200),
  address_line_1 text,
  address_line_2 text,
  city text,
  region text,
  postal_code text,
  country_code text not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  timezone text,
  owner_name text,
  source text not null default 'manual' check (source in ('manual', 'lead_conversion', 'legacy_link')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.crm_customers(organization_id, id) on delete restrict
);
create index crm_properties_org_customer_idx
  on public.crm_properties(organization_id, customer_id) where deleted_at is null;
create index crm_properties_org_address_idx
  on public.crm_properties(organization_id, lower(address_line_1), lower(postal_code))
  where address_line_1 is not null and deleted_at is null;

create table public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  template_key text not null check (template_key in ('commercial_facility_v1', 'residential_turnover_v1')),
  segment text not null check (segment in ('commercial', 'residential_turnover')),
  is_default boolean not null default false,
  archived boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, template_key)
);
create unique index crm_pipelines_one_default_per_segment_idx
  on public.crm_pipelines(organization_id, segment) where is_default and not archived;

create table public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  pipeline_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 120),
  category text not null check (category in (
    'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
    'won', 'handed_off', 'lost', 'disqualified', 'nurture'
  )),
  position integer not null check (position >= 0),
  gate_rules jsonb not null default '{}'::jsonb check (jsonb_typeof(gate_rules) = 'object'),
  stale_after interval check (stale_after is null or stale_after > interval '0 seconds'),
  hidden boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (pipeline_id, position),
  foreign key (organization_id, pipeline_id)
    references public.crm_pipelines(organization_id, id) on delete cascade
);
create index crm_pipeline_stages_pipeline_idx
  on public.crm_pipeline_stages(organization_id, pipeline_id, position);

create table public.crm_loss_reasons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9][a-z0-9_]{1,79}$'),
  label text not null check (length(trim(label)) between 1 and 120),
  canonical_category text not null check (canonical_category in (
    'price', 'timing', 'scope_mismatch', 'incumbent_retained', 'no_decision',
    'competitor', 'unqualified', 'unknown'
  )),
  applies_to text not null check (applies_to in ('lost', 'disqualified', 'both')),
  active boolean not null default true,
  is_unvalidated_default boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, code)
);

create table public.crm_lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  channel text not null check (channel in (
    'web_form', 'referral', 'phone', 'email', 'api', 'import', 'event', 'other'
  )),
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, name)
);

create table public.crm_referral_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 160),
  contact_id uuid,
  partner_type text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, contact_id)
    references public.crm_contacts(organization_id, id) on delete restrict
);

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'converted', 'junk', 'merged', 'disqualified')),
  intake_method text not null default 'manual' check (intake_method in ('manual', 'direct_opportunity')),
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  lead_source_id uuid,
  referral_source_id uuid,
  customer_name text,
  contact_name text,
  email text,
  phone text,
  property_name text,
  service_location text,
  raw_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_payload) = 'object' and octet_length(raw_payload::text) <= 16384),
  dedupe_hint jsonb not null default '{}'::jsonb check (jsonb_typeof(dedupe_hint) = 'object'),
  junk_reason text,
  assigned_to_user_id uuid,
  converted_customer_id uuid,
  converted_contact_id uuid,
  converted_property_id uuid,
  converted_opportunity_id uuid,
  source text not null default 'manual' check (source in ('manual', 'direct_opportunity')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, lead_source_id)
    references public.crm_lead_sources(organization_id, id) on delete restrict,
  foreign key (organization_id, referral_source_id)
    references public.crm_referral_sources(organization_id, id) on delete restrict,
  foreign key (organization_id, assigned_to_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, converted_customer_id)
    references public.crm_customers(organization_id, id) on delete restrict,
  foreign key (organization_id, converted_contact_id)
    references public.crm_contacts(organization_id, id) on delete restrict,
  foreign key (organization_id, converted_property_id)
    references public.crm_properties(organization_id, id) on delete restrict
);
create index crm_leads_org_status_idx on public.crm_leads(organization_id, status, created_at desc)
  where deleted_at is null;
create index crm_leads_org_email_idx on public.crm_leads(organization_id, lower(email))
  where email is not null and deleted_at is null;

create table public.crm_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  customer_id uuid not null,
  property_id uuid,
  pipeline_id uuid not null,
  stage_id uuid not null,
  lead_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  name text not null check (length(trim(name)) between 1 and 200),
  owner_user_id uuid not null,
  estimator_user_id uuid,
  segment text not null check (segment in ('commercial', 'residential', 'turnover', 'specialty')),
  service_family text,
  expected_close_date date,
  value_amount_minor bigint check (value_amount_minor is null or value_amount_minor >= 0),
  value_basis text check (value_basis is null or value_basis in (
    'one_time', 'per_visit', 'weekly', 'monthly', 'annual'
  )),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  loss_reason_id uuid,
  competitor_text text,
  reactivated_from_id uuid,
  is_parent boolean not null default false,
  acceptance_method text check (acceptance_method is null or acceptance_method in (
    'customer_acceptance', 'manual', 'manual_legacy'
  )),
  manual_win_reason text,
  next_action_due_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'lead_conversion', 'reactivation')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, customer_id)
    references public.crm_customers(organization_id, id) on delete restrict,
  foreign key (organization_id, property_id)
    references public.crm_properties(organization_id, id) on delete restrict,
  foreign key (organization_id, pipeline_id)
    references public.crm_pipelines(organization_id, id) on delete restrict,
  foreign key (organization_id, stage_id)
    references public.crm_pipeline_stages(organization_id, id) on delete restrict,
  foreign key (organization_id, lead_id)
    references public.crm_leads(organization_id, id) on delete restrict,
  foreign key (organization_id, owner_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, estimator_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, loss_reason_id)
    references public.crm_loss_reasons(organization_id, id) on delete restrict,
  foreign key (organization_id, reactivated_from_id)
    references public.crm_opportunities(organization_id, id) on delete restrict,
  check ((value_amount_minor is null and value_basis is null and currency is null)
    or (value_amount_minor is not null and value_basis is not null and currency is not null)),
  check (acceptance_method <> 'manual' or nullif(trim(coalesce(manual_win_reason, '')), '') is not null)
);
create index crm_opportunities_org_stage_idx
  on public.crm_opportunities(organization_id, stage_id, created_at desc) where deleted_at is null;
create index crm_opportunities_org_assignment_idx
  on public.crm_opportunities(organization_id, estimator_user_id, owner_user_id)
  where deleted_at is null;

alter table public.crm_leads add foreign key (organization_id, converted_opportunity_id)
  references public.crm_opportunities(organization_id, id) on delete restrict;

create table public.crm_walkthroughs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  property_id uuid not null,
  estimator_user_id uuid not null,
  site_contact_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  window_start timestamptz not null,
  window_end timestamptz not null,
  timezone text not null check (length(trim(timezone)) between 1 and 80),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'rescheduled', 'cancelled', 'no_show')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, property_id)
    references public.crm_properties(organization_id, id) on delete restrict,
  foreign key (organization_id, estimator_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, site_contact_id)
    references public.crm_contacts(organization_id, id) on delete restrict,
  check (window_end > window_start)
);
create index crm_walkthroughs_estimator_window_idx
  on public.crm_walkthroughs(organization_id, estimator_user_id, window_start, window_end)
  where status in ('scheduled', 'rescheduled');

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid,
  lead_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  title text not null check (length(trim(title)) between 1 and 240),
  due_at timestamptz,
  timezone text,
  assignee_user_id uuid not null,
  status text not null default 'open' check (status in ('open', 'completed', 'cancelled')),
  snoozed_until timestamptz,
  created_from text not null default 'manual' check (created_from in ('manual', 'template')),
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, lead_id)
    references public.crm_leads(organization_id, id) on delete cascade,
  foreign key (organization_id, assignee_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  check ((opportunity_id is not null)::int + (lead_id is not null)::int = 1),
  check ((status = 'completed') = (completed_at is not null))
);
create index crm_tasks_org_followup_idx
  on public.crm_tasks(organization_id, status, due_at) where status = 'open';

create unique index if not exists proposals_organization_id_unique
  on public.proposals(organization_id, id);

create table public.crm_site_work_packages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  property_id uuid not null,
  status text not null default 'scoping' check (status in (
    'scoping', 'walkthrough_scheduled', 'estimated', 'proposed', 'accepted', 'declined'
  )),
  walkthrough_id uuid,
  proposal_id uuid,
  idempotency_key text not null check (length(idempotency_key) between 8 and 200),
  loss_reason_id uuid,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, idempotency_key),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, property_id)
    references public.crm_properties(organization_id, id) on delete restrict,
  foreign key (organization_id, walkthrough_id)
    references public.crm_walkthroughs(organization_id, id) on delete restrict,
  foreign key (organization_id, proposal_id)
    references public.proposals(organization_id, id) on delete restrict,
  foreign key (organization_id, loss_reason_id)
    references public.crm_loss_reasons(organization_id, id) on delete restrict
);

create table public.crm_opportunity_stage_history (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  from_stage_id uuid,
  to_stage_id uuid not null,
  from_category text check (from_category is null or from_category in (
    'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
    'won', 'handed_off', 'lost', 'disqualified', 'nurture'
  )),
  to_category text not null check (to_category in (
    'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
    'won', 'handed_off', 'lost', 'disqualified', 'nurture'
  )),
  actor_user_id uuid references public.profiles(id) on delete set null,
  reason_code text,
  occurred_at timestamptz not null default now(),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, from_stage_id)
    references public.crm_pipeline_stages(organization_id, id) on delete restrict,
  foreign key (organization_id, to_stage_id)
    references public.crm_pipeline_stages(organization_id, id) on delete restrict
);
create index crm_stage_history_opportunity_idx
  on public.crm_opportunity_stage_history(organization_id, opportunity_id, occurred_at, id);

-- Command receipts make stage moves safe to retry without duplicating the
-- immutable stage-history event. They are writable only through the
-- caller-bound transition RPC below.
create table public.crm_opportunity_stage_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  command_key text not null check (length(command_key) between 8 and 200),
  target_stage_id uuid not null,
  loss_reason_id uuid,
  manual_win_reason text,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (organization_id, command_key),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, target_stage_id)
    references public.crm_pipeline_stages(organization_id, id) on delete restrict,
  foreign key (organization_id, loss_reason_id)
    references public.crm_loss_reasons(organization_id, id) on delete restrict
);
create index crm_stage_commands_opportunity_idx
  on public.crm_opportunity_stage_commands(organization_id, opportunity_id, completed_at);

create table public.crm_task_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  task_id uuid not null,
  command_key text not null check (length(command_key) between 8 and 200),
  action text not null check (action in ('complete', 'snooze')),
  snoozed_until timestamptz,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (organization_id, command_key),
  foreign key (organization_id, task_id)
    references public.crm_tasks(organization_id, id) on delete cascade,
  check ((action = 'snooze') = (snoozed_until is not null))
);
create index crm_task_commands_task_idx
  on public.crm_task_commands(organization_id, task_id, completed_at);

create table public.crm_assignment_commands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  command_key text not null check (length(command_key) between 8 and 200),
  owner_user_id uuid not null,
  estimator_user_id uuid,
  transfer_open_tasks boolean not null default false,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  unique (organization_id, command_key),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, owner_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict,
  foreign key (organization_id, estimator_user_id)
    references public.organization_memberships(organization_id, user_id) on delete restrict
);

create table public.crm_attribution_touches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  lead_id uuid,
  opportunity_id uuid,
  touch_type text not null check (touch_type in ('first', 'last', 'other')),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_path text,
  referrer_host text,
  click_id_hash text check (click_id_hash is null or click_id_hash ~ '^[a-f0-9]{64}$'),
  captured_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (organization_id, id),
  foreign key (organization_id, lead_id)
    references public.crm_leads(organization_id, id) on delete cascade,
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade,
  check ((lead_id is not null)::int + (opportunity_id is not null)::int = 1)
);

create table public.crm_qualification_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  opportunity_id uuid not null,
  checklist_version text not null check (length(trim(checklist_version)) between 1 and 80),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  outcome text not null check (outcome in ('fit', 'not_fit', 'needs_review')),
  specialist_review_flag boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, id),
  foreign key (organization_id, opportunity_id)
    references public.crm_opportunities(organization_id, id) on delete cascade
);

-- Additive CRM links only. Existing proposal rows and bytes are unchanged.
alter table public.proposals add column crm_opportunity_id uuid;
alter table public.proposals add column crm_customer_id uuid;
alter table public.proposals add column crm_property_id uuid;
alter table public.proposals add constraint proposals_crm_opportunity_fk
  foreign key (organization_id, crm_opportunity_id)
  references public.crm_opportunities(organization_id, id) on delete restrict;
alter table public.proposals add constraint proposals_crm_customer_fk
  foreign key (organization_id, crm_customer_id)
  references public.crm_customers(organization_id, id) on delete restrict;
alter table public.proposals add constraint proposals_crm_property_fk
  foreign key (organization_id, crm_property_id)
  references public.crm_properties(organization_id, id) on delete restrict;
create index proposals_crm_opportunity_idx on public.proposals(organization_id, crm_opportunity_id)
  where crm_opportunity_id is not null;

-- The R2 generic ownership trigger is safe for every table with an
-- organization_id field. It prevents cross-tenant reassignment in place.
do $crm_guard_triggers$
declare table_name text;
begin
  foreach table_name in array array[
    'crm_customers', 'crm_contacts', 'crm_customer_contacts', 'crm_properties',
    'crm_pipelines', 'crm_pipeline_stages', 'crm_loss_reasons', 'crm_lead_sources',
    'crm_referral_sources', 'crm_leads', 'crm_opportunities', 'crm_walkthroughs',
    'crm_tasks', 'crm_site_work_packages', 'crm_attribution_touches',
    'crm_qualification_responses'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.guard_organization_owned_record()',
      table_name || '_organization_guard', table_name
    );
  end loop;
end
$crm_guard_triggers$;

-- Immutable pipeline category once a stage has held an opportunity.
create function public.guard_crm_pipeline_stage()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  if tg_op = 'DELETE' then
    if old.category in ('won', 'lost', 'disqualified') then
      raise exception 'won, lost and disqualified stages cannot be deleted' using errcode = '23514';
    end if;
    return old;
  end if;
  if new.organization_id is distinct from old.organization_id
     or new.pipeline_id is distinct from old.pipeline_id then
    raise exception 'pipeline stage ownership cannot change' using errcode = '42501';
  end if;
  if new.category is distinct from old.category and exists (
    select 1 from public.crm_opportunities o where o.stage_id = old.id
  ) then
    raise exception 'a used pipeline stage requires the reviewed remap workflow'
      using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.guard_crm_pipeline_stage() from public, anon, authenticated;
create trigger crm_pipeline_stage_guard before update or delete on public.crm_pipeline_stages
  for each row execute function public.guard_crm_pipeline_stage();

create function public.validate_crm_opportunity_stage()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare target_category text; pipeline_template text; reason_applies text;
begin
  select s.category, p.template_key into target_category, pipeline_template
  from public.crm_pipeline_stages s
  join public.crm_pipelines p
    on p.organization_id = s.organization_id and p.id = s.pipeline_id
  where s.organization_id = new.organization_id
    and s.id = new.stage_id
    and p.id = new.pipeline_id;
  if target_category is null then
    raise exception 'stage must belong to the selected pipeline and organization'
      using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    if new.reactivated_from_id is null and target_category <> 'new' then
      raise exception 'new opportunities must begin in the new category' using errcode = '23514';
    end if;
    if new.reactivated_from_id is not null and target_category <> 'qualifying' then
      raise exception 'reactivated opportunities must begin in qualifying' using errcode = '23514';
    end if;
  elsif new.stage_id is not distinct from old.stage_id then
    return new;
  end if;
  if target_category = 'walkthrough' and not exists (
    select 1 from public.crm_walkthroughs w
    where w.organization_id = new.organization_id and w.opportunity_id = new.id
      and w.status in ('scheduled', 'rescheduled')
  ) then
    raise exception 'schedule a walkthrough before moving to this stage' using errcode = '23514';
  end if;
  if target_category = 'estimating' and new.property_id is null then
    raise exception 'link a property before estimating' using errcode = '23514';
  end if;
  if target_category = 'estimating' and pipeline_template <> 'residential_turnover_v1'
     and not exists (
       select 1 from public.crm_walkthroughs w
       where w.organization_id = new.organization_id and w.opportunity_id = new.id
         and w.status in ('scheduled', 'rescheduled')
     ) then
    raise exception 'schedule a walkthrough before estimating' using errcode = '23514';
  end if;
  if target_category in ('proposing', 'negotiating') and not exists (
    select 1 from public.proposals p
    where p.organization_id = new.organization_id and p.crm_opportunity_id = new.id
      and p.status::text in ('sent', 'accepted')
  ) then
    raise exception 'link a sent proposal before moving to this stage' using errcode = '23514';
  end if;
  if target_category = 'won' and (
    new.acceptance_method is distinct from 'manual'
    or nullif(trim(coalesce(new.manual_win_reason, '')), '') is null
  ) then
    raise exception 'R3-1 manual wins require a reason' using errcode = '23514';
  end if;
  if target_category = 'won' and not public.can_manage_organization(new.organization_id) then
    raise exception 'manual wins require owner or admin' using errcode = '42501';
  end if;
  if target_category = 'handed_off' then
    raise exception 'handoff is unavailable until the reviewed R3-6 workflow' using errcode = '23514';
  end if;
  if target_category in ('lost', 'disqualified') then
    select r.applies_to into reason_applies from public.crm_loss_reasons r
    where r.organization_id = new.organization_id and r.id = new.loss_reason_id and r.active;
    if reason_applies is null
       or not (reason_applies = 'both' or reason_applies = target_category) then
      raise exception '% requires an applicable active reason', target_category using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_crm_opportunity_stage() from public, anon, authenticated;
create trigger validate_crm_opportunity_stage_trigger
  before insert or update of stage_id on public.crm_opportunities
  for each row execute function public.validate_crm_opportunity_stage();

create function public.guard_crm_opportunity_assignment()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  if tg_op = 'UPDATE' and (
    new.owner_user_id is distinct from old.owner_user_id
    or new.estimator_user_id is distinct from old.estimator_user_id
  ) and not public.can_manage_organization(new.organization_id) then
    raise exception 'opportunity assignment requires owner or admin' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.created_by is distinct from old.created_by then
    raise exception 'opportunity creator attribution is immutable' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function public.guard_crm_opportunity_assignment() from public, anon, authenticated;
create trigger guard_crm_opportunity_assignment_trigger
  before update of owner_user_id, estimator_user_id, created_by on public.crm_opportunities
  for each row execute function public.guard_crm_opportunity_assignment();

create function public.record_crm_stage_history()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare old_category text; new_category text;
begin
  if tg_op = 'UPDATE' and new.stage_id is not distinct from old.stage_id then return new; end if;
  if tg_op = 'UPDATE' then
    select category into old_category from public.crm_pipeline_stages where id = old.stage_id;
  end if;
  select category into new_category from public.crm_pipeline_stages where id = new.stage_id;
  insert into public.crm_opportunity_stage_history(
    organization_id, opportunity_id, from_stage_id, to_stage_id,
    from_category, to_category, actor_user_id, reason_code
  ) values (
    new.organization_id, new.id,
    case when tg_op = 'UPDATE' then old.stage_id else null end,
    new.stage_id, old_category, new_category, auth.uid(),
    case
      when new_category = 'won' then 'manual_win'
      when new_category in ('lost', 'disqualified') then new.loss_reason_id::text
      else null
    end
  );
  return new;
end $$;
revoke all on function public.record_crm_stage_history() from public, anon, authenticated;
create trigger record_crm_stage_history_trigger
  after insert or update of stage_id on public.crm_opportunities
  for each row execute function public.record_crm_stage_history();

create function public.block_crm_stage_history_mutation()
returns trigger language plpgsql
set search_path = pg_catalog, public as $$
begin
  raise exception 'opportunity stage history is append-only' using errcode = '42501';
end $$;
revoke all on function public.block_crm_stage_history_mutation() from public, anon, authenticated;
create trigger block_crm_stage_history_mutation_trigger
  before update or delete on public.crm_opportunity_stage_history
  for each row execute function public.block_crm_stage_history_mutation();

-- Caller-bound assigned-scope helper. The UUID result is never exposed; callers
-- learn only whether they may operate on the referenced opportunity.
create function public.can_access_crm_opportunity(target_opportunity uuid)
returns boolean language sql stable security definer
set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.crm_opportunities o
    where o.id = target_opportunity
      and (
        public.can_manage_organization(o.organization_id)
        or (
          public.organization_role(o.organization_id) = 'estimator'
          and (o.created_by = auth.uid() or o.owner_user_id = auth.uid() or o.estimator_user_id = auth.uid())
        )
      )
  );
$$;
revoke all on function public.can_access_crm_opportunity(uuid) from public, anon;
grant execute on function public.can_access_crm_opportunity(uuid) to authenticated, service_role;

create function public.find_crm_duplicate_candidates(
  target_organization uuid,
  candidate_email text default null,
  candidate_phone text default null
)
returns table(entity_type text, entity_id uuid, matched_on text)
language sql stable security definer
set search_path = pg_catalog, public as $$
  select candidate.entity_type, candidate.entity_id, candidate.matched_on
  from (
    select 'contact'::text as entity_type, c.id as entity_id,
      case
        when candidate_email is not null and lower(c.email) = lower(candidate_email) then 'email'
        else 'phone'
      end as matched_on
    from public.crm_contacts c
    where c.organization_id = target_organization and c.deleted_at is null
      and (
        (candidate_email is not null and lower(c.email) = lower(candidate_email))
        or (candidate_phone is not null and c.phone = candidate_phone)
      )
    union all
    select 'lead'::text, l.id,
      case
        when candidate_email is not null and lower(l.email) = lower(candidate_email) then 'email'
        else 'phone'
      end
    from public.crm_leads l
    where l.organization_id = target_organization and l.deleted_at is null
      and l.status not in ('merged', 'junk')
      and (
        (candidate_email is not null and lower(l.email) = lower(candidate_email))
        or (candidate_phone is not null and l.phone = candidate_phone)
      )
  ) candidate
  where public.can_edit_organization_work(target_organization)
  order by candidate.entity_type, candidate.entity_id;
$$;
revoke all on function public.find_crm_duplicate_candidates(uuid, text, text)
  from public, anon;
grant execute on function public.find_crm_duplicate_candidates(uuid, text, text)
  to authenticated, service_role;

create function public.move_crm_opportunity_stage(
  target_organization uuid,
  target_opportunity uuid,
  target_stage uuid,
  request_key text,
  selected_loss_reason uuid default null,
  selected_manual_win_reason text default null
)
returns table(opportunity_id uuid, stage_id uuid, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  existing_command public.crm_opportunity_stage_commands%rowtype;
  current_opportunity public.crm_opportunities%rowtype;
  target_category text;
begin
  if auth.uid() is null or length(request_key) not between 8 and 200 then
    raise exception 'stage transition unavailable' using errcode = '42501';
  end if;

  select o.* into current_opportunity
  from public.crm_opportunities o
  where o.organization_id = target_organization
    and o.id = target_opportunity
    and o.deleted_at is null
  for update;
  if current_opportunity.id is null
     or not public.can_access_crm_opportunity(target_opportunity) then
    raise exception 'stage transition unavailable' using errcode = '42501';
  end if;

  select c.* into existing_command
  from public.crm_opportunity_stage_commands c
  where c.organization_id = target_organization and c.command_key = request_key;
  if existing_command.id is not null then
    if existing_command.opportunity_id is distinct from target_opportunity
       or existing_command.target_stage_id is distinct from target_stage
       or existing_command.loss_reason_id is distinct from selected_loss_reason
       or existing_command.manual_win_reason is distinct from selected_manual_win_reason then
      raise exception 'idempotency key was already used for another transition'
        using errcode = '23514';
    end if;
    return query select existing_command.opportunity_id,
      existing_command.target_stage_id, true;
    return;
  end if;

  select s.category into target_category
  from public.crm_pipeline_stages s
  where s.organization_id = target_organization
    and s.id = target_stage
    and s.pipeline_id = current_opportunity.pipeline_id;
  if target_category is null then
    raise exception 'stage transition unavailable' using errcode = '23514';
  end if;

  update public.crm_opportunities o set
    stage_id = target_stage,
    loss_reason_id = case when target_category in ('lost', 'disqualified')
      then selected_loss_reason else null end,
    acceptance_method = case when target_category = 'won' then 'manual' else null end,
    manual_win_reason = case when target_category = 'won'
      then nullif(trim(selected_manual_win_reason), '') else null end,
    updated_by = auth.uid()
  where o.organization_id = target_organization and o.id = target_opportunity;

  insert into public.crm_opportunity_stage_commands(
    organization_id, opportunity_id, command_key, target_stage_id,
    loss_reason_id, manual_win_reason, actor_user_id
  ) values (
    target_organization, target_opportunity, request_key, target_stage,
    selected_loss_reason, nullif(trim(selected_manual_win_reason), ''), auth.uid()
  );

  return query select target_opportunity, target_stage, false;
end;
$$;
revoke all on function public.move_crm_opportunity_stage(uuid, uuid, uuid, text, uuid, text)
  from public, anon;
grant execute on function public.move_crm_opportunity_stage(uuid, uuid, uuid, text, uuid, text)
  to authenticated, service_role;

create function public.convert_crm_lead(
  p_organization uuid,
  p_lead uuid,
  p_request_key text,
  p_pipeline uuid,
  p_opportunity_name text,
  p_segment text,
  p_existing_customer uuid default null,
  p_existing_contact uuid default null,
  p_existing_property uuid default null
)
returns table(
  lead_id uuid,
  customer_id uuid,
  contact_id uuid,
  property_id uuid,
  opportunity_id uuid,
  replayed boolean
)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  source_lead public.crm_leads%rowtype;
  v_customer uuid;
  v_contact uuid;
  v_property uuid;
  v_opportunity uuid;
  v_initial_stage uuid;
  v_pipeline_segment text;
begin
  if auth.uid() is null
     or length(p_request_key) not between 8 and 200
     or nullif(trim(p_opportunity_name), '') is null
     or p_segment not in ('commercial', 'residential', 'turnover', 'specialty') then
    raise exception 'lead conversion unavailable' using errcode = '42501';
  end if;

  select l.* into source_lead
  from public.crm_leads l
  where l.organization_id = p_organization and l.id = p_lead and l.deleted_at is null
  for update;
  if source_lead.id is null or not (
    public.can_manage_organization(p_organization)
    or (public.organization_role(p_organization) = 'estimator'
      and (source_lead.created_by = auth.uid() or source_lead.assigned_to_user_id = auth.uid()))
  ) then
    raise exception 'lead conversion unavailable' using errcode = '42501';
  end if;

  if source_lead.status = 'converted' then
    select o.id into v_opportunity from public.crm_opportunities o
    where o.organization_id = p_organization
      and o.id = source_lead.converted_opportunity_id
      and o.idempotency_key = p_request_key;
    if v_opportunity is null then
      raise exception 'lead was already converted by another command' using errcode = '23514';
    end if;
    return query select source_lead.id, source_lead.converted_customer_id,
      source_lead.converted_contact_id, source_lead.converted_property_id,
      source_lead.converted_opportunity_id, true;
    return;
  end if;
  if source_lead.status in ('junk', 'merged', 'disqualified') then
    raise exception 'closed leads cannot be converted' using errcode = '23514';
  end if;

  select p.segment into v_pipeline_segment from public.crm_pipelines p
  where p.organization_id = p_organization and p.id = p_pipeline and not p.archived;
  if v_pipeline_segment is null
     or (v_pipeline_segment = 'commercial' and p_segment not in ('commercial', 'specialty'))
     or (v_pipeline_segment = 'residential_turnover' and p_segment not in ('residential', 'turnover')) then
    raise exception 'pipeline and opportunity segment do not match' using errcode = '23514';
  end if;
  select s.id into v_initial_stage from public.crm_pipeline_stages s
  where s.organization_id = p_organization and s.pipeline_id = p_pipeline
    and s.category = 'new' and not s.hidden
  order by s.position, s.id limit 1;
  if v_initial_stage is null then
    raise exception 'pipeline has no active new stage' using errcode = '23514';
  end if;

  if p_existing_customer is not null then
    select c.id into v_customer from public.crm_customers c
    where c.organization_id = p_organization and c.id = p_existing_customer and c.deleted_at is null;
    if v_customer is null then
      raise exception 'selected customer is unavailable' using errcode = '23514';
    end if;
  else
    insert into public.crm_customers(
      organization_id, customer_type, name, source, created_by, updated_by
    ) values (
      p_organization,
      case when p_segment in ('commercial', 'specialty') then 'commercial' else 'household' end,
      coalesce(nullif(trim(source_lead.customer_name), ''),
        nullif(trim(source_lead.property_name), ''), nullif(trim(source_lead.contact_name), ''),
        nullif(trim(source_lead.email), ''), 'Lead ' || left(source_lead.id::text, 8)),
      'lead_conversion', auth.uid(), auth.uid()
    ) returning id into v_customer;
  end if;

  if p_existing_contact is not null then
    select c.id into v_contact from public.crm_contacts c
    where c.organization_id = p_organization and c.id = p_existing_contact and c.deleted_at is null;
    if v_contact is null then
      raise exception 'selected contact is unavailable' using errcode = '23514';
    end if;
  elsif nullif(trim(coalesce(source_lead.contact_name, '')), '') is not null
     or nullif(trim(coalesce(source_lead.email, '')), '') is not null
     or nullif(trim(coalesce(source_lead.phone, '')), '') is not null then
    insert into public.crm_contacts(
      organization_id, first_name, email, phone, source, created_by, updated_by
    ) values (
      p_organization, nullif(trim(source_lead.contact_name), ''),
      nullif(lower(trim(source_lead.email)), ''), nullif(trim(source_lead.phone), ''),
      'lead_conversion', auth.uid(), auth.uid()
    ) returning id into v_contact;
  end if;
  if v_contact is not null then
    insert into public.crm_customer_contacts(
      organization_id, customer_id, contact_id, contact_role, is_primary, created_by
    ) values (p_organization, v_customer, v_contact, 'decision_maker', true, auth.uid())
    on conflict on constraint crm_customer_contacts_pkey do nothing;
  end if;

  if p_existing_property is not null then
    select p.id into v_property from public.crm_properties p
    where p.organization_id = p_organization and p.id = p_existing_property
      and p.deleted_at is null and (p.customer_id is null or p.customer_id = v_customer);
    if v_property is null then
      raise exception 'selected property is unavailable' using errcode = '23514';
    end if;
    update public.crm_properties set customer_id = v_customer, updated_by = auth.uid()
    where organization_id = p_organization and id = v_property and customer_id is null;
  elsif nullif(trim(coalesce(source_lead.property_name, '')), '') is not null
     or nullif(trim(coalesce(source_lead.service_location, '')), '') is not null then
    insert into public.crm_properties(
      organization_id, customer_id, name, address_line_1, source, created_by, updated_by
    ) values (
      p_organization, v_customer,
      coalesce(nullif(trim(source_lead.property_name), ''), 'Primary service location'),
      nullif(trim(source_lead.service_location), ''), 'lead_conversion', auth.uid(), auth.uid()
    ) returning id into v_property;
  end if;

  insert into public.crm_opportunities(
    organization_id, customer_id, property_id, pipeline_id, stage_id, lead_id,
    idempotency_key, name, owner_user_id, estimator_user_id, segment, source,
    created_by, updated_by
  ) values (
    p_organization, v_customer, v_property, p_pipeline, v_initial_stage, source_lead.id,
    p_request_key, trim(p_opportunity_name),
    coalesce(source_lead.assigned_to_user_id, auth.uid()), source_lead.assigned_to_user_id,
    p_segment, 'lead_conversion', auth.uid(), auth.uid()
  ) returning id into v_opportunity;

  update public.crm_leads set
    status = 'converted', converted_customer_id = v_customer,
    converted_contact_id = v_contact, converted_property_id = v_property,
    converted_opportunity_id = v_opportunity, updated_by = auth.uid()
  where organization_id = p_organization and id = source_lead.id;

  return query select source_lead.id, v_customer, v_contact, v_property,
    v_opportunity, false;
end;
$$;
revoke all on function public.convert_crm_lead(uuid, uuid, text, uuid, text, text, uuid, uuid, uuid)
  from public, anon;
grant execute on function public.convert_crm_lead(uuid, uuid, text, uuid, text, text, uuid, uuid, uuid)
  to authenticated, service_role;

create function public.schedule_crm_walkthrough(
  p_organization uuid,
  p_opportunity uuid,
  p_property uuid,
  p_estimator uuid,
  p_site_contact uuid,
  p_request_key text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_timezone text
)
returns table(walkthrough_id uuid, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  existing_walkthrough public.crm_walkthroughs%rowtype;
  created_walkthrough uuid;
begin
  if auth.uid() is null
     or length(p_request_key) not between 8 and 200
     or p_window_end <= p_window_start
     or length(trim(p_timezone)) not between 1 and 80
     or not public.can_access_crm_opportunity(p_opportunity) then
    raise exception 'walkthrough scheduling unavailable' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.crm_opportunities o
    where o.organization_id = p_organization and o.id = p_opportunity
      and o.property_id = p_property and o.deleted_at is null
  ) or not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization and m.user_id = p_estimator
      and m.role in ('owner', 'admin', 'estimator')
  ) or (p_site_contact is not null and not exists (
    select 1 from public.crm_contacts c
    where c.organization_id = p_organization and c.id = p_site_contact and c.deleted_at is null
  )) then
    raise exception 'walkthrough scheduling unavailable' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_organization::text || ':' || p_estimator::text, 0)
  );
  select w.* into existing_walkthrough from public.crm_walkthroughs w
  where w.organization_id = p_organization and w.idempotency_key = p_request_key;
  if existing_walkthrough.id is not null then
    if existing_walkthrough.opportunity_id is distinct from p_opportunity
       or existing_walkthrough.property_id is distinct from p_property
       or existing_walkthrough.estimator_user_id is distinct from p_estimator
       or existing_walkthrough.site_contact_id is distinct from p_site_contact
       or existing_walkthrough.window_start is distinct from p_window_start
       or existing_walkthrough.window_end is distinct from p_window_end
       or existing_walkthrough.timezone is distinct from trim(p_timezone) then
      raise exception 'idempotency key was already used for another walkthrough'
        using errcode = '23514';
    end if;
    return query select existing_walkthrough.id, true;
    return;
  end if;
  if exists (
    select 1 from public.crm_walkthroughs w
    where w.organization_id = p_organization and w.estimator_user_id = p_estimator
      and w.status in ('scheduled', 'rescheduled')
      and w.window_start < p_window_end and w.window_end > p_window_start
  ) then
    raise exception 'estimator already has an overlapping walkthrough' using errcode = '23P01';
  end if;

  insert into public.crm_walkthroughs(
    organization_id, opportunity_id, property_id, estimator_user_id,
    site_contact_id, idempotency_key, window_start, window_end, timezone,
    status, created_by, updated_by
  ) values (
    p_organization, p_opportunity, p_property, p_estimator,
    p_site_contact, p_request_key, p_window_start, p_window_end, trim(p_timezone),
    'scheduled', auth.uid(), auth.uid()
  ) returning id into created_walkthrough;
  return query select created_walkthrough, false;
end;
$$;
revoke all on function public.schedule_crm_walkthrough(uuid, uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, text)
  from public, anon;
grant execute on function public.schedule_crm_walkthrough(uuid, uuid, uuid, uuid, uuid, text, timestamptz, timestamptz, text)
  to authenticated, service_role;

create function public.command_crm_task(
  p_organization uuid,
  p_task uuid,
  p_request_key text,
  p_action text,
  p_snoozed_until timestamptz default null
)
returns table(task_id uuid, task_status text, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  current_task public.crm_tasks%rowtype;
  existing_command public.crm_task_commands%rowtype;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 200
     or p_action not in ('complete', 'snooze')
     or (p_action = 'snooze' and (p_snoozed_until is null or p_snoozed_until <= now()))
     or (p_action = 'complete' and p_snoozed_until is not null) then
    raise exception 'task command unavailable' using errcode = '42501';
  end if;
  select t.* into current_task from public.crm_tasks t
  where t.organization_id = p_organization and t.id = p_task for update;
  if current_task.id is null or not (
    public.can_manage_organization(p_organization)
    or (public.organization_role(p_organization) = 'estimator'
      and current_task.assignee_user_id = auth.uid())
  ) then
    raise exception 'task command unavailable' using errcode = '42501';
  end if;
  select c.* into existing_command from public.crm_task_commands c
  where c.organization_id = p_organization and c.command_key = p_request_key;
  if existing_command.id is not null then
    if existing_command.task_id is distinct from p_task
       or existing_command.action is distinct from p_action
       or existing_command.snoozed_until is distinct from p_snoozed_until then
      raise exception 'idempotency key was already used for another task command'
        using errcode = '23514';
    end if;
    return query select current_task.id, current_task.status, true;
    return;
  end if;
  if current_task.status <> 'open' then
    raise exception 'only open tasks can be changed' using errcode = '23514';
  end if;
  if p_action = 'complete' then
    update public.crm_tasks set status = 'completed', completed_at = now(),
      snoozed_until = null, updated_by = auth.uid()
    where organization_id = p_organization and id = p_task;
  else
    update public.crm_tasks set snoozed_until = p_snoozed_until,
      updated_by = auth.uid()
    where organization_id = p_organization and id = p_task;
  end if;
  insert into public.crm_task_commands(
    organization_id, task_id, command_key, action, snoozed_until, actor_user_id
  ) values (p_organization, p_task, p_request_key, p_action, p_snoozed_until, auth.uid());
  return query select p_task,
    case when p_action = 'complete' then 'completed'::text else 'open'::text end,
    false;
end;
$$;
revoke all on function public.command_crm_task(uuid, uuid, text, text, timestamptz)
  from public, anon;
grant execute on function public.command_crm_task(uuid, uuid, text, text, timestamptz)
  to authenticated, service_role;

create function public.assign_crm_opportunity(
  p_organization uuid,
  p_opportunity uuid,
  p_request_key text,
  p_owner uuid,
  p_estimator uuid default null,
  p_transfer_open_tasks boolean default false
)
returns table(opportunity_id uuid, transferred_task_count integer, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  current_opportunity public.crm_opportunities%rowtype;
  existing_command public.crm_assignment_commands%rowtype;
  changed_tasks integer := 0;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 200
     or not public.can_manage_organization(p_organization) then
    raise exception 'opportunity assignment unavailable' using errcode = '42501';
  end if;
  select o.* into current_opportunity from public.crm_opportunities o
  where o.organization_id = p_organization and o.id = p_opportunity
    and o.deleted_at is null for update;
  if current_opportunity.id is null then
    raise exception 'opportunity assignment unavailable' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization and m.user_id = p_owner
      and m.role in ('owner', 'admin', 'estimator')
  ) or (p_estimator is not null and not exists (
    select 1 from public.organization_memberships m
    where m.organization_id = p_organization and m.user_id = p_estimator
      and m.role in ('owner', 'admin', 'estimator')
  )) then
    raise exception 'selected assignee is unavailable' using errcode = '23514';
  end if;
  select c.* into existing_command from public.crm_assignment_commands c
  where c.organization_id = p_organization and c.command_key = p_request_key;
  if existing_command.id is not null then
    if existing_command.opportunity_id is distinct from p_opportunity
       or existing_command.owner_user_id is distinct from p_owner
       or existing_command.estimator_user_id is distinct from p_estimator
       or existing_command.transfer_open_tasks is distinct from p_transfer_open_tasks then
      raise exception 'idempotency key was already used for another assignment'
        using errcode = '23514';
    end if;
    return query select existing_command.opportunity_id, 0, true;
    return;
  end if;
  if p_transfer_open_tasks and p_estimator is not null then
    update public.crm_tasks t set assignee_user_id = p_estimator, updated_by = auth.uid()
    where t.organization_id = p_organization and t.opportunity_id = p_opportunity
      and t.status = 'open'
      and (current_opportunity.estimator_user_id is null
        or t.assignee_user_id = current_opportunity.estimator_user_id);
    get diagnostics changed_tasks = row_count;
  end if;
  update public.crm_opportunities set owner_user_id = p_owner,
    estimator_user_id = p_estimator, updated_by = auth.uid()
  where organization_id = p_organization and id = p_opportunity;
  insert into public.crm_assignment_commands(
    organization_id, opportunity_id, command_key, owner_user_id,
    estimator_user_id, transfer_open_tasks, actor_user_id
  ) values (
    p_organization, p_opportunity, p_request_key, p_owner,
    p_estimator, p_transfer_open_tasks, auth.uid()
  );
  return query select p_opportunity, changed_tasks, false;
end;
$$;
revoke all on function public.assign_crm_opportunity(uuid, uuid, text, uuid, uuid, boolean)
  from public, anon;
grant execute on function public.assign_crm_opportunity(uuid, uuid, text, uuid, uuid, boolean)
  to authenticated, service_role;

create function public.reactivate_crm_opportunity(
  p_organization uuid,
  p_opportunity uuid,
  p_request_key text,
  p_name text default null
)
returns table(opportunity_id uuid, replayed boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  prior_opportunity public.crm_opportunities%rowtype;
  prior_category text;
  qualifying_stage uuid;
  new_opportunity uuid;
begin
  if auth.uid() is null or length(p_request_key) not between 8 and 140
     or not public.can_access_crm_opportunity(p_opportunity) then
    raise exception 'opportunity reactivation unavailable' using errcode = '42501';
  end if;
  select o.* into prior_opportunity
  from public.crm_opportunities o
  where o.organization_id = p_organization and o.id = p_opportunity
    and o.deleted_at is null for update of o;
  select s.category into prior_category from public.crm_pipeline_stages s
  where s.organization_id = p_organization and s.id = prior_opportunity.stage_id;
  if prior_opportunity.id is null or prior_category not in ('won', 'lost', 'disqualified', 'nurture') then
    raise exception 'only terminal or nurtured opportunities can be reactivated'
      using errcode = '23514';
  end if;
  select o.id into new_opportunity from public.crm_opportunities o
  where o.organization_id = p_organization and o.idempotency_key = p_request_key;
  if new_opportunity is not null then
    if not exists (
      select 1 from public.crm_opportunities o where o.id = new_opportunity
        and o.reactivated_from_id = p_opportunity
    ) then
      raise exception 'idempotency key was already used for another opportunity'
        using errcode = '23514';
    end if;
    return query select new_opportunity, true;
    return;
  end if;
  select s.id into qualifying_stage from public.crm_pipeline_stages s
  where s.organization_id = p_organization and s.pipeline_id = prior_opportunity.pipeline_id
    and s.category = 'qualifying' and not s.hidden
  order by s.position, s.id limit 1;
  if qualifying_stage is null then
    raise exception 'pipeline has no active qualifying stage' using errcode = '23514';
  end if;
  insert into public.crm_opportunities(
    organization_id, customer_id, property_id, pipeline_id, stage_id, lead_id,
    idempotency_key, name, owner_user_id, estimator_user_id, segment,
    service_family, expected_close_date, next_action_due_at,
    reactivated_from_id, is_parent, source, created_by, updated_by
  ) values (
    p_organization, prior_opportunity.customer_id, prior_opportunity.property_id,
    prior_opportunity.pipeline_id, qualifying_stage, prior_opportunity.lead_id,
    p_request_key,
    coalesce(nullif(trim(p_name), ''), prior_opportunity.name || ' — reactivated'),
    prior_opportunity.owner_user_id, prior_opportunity.estimator_user_id,
    prior_opportunity.segment, prior_opportunity.service_family,
    prior_opportunity.expected_close_date, prior_opportunity.next_action_due_at,
    prior_opportunity.id, prior_opportunity.is_parent, 'reactivation', auth.uid(), auth.uid()
  ) returning id into new_opportunity;
  insert into public.crm_site_work_packages(
    organization_id, opportunity_id, property_id, status, idempotency_key,
    created_by, updated_by
  )
  select p_organization, new_opportunity, package.property_id, 'scoping',
    left(p_request_key, 140) || ':package:' || package.id::text,
    auth.uid(), auth.uid()
  from public.crm_site_work_packages package
  where package.organization_id = p_organization
    and package.opportunity_id = prior_opportunity.id;
  return query select new_opportunity, false;
end;
$$;
revoke all on function public.reactivate_crm_opportunity(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.reactivate_crm_opportunity(uuid, uuid, text, text)
  to authenticated, service_role;

create function public.configure_crm_pipeline_stage(
  p_organization uuid,
  p_pipeline uuid,
  p_stage uuid,
  p_label text,
  p_category text,
  p_position integer,
  p_hidden boolean default false,
  p_pipeline_name text default null
)
returns table(stage_id uuid, created boolean)
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  current_stage public.crm_pipeline_stages%rowtype;
  stage_created boolean := false;
begin
  if auth.uid() is null or not public.can_manage_organization(p_organization) then
    raise exception 'pipeline configuration unavailable' using errcode = '42501';
  end if;
  if length(trim(p_label)) not between 1 and 120
     or p_position < 0
     or p_category not in (
       'new', 'qualifying', 'walkthrough', 'estimating', 'proposing', 'negotiating',
       'won', 'handed_off', 'lost', 'disqualified', 'nurture'
     )
     or (p_hidden and p_category in ('won', 'lost', 'disqualified')) then
    raise exception 'invalid pipeline stage configuration' using errcode = '23514';
  end if;
  perform 1 from public.crm_pipelines p
  where p.organization_id = p_organization and p.id = p_pipeline and not p.archived
  for update;
  if not found then
    raise exception 'pipeline configuration unavailable' using errcode = '42501';
  end if;
  if p_pipeline_name is not null then
    if length(trim(p_pipeline_name)) not between 1 and 120 then
      raise exception 'invalid pipeline name' using errcode = '23514';
    end if;
    update public.crm_pipelines set name = trim(p_pipeline_name),
      updated_by = auth.uid(), updated_at = now()
    where organization_id = p_organization and id = p_pipeline;
  end if;
  select s.* into current_stage from public.crm_pipeline_stages s
  where s.organization_id = p_organization and s.id = p_stage
  for update;
  if current_stage.id is null then
    insert into public.crm_pipeline_stages(
      id, organization_id, pipeline_id, label, category, position, hidden, created_by
    ) values (
      p_stage, p_organization, p_pipeline, trim(p_label), p_category,
      p_position, p_hidden, auth.uid()
    );
    stage_created := true;
  else
    if current_stage.pipeline_id is distinct from p_pipeline then
      raise exception 'pipeline stage belongs to another pipeline' using errcode = '42501';
    end if;
    update public.crm_pipeline_stages set label = trim(p_label), category = p_category,
      position = p_position, hidden = p_hidden, updated_at = now()
    where organization_id = p_organization and id = p_stage;
  end if;
  return query select p_stage, stage_created;
end;
$$;
revoke all on function public.configure_crm_pipeline_stage(
  uuid, uuid, uuid, text, text, integer, boolean, text
) from public, anon;
grant execute on function public.configure_crm_pipeline_stage(
  uuid, uuid, uuid, text, text, integer, boolean, text
) to authenticated, service_role;

create function public.read_crm_pipeline_board(target_organization uuid)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public as $$
  with caller as (
    select public.organization_role(target_organization) as role
  ), pipelines as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'template_key', p.template_key,
      'segment', p.segment,
      'is_default', p.is_default,
      'archived', p.archived,
      'stages', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id,
          'label', s.label,
          'category', s.category,
          'position', s.position,
          'hidden', s.hidden,
          'stale_after_seconds', extract(epoch from s.stale_after)
        ) order by s.position, s.id)
        from public.crm_pipeline_stages s
        where s.organization_id = p.organization_id and s.pipeline_id = p.id
      ), '[]'::jsonb)
    ) order by p.name, p.id), '[]'::jsonb) as value
    from public.crm_pipelines p
    where p.organization_id = target_organization
  ), opportunities as (
    select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'pipeline_id', o.pipeline_id,
      'stage_id', o.stage_id,
      'category', s.category,
      'segment', o.segment,
      'service_family', o.service_family,
      'expected_close_date', o.expected_close_date,
      'owner_user_id', o.owner_user_id,
      'estimator_user_id', o.estimator_user_id,
      'next_action_due_at', o.next_action_due_at,
      'value_amount_minor', case when c.role <> 'viewer' then o.value_amount_minor end,
      'value_basis', case when c.role <> 'viewer' then o.value_basis end,
      'currency', case when c.role <> 'viewer' then o.currency end
    )) order by o.created_at desc, o.id), '[]'::jsonb) as value
    from public.crm_opportunities o
    join public.crm_pipeline_stages s
      on s.organization_id = o.organization_id and s.id = o.stage_id
    cross join caller c
    where o.organization_id = target_organization and o.deleted_at is null
      and (
        c.role in ('owner', 'admin', 'viewer')
        or (c.role = 'estimator' and (
          o.created_by = auth.uid() or o.owner_user_id = auth.uid() or o.estimator_user_id = auth.uid()
        ))
      )
  ), loss_reasons as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'label', r.label,
      'applies_to', r.applies_to
    ) order by r.label, r.id), '[]'::jsonb) as value
    from public.crm_loss_reasons r
    where r.organization_id = target_organization and r.active
  )
  select case when (select role from caller) is null then null else jsonb_build_object(
    'organization_id', target_organization,
    'caller_role', (select role from caller),
    'pipelines', (select value from pipelines),
    'opportunities', (select value from opportunities),
    'loss_reasons', (select value from loss_reasons),
    'viewer_price_redacted', (select role = 'viewer' from caller)
  ) end;
$$;
revoke all on function public.read_crm_pipeline_board(uuid) from public, anon;
grant execute on function public.read_crm_pipeline_board(uuid) to authenticated, service_role;

create function public.bootstrap_crm_for_organization(target_organization uuid, actor uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public as $$
declare commercial_pipeline uuid; residential_pipeline uuid;
begin
  if not exists (
    select 1 from public.organizations o where o.id = target_organization and o.created_by = actor
  ) then
    raise exception 'CRM bootstrap actor must be the organization creator' using errcode = '42501';
  end if;
  insert into public.crm_pipelines(
    organization_id, name, template_key, segment, is_default, created_by
  ) values (
    target_organization, 'Commercial facility', 'commercial_facility_v1', 'commercial', true, actor
  ) on conflict (organization_id, template_key) do nothing;
  select id into commercial_pipeline from public.crm_pipelines
    where organization_id = target_organization and template_key = 'commercial_facility_v1';

  insert into public.crm_pipelines(
    organization_id, name, template_key, segment, is_default, created_by
  ) values (
    target_organization, 'Residential and turnover', 'residential_turnover_v1',
    'residential_turnover', true, actor
  ) on conflict (organization_id, template_key) do nothing;
  select id into residential_pipeline from public.crm_pipelines
    where organization_id = target_organization and template_key = 'residential_turnover_v1';

  insert into public.crm_pipeline_stages(
    organization_id, pipeline_id, label, category, position, hidden, gate_rules, created_by
  ) values
    (target_organization, commercial_pipeline, 'Lead', 'new', 10, false, '{}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Qualification', 'qualifying', 20, false, '{}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Walkthrough', 'walkthrough', 30, false, '{"requires_walkthrough":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Estimating', 'estimating', 40, false, '{"requires_property":true,"requires_walkthrough":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Proposal sent', 'proposing', 50, false, '{"requires_sent_proposal":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Negotiation', 'negotiating', 60, false, '{"requires_sent_proposal":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Won', 'won', 70, false, '{"manual_reason_required":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Handed off', 'handed_off', 80, false, '{"blocked_until":"r3_6"}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Lost', 'lost', 90, false, '{"reason_required":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Disqualified', 'disqualified', 100, false, '{"reason_required":true}'::jsonb, actor),
    (target_organization, commercial_pipeline, 'Nurture', 'nurture', 110, false, '{}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Inquiry', 'new', 10, false, '{}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Service fit', 'qualifying', 20, false, '{}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Walkthrough', 'walkthrough', 30, true, '{"requires_walkthrough":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Quote', 'estimating', 40, false, '{"requires_property":true,"walkthrough_optional":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Proposal sent', 'proposing', 50, false, '{"requires_sent_proposal":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Negotiation', 'negotiating', 60, true, '{"requires_sent_proposal":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Accepted', 'won', 70, false, '{"manual_reason_required":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Handed off', 'handed_off', 80, false, '{"blocked_until":"r3_6"}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Lost', 'lost', 90, false, '{"reason_required":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Not a fit', 'disqualified', 100, false, '{"reason_required":true}'::jsonb, actor),
    (target_organization, residential_pipeline, 'Nurture', 'nurture', 110, false, '{}'::jsonb, actor)
  on conflict (pipeline_id, position) do nothing;

  insert into public.crm_loss_reasons(
    organization_id, code, label, canonical_category, applies_to, created_by
  ) values
    (target_organization, 'price', 'Price', 'price', 'lost', actor),
    (target_organization, 'timing', 'Timing', 'timing', 'lost', actor),
    (target_organization, 'scope_mismatch', 'Scope mismatch', 'scope_mismatch', 'both', actor),
    (target_organization, 'incumbent_retained', 'Incumbent retained', 'incumbent_retained', 'lost', actor),
    (target_organization, 'no_decision', 'No decision', 'no_decision', 'lost', actor),
    (target_organization, 'competitor', 'Competitor selected', 'competitor', 'lost', actor),
    (target_organization, 'unqualified', 'Unqualified', 'unqualified', 'disqualified', actor),
    (target_organization, 'unknown', 'Unknown', 'unknown', 'both', actor)
  on conflict (organization_id, code) do nothing;

  insert into public.crm_lead_sources(organization_id, name, channel, created_by)
  values (target_organization, 'Manual entry', 'other', actor)
  on conflict (organization_id, name) do nothing;
end $$;
revoke all on function public.bootstrap_crm_for_organization(uuid, uuid)
  from public, anon, authenticated, service_role;

do $crm_existing_orgs$
declare org record;
begin
  for org in select id, created_by from public.organizations order by created_at, id loop
    perform public.bootstrap_crm_for_organization(org.id, org.created_by);
  end loop;
end
$crm_existing_orgs$;

create function public.bootstrap_crm_after_organization()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
  perform public.bootstrap_crm_for_organization(new.id, new.created_by);
  return new;
end $$;
revoke all on function public.bootstrap_crm_after_organization() from public, anon, authenticated, service_role;
create trigger bootstrap_crm_after_organization_trigger
  after insert on public.organizations for each row
  execute function public.bootstrap_crm_after_organization();

-- Auditing/outbox: reuse the R2 transactional infrastructure. Stage history is
-- separately append-only and receives no client insert/update/delete grant.
do $crm_audit_triggers$
declare table_name text;
begin
  foreach table_name in array array[
    'crm_customers', 'crm_contacts', 'crm_properties', 'crm_pipelines',
    'crm_pipeline_stages', 'crm_loss_reasons', 'crm_lead_sources',
    'crm_referral_sources', 'crm_leads', 'crm_opportunities', 'crm_walkthroughs',
    'crm_tasks', 'crm_site_work_packages', 'crm_qualification_responses'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.record_organization_change()',
      table_name || '_audit', table_name
    );
  end loop;
end
$crm_audit_triggers$;

-- RLS is mandatory on every tenant table.
do $crm_enable_rls$
declare table_name text;
begin
  foreach table_name in array array[
    'crm_customers', 'crm_contacts', 'crm_customer_contacts', 'crm_properties',
    'crm_pipelines', 'crm_pipeline_stages', 'crm_loss_reasons', 'crm_lead_sources',
    'crm_referral_sources', 'crm_leads', 'crm_opportunities', 'crm_walkthroughs',
    'crm_tasks', 'crm_site_work_packages', 'crm_opportunity_stage_history',
    'crm_opportunity_stage_commands', 'crm_task_commands', 'crm_assignment_commands',
    'crm_attribution_touches',
    'crm_qualification_responses'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon', table_name);
  end loop;
end
$crm_enable_rls$;

-- Configuration: every member can read labels, only managers can write.
create policy crm_pipelines_member_read on public.crm_pipelines
  for select to authenticated using (public.is_organization_member(organization_id));
create policy crm_pipelines_manager_insert on public.crm_pipelines
  for insert to authenticated
  with check (public.can_manage_organization(organization_id));
create policy crm_pipelines_manager_update on public.crm_pipelines
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy crm_pipeline_stages_member_read on public.crm_pipeline_stages
  for select to authenticated using (public.is_organization_member(organization_id));
create policy crm_pipeline_stages_manager_insert on public.crm_pipeline_stages
  for insert to authenticated
  with check (public.can_manage_organization(organization_id));
create policy crm_pipeline_stages_manager_update on public.crm_pipeline_stages
  for update to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy crm_pipeline_stages_manager_delete on public.crm_pipeline_stages
  for delete to authenticated using (public.can_manage_organization(organization_id));
create policy crm_loss_reasons_member_read on public.crm_loss_reasons
  for select to authenticated using (public.is_organization_member(organization_id));
create policy crm_loss_reasons_manager_write on public.crm_loss_reasons
  for all to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));
create policy crm_lead_sources_member_read on public.crm_lead_sources
  for select to authenticated using (public.is_organization_member(organization_id));
create policy crm_lead_sources_manager_write on public.crm_lead_sources
  for all to authenticated using (public.can_manage_organization(organization_id))
  with check (public.can_manage_organization(organization_id));

-- Raw customer/contact/property data: no viewer direct access. Estimator direct
-- scope is creator-only; assigned read models are served through reviewed APIs.
do $crm_identity_policies$
declare table_name text;
begin
  foreach table_name in array array['crm_customers', 'crm_contacts', 'crm_properties', 'crm_referral_sources'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_manage_organization(organization_id) or (public.organization_role(organization_id) = ''estimator'' and created_by = auth.uid()))',
      table_name || '_scoped_read', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_edit_organization_work(organization_id) and created_by = auth.uid())',
      table_name || '_scoped_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_manage_organization(organization_id) or (public.organization_role(organization_id) = ''estimator'' and created_by = auth.uid())) with check (public.can_manage_organization(organization_id) or (public.organization_role(organization_id) = ''estimator'' and created_by = auth.uid()))',
      table_name || '_scoped_update', table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_manage_organization(organization_id))',
      table_name || '_manager_delete', table_name
    );
  end loop;
end
$crm_identity_policies$;

create policy crm_customer_contacts_scoped_read on public.crm_customer_contacts
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator' and created_by = auth.uid())
  );
create policy crm_customer_contacts_scoped_insert on public.crm_customer_contacts
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and created_by = auth.uid()
  );
create policy crm_customer_contacts_manager_delete on public.crm_customer_contacts
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy crm_leads_scoped_read on public.crm_leads
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator'
      and (created_by = auth.uid() or assigned_to_user_id = auth.uid()))
  );
create policy crm_leads_scoped_insert on public.crm_leads
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and created_by = auth.uid()
  );
create policy crm_leads_scoped_update on public.crm_leads
  for update to authenticated using (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator'
      and (created_by = auth.uid() or assigned_to_user_id = auth.uid()))
  ) with check (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator'
      and (created_by = auth.uid() or assigned_to_user_id = auth.uid()))
  );
create policy crm_leads_manager_delete on public.crm_leads
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy crm_opportunities_scoped_read on public.crm_opportunities
  for select to authenticated using (public.can_access_crm_opportunity(id));
create policy crm_opportunities_scoped_insert on public.crm_opportunities
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and created_by = auth.uid()
    and (public.can_manage_organization(organization_id)
      or owner_user_id = auth.uid() or estimator_user_id = auth.uid())
  );
create policy crm_opportunities_scoped_update on public.crm_opportunities
  for update to authenticated using (public.can_access_crm_opportunity(id))
  with check (public.can_access_crm_opportunity(id));
create policy crm_opportunities_manager_delete on public.crm_opportunities
  for delete to authenticated using (public.can_manage_organization(organization_id));

do $crm_opportunity_child_policies$
declare table_name text; opportunity_column text;
begin
  foreach table_name in array array[
    'crm_walkthroughs', 'crm_tasks', 'crm_site_work_packages',
    'crm_opportunity_stage_history', 'crm_qualification_responses'
  ] loop
    opportunity_column := 'opportunity_id';
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.can_access_crm_opportunity(%I))',
      table_name || '_scoped_read', table_name, opportunity_column
    );
  end loop;
end
$crm_opportunity_child_policies$;

create policy crm_walkthroughs_scoped_insert on public.crm_walkthroughs
  for insert to authenticated with check (
    public.can_access_crm_opportunity(opportunity_id) and created_by = auth.uid()
  );
create policy crm_walkthroughs_scoped_update on public.crm_walkthroughs
  for update to authenticated using (public.can_access_crm_opportunity(opportunity_id))
  with check (public.can_access_crm_opportunity(opportunity_id));
create policy crm_walkthroughs_manager_delete on public.crm_walkthroughs
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy crm_tasks_scoped_insert on public.crm_tasks
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and created_by = auth.uid()
    and (opportunity_id is null or public.can_access_crm_opportunity(opportunity_id))
  );
create policy crm_tasks_scoped_update on public.crm_tasks
  for update to authenticated using (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator' and assignee_user_id = auth.uid())
  ) with check (
    public.can_manage_organization(organization_id)
    or (public.organization_role(organization_id) = 'estimator' and assignee_user_id = auth.uid())
  );
create policy crm_tasks_manager_delete on public.crm_tasks
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy crm_site_work_packages_scoped_insert on public.crm_site_work_packages
  for insert to authenticated with check (
    public.can_access_crm_opportunity(opportunity_id) and created_by = auth.uid()
  );
create policy crm_site_work_packages_scoped_update on public.crm_site_work_packages
  for update to authenticated using (public.can_access_crm_opportunity(opportunity_id))
  with check (public.can_access_crm_opportunity(opportunity_id));
create policy crm_site_work_packages_manager_delete on public.crm_site_work_packages
  for delete to authenticated using (public.can_manage_organization(organization_id));

create policy crm_qualification_responses_scoped_insert on public.crm_qualification_responses
  for insert to authenticated with check (
    public.can_access_crm_opportunity(opportunity_id) and created_by = auth.uid()
  );

create policy crm_attribution_touches_scoped_read on public.crm_attribution_touches
  for select to authenticated using (
    public.can_manage_organization(organization_id)
    or (opportunity_id is not null and public.can_access_crm_opportunity(opportunity_id))
    or (lead_id is not null and exists (
      select 1 from public.crm_leads l where l.id = lead_id
        and l.organization_id = organization_id
        and public.organization_role(organization_id) = 'estimator'
        and (l.created_by = auth.uid() or l.assigned_to_user_id = auth.uid())
    ))
  );
create policy crm_attribution_touches_scoped_insert on public.crm_attribution_touches
  for insert to authenticated with check (
    public.can_edit_organization_work(organization_id) and created_by = auth.uid()
  );

-- Explicit authenticated grants; RLS remains the authorization boundary.
grant select, insert, update, delete on
  public.crm_customers, public.crm_contacts, public.crm_customer_contacts,
  public.crm_properties, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_loss_reasons, public.crm_lead_sources, public.crm_referral_sources,
  public.crm_leads, public.crm_opportunities, public.crm_walkthroughs,
  public.crm_tasks, public.crm_site_work_packages,
  public.crm_attribution_touches, public.crm_qualification_responses
to authenticated;
grant select on public.crm_opportunity_stage_history to authenticated;
revoke insert, update, delete, truncate on public.crm_opportunity_stage_history
  from public, anon, authenticated;

grant all on
  public.crm_customers, public.crm_contacts, public.crm_customer_contacts,
  public.crm_properties, public.crm_pipelines, public.crm_pipeline_stages,
  public.crm_loss_reasons, public.crm_lead_sources, public.crm_referral_sources,
  public.crm_leads, public.crm_opportunities, public.crm_walkthroughs,
  public.crm_tasks, public.crm_site_work_packages,
  public.crm_opportunity_stage_history, public.crm_opportunity_stage_commands,
  public.crm_task_commands, public.crm_assignment_commands,
  public.crm_attribution_touches,
  public.crm_qualification_responses
to service_role;

grant usage, select on sequence public.crm_opportunity_stage_history_id_seq to service_role;
revoke all on sequence public.crm_opportunity_stage_history_id_seq from public, anon, authenticated;

-- Keep updated_at consistent with the existing application convention.
do $crm_updated_at_triggers$
declare table_name text;
begin
  foreach table_name in array array[
    'crm_customers', 'crm_contacts', 'crm_properties', 'crm_pipelines',
    'crm_pipeline_stages', 'crm_loss_reasons', 'crm_lead_sources',
    'crm_referral_sources', 'crm_leads', 'crm_opportunities', 'crm_walkthroughs',
    'crm_tasks', 'crm_site_work_packages'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.handle_updated_at()',
      table_name || '_updated_at', table_name
    );
  end loop;
end
$crm_updated_at_triggers$;

commit;
