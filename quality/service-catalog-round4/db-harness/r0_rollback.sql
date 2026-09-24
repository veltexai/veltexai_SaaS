-- Emergency rollback for the R0 wrapper migration. Run only after an explicit
-- deployment rollback decision. WARNING: this restores authenticated EXECUTE
-- on identity-parameter functions and therefore reopens the cross-user access
-- R0 closes. It intentionally does not restore client readability of
-- system_settings. Prefer a forward fix whenever possible.
begin;
drop function if exists public.get_user_current_usage(uuid);
drop function if exists public.can_user_create_proposal(uuid);
drop function if exists public.get_user_usage_info(uuid);
drop function if exists public.increment_user_usage(uuid);
drop function if exists public.can_user_access_template(uuid,uuid);
drop function if exists public.user_has_active_access(uuid);
drop function if exists public.get_user_accessible_templates(uuid);
drop function if exists public.r0_assert_self_or_service(uuid);
alter function public._r0_get_user_current_usage_impl(uuid) rename to get_user_current_usage;
alter function public._r0_can_user_create_proposal_impl(uuid) rename to can_user_create_proposal;
alter function public._r0_get_user_usage_info_impl(uuid) rename to get_user_usage_info;
alter function public._r0_increment_user_usage_impl(uuid) rename to increment_user_usage;
alter function public._r0_can_user_access_template_impl(uuid,uuid) rename to can_user_access_template;
alter function public._r0_user_has_active_access_impl(uuid) rename to user_has_active_access;
alter function public._r0_get_user_accessible_templates_impl(uuid) rename to get_user_accessible_templates;
grant execute on function public.get_user_current_usage(uuid) to authenticated;
grant execute on function public.can_user_create_proposal(uuid) to authenticated;
grant execute on function public.get_user_usage_info(uuid) to authenticated;
grant execute on function public.increment_user_usage(uuid) to authenticated;
grant execute on function public.can_user_access_template(uuid,uuid) to authenticated;
grant execute on function public.user_has_active_access(uuid) to authenticated;
grant execute on function public.get_user_accessible_templates(uuid) to authenticated;
commit;
