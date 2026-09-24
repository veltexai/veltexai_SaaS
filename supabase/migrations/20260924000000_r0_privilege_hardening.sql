-- R0 privilege hardening. Additive and idempotent.
-- Keeps the last deployed business logic behind caller-bound wrappers while
-- removing direct client execution of the legacy identity-parameter routines.
begin;

-- Production containment is repeated here so a new environment cannot recreate
-- the plaintext SMTP read exposure from migration 018.
drop policy if exists "Allow read access to system settings" on public.system_settings;
revoke all on table public.system_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.system_settings to service_role;

-- Move the effective legacy implementations behind private, ungranted names.
-- The conditional rename makes a second application a no-op before wrappers
-- are replaced below.
do $$
declare item record;
begin
  for item in
    select * from (values
      ('get_user_current_usage','uuid','_r0_get_user_current_usage_impl'),
      ('can_user_create_proposal','uuid','_r0_can_user_create_proposal_impl'),
      ('get_user_usage_info','uuid','_r0_get_user_usage_info_impl'),
      ('increment_user_usage','uuid','_r0_increment_user_usage_impl'),
      ('can_user_access_template','uuid,uuid','_r0_can_user_access_template_impl'),
      ('user_has_active_access','uuid','_r0_user_has_active_access_impl'),
      ('get_user_accessible_templates','uuid','_r0_get_user_accessible_templates_impl')
    ) as v(old_name,arg_types,new_name)
  loop
    if to_regprocedure(format('public.%I(%s)', item.new_name, item.arg_types)) is null
       and to_regprocedure(format('public.%I(%s)', item.old_name, item.arg_types)) is not null then
      execute format('alter function public.%I(%s) rename to %I', item.old_name, item.arg_types, item.new_name);
    end if;
  end loop;
end $$;

revoke all on function public._r0_get_user_current_usage_impl(uuid) from public, anon, authenticated;
revoke all on function public._r0_can_user_create_proposal_impl(uuid) from public, anon, authenticated;
revoke all on function public._r0_get_user_usage_info_impl(uuid) from public, anon, authenticated;
revoke all on function public._r0_increment_user_usage_impl(uuid) from public, anon, authenticated;
revoke all on function public._r0_can_user_access_template_impl(uuid,uuid) from public, anon, authenticated;
revoke all on function public._r0_user_has_active_access_impl(uuid) from public, anon, authenticated;
revoke all on function public._r0_get_user_accessible_templates_impl(uuid) from public, anon, authenticated;

alter function public._r0_get_user_current_usage_impl(uuid) set search_path = pg_catalog, public;
alter function public._r0_can_user_create_proposal_impl(uuid) set search_path = pg_catalog, public;
alter function public._r0_get_user_usage_info_impl(uuid) set search_path = pg_catalog, public;
alter function public._r0_increment_user_usage_impl(uuid) set search_path = pg_catalog, public;
alter function public._r0_can_user_access_template_impl(uuid,uuid) set search_path = pg_catalog, public;
alter function public._r0_user_has_active_access_impl(uuid) set search_path = pg_catalog, public;
alter function public._r0_get_user_accessible_templates_impl(uuid) set search_path = pg_catalog, public;

create or replace function public.r0_assert_self_or_service(target_user uuid)
returns void language plpgsql stable security invoker
set search_path = pg_catalog, public as $$
begin
  if target_user is null then raise exception 'user id is required' using errcode='22023'; end if;
  if not (
       current_setting('role', true) = 'service_role'
       or (
         coalesce(current_setting('role', true), 'none') = 'none'
         and session_user in ('service_role','postgres','supabase_admin')
       )
     )
     and auth.uid() is distinct from target_user then
    raise exception 'not authorized for requested user' using errcode='42501';
  end if;
end $$;
revoke all on function public.r0_assert_self_or_service(uuid) from public, anon;
grant execute on function public.r0_assert_self_or_service(uuid) to authenticated, service_role;

