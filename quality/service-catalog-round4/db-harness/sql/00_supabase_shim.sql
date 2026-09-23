-- Synthetic Supabase compatibility shim (NOT Supabase). Approximates: client roles anon/authenticated,
-- service_role with BYPASSRLS, auth.uid()/auth.role()/auth.jwt() from request.jwt.claim(s) GUCs, a minimal
-- auth.users table (the base migrations' on_auth_user_created trigger creates profiles from it), a minimal
-- storage schema, and Supabase's default privileges (ALL on new public tables/functions/sequences to
-- anon/authenticated/service_role). That last default is what makes R3-3 observable; verify it against
-- the real target's pg_default_acl before relying on the result.
-- Differences from sql/00_supabase_shim.as_used.sql: idempotent role creation (roles are cluster-wide),
-- authenticator is NOLOGIN (no password anywhere), and role grants go to current_user instead of postgres.
create extension if not exists pgcrypto;
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator nologin noinherit; end if;
end $$;
grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to current_user;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb, created_at timestamptz default now(), email_confirmed_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text $$;
create or replace function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''),'{}')::jsonb $$;
grant usage on schema auth to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema if not exists storage; create table if not exists storage.buckets(id text primary key, name text, public boolean); create table if not exists storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name,'/') $$;
