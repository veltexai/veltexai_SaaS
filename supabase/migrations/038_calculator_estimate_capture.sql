create table if not exists public.calculator_estimate_requests (
  id uuid primary key,
  email text not null,
  ip_hash text not null,
  transactional_consent_at timestamptz not null,
  marketing_consent_at timestamptz,
  attribution jsonb,
  estimate jsonb not null,
  delivery_status text not null check (delivery_status in ('pending','sent','failed')),
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.calculator_estimate_requests enable row level security;
create index if not exists calculator_estimate_requests_rate_idx on public.calculator_estimate_requests(ip_hash, created_at);
create index if not exists calculator_estimate_requests_email_idx on public.calculator_estimate_requests(lower(email));
comment on table public.calculator_estimate_requests is 'Transactional calculator estimate requests. Not a marketing subscription unless marketing_consent_at is populated separately.';
