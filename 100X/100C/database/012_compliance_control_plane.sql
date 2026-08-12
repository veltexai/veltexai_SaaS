-- 100C compliance control plane. Additive only; does not enable sending.
begin;

create table if not exists public.outbound_compliance_evidence (
  evidence_key text primary key,
  status text not null check (status in ('pending','verified','expired','failed')),
  value_hash text,
  source text not null,
  verified_by text,
  verified_at timestamptz,
  expires_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.outbound_control_audit (
  id bigint generated always as identity primary key,
  action text not null,
  actor text not null,
  target text,
  decision text not null check (decision in ('approved','held','paused','rejected','verified')),
  reason text not null,
  evidence_keys text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.outbound_system_controls (
  control_key text primary key check (control_key in ('global_send_pause','new_audience_pause','copy_change_pause')),
  enabled boolean not null default false,
  reason text,
  set_by text,
  updated_at timestamptz not null default now()
);
insert into public.outbound_system_controls(control_key) values
  ('global_send_pause'), ('new_audience_pause'), ('copy_change_pause')
on conflict (control_key) do nothing;

create table if not exists public.outbound_review_queue (
  id uuid primary key default gen_random_uuid(),
  review_type text not null check (review_type in ('reply','audience','copy','compliance','incident')),
  reference_id text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'pending' check (status in ('pending','in_review','resolved','dismissed')),
  reason text not null,
  payload_hash text,
  assigned_to text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.outbound_compliance_evidence enable row level security;
alter table public.outbound_control_audit enable row level security;
alter table public.outbound_system_controls enable row level security;
alter table public.outbound_review_queue enable row level security;
revoke all on public.outbound_compliance_evidence, public.outbound_control_audit, public.outbound_system_controls, public.outbound_review_queue from public, anon, authenticated;

commit;