create or replace function public.get_user_current_usage(user_uuid uuid)
returns integer language plpgsql stable security definer
set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return public._r0_get_user_current_usage_impl(user_uuid);
end $$;

create or replace function public.can_user_create_proposal(user_uuid uuid)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return public._r0_can_user_create_proposal_impl(user_uuid);
end $$;

create or replace function public.get_user_usage_info(user_uuid uuid)
returns table(current_usage integer, proposal_limit integer, can_create_proposal boolean,
  subscription_plan text, subscription_status text, remaining_proposals integer,
  is_trial boolean, trial_end_at timestamptz)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return query select * from public._r0_get_user_usage_info_impl(user_uuid);
end $$;

create or replace function public.increment_user_usage(user_uuid uuid)
returns boolean language plpgsql volatile security definer
set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return public._r0_increment_user_usage_impl(user_uuid);
end $$;

create or replace function public.can_user_access_template(user_uuid uuid, template_uuid uuid)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return public._r0_can_user_access_template_impl(user_uuid, template_uuid);
end $$;

create or replace function public.user_has_active_access(user_uuid uuid)
returns boolean language plpgsql stable security definer
set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return public._r0_user_has_active_access_impl(user_uuid);
end $$;

create or replace function public.get_user_accessible_templates(user_uuid uuid)
returns table(template_id uuid, template_name text, template_description text,
  template_type text, preview_image_url text, template_config jsonb,
  is_accessible boolean, sort_order integer)
language plpgsql stable security definer set search_path = pg_catalog, public as $$
begin
  perform public.r0_assert_self_or_service(user_uuid);
  return query select * from public._r0_get_user_accessible_templates_impl(user_uuid);
end $$;

revoke all on function public.get_user_current_usage(uuid) from public, anon;
revoke all on function public.can_user_create_proposal(uuid) from public, anon;
revoke all on function public.get_user_usage_info(uuid) from public, anon;
revoke all on function public.increment_user_usage(uuid) from public, anon;
revoke all on function public.can_user_access_template(uuid,uuid) from public, anon;
revoke all on function public.user_has_active_access(uuid) from public, anon;
revoke all on function public.get_user_accessible_templates(uuid) from public, anon;
grant execute on function public.get_user_current_usage(uuid) to authenticated, service_role;
grant execute on function public.can_user_create_proposal(uuid) to authenticated, service_role;
grant execute on function public.get_user_usage_info(uuid) to authenticated, service_role;
grant execute on function public.increment_user_usage(uuid) to authenticated, service_role;
grant execute on function public.can_user_access_template(uuid,uuid) to authenticated, service_role;
grant execute on function public.user_has_active_access(uuid) to authenticated, service_role;
grant execute on function public.get_user_accessible_templates(uuid) to authenticated, service_role;

-- Legitimate auth-bound helper used by RLS. It accepts no caller-supplied user.
alter function public.is_admin() set search_path = pg_catalog, public;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- These maintenance/mutation routines have no browser call sites and are
-- restricted to trusted server/background execution.
alter function public.update_template_usage(uuid) set search_path = pg_catalog, public;
revoke all on function public.update_template_usage(uuid) from public, anon, authenticated;
grant execute on function public.update_template_usage(uuid) to service_role;
alter function public.handle_subscription_expiration() set search_path = pg_catalog, public;
revoke all on function public.handle_subscription_expiration() from public, anon, authenticated;
grant execute on function public.handle_subscription_expiration() to service_role;

-- Stripe/server lifecycle mutation is never client callable.
alter function public.start_user_trial(uuid,text) set search_path = pg_catalog, public;
revoke all on function public.start_user_trial(uuid,text) from public, anon, authenticated;
grant execute on function public.start_user_trial(uuid,text) to service_role;

-- Trigger routines need fixed resolution and no direct execution grant.
alter function public.handle_new_user() set search_path = pg_catalog, public;
revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
