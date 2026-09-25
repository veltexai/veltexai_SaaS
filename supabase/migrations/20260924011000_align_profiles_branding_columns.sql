-- Keep fresh and preview databases aligned with the branding fields used by
-- the profile API and proposal export path. Production already has this
-- nullable column; IF NOT EXISTS makes the migration safe there.
alter table public.profiles
  add column if not exists logo_url text;
