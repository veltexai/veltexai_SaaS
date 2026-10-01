-- Preserve the immutable 20260924000000 migration bytes while applying the
-- later service-role restriction as a forward-only migration.
begin;

revoke all on function public._r0_get_user_current_usage_impl(uuid) from service_role;
revoke all on function public._r0_can_user_create_proposal_impl(uuid) from service_role;
revoke all on function public._r0_get_user_usage_info_impl(uuid) from service_role;
revoke all on function public._r0_increment_user_usage_impl(uuid) from service_role;
revoke all on function public._r0_can_user_access_template_impl(uuid, uuid) from service_role;
revoke all on function public._r0_user_has_active_access_impl(uuid) from service_role;
revoke all on function public._r0_get_user_accessible_templates_impl(uuid) from service_role;

commit;
