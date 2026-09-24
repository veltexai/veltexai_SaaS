-- Read-only target preflight for the R0 candidate b341e50.
-- A missing function is not permission to weaken grants or install placeholder logic.
do $$
declare signature text;
begin
  foreach signature in array array[
    'get_user_current_usage(uuid)', 'can_user_create_proposal(uuid)',
    'get_user_usage_info(uuid)', 'increment_user_usage(uuid)',
    'can_user_access_template(uuid,uuid)', 'user_has_active_access(uuid)',
    'get_user_accessible_templates(uuid)', 'is_admin()',
    'update_template_usage(uuid)', 'handle_subscription_expiration()',
    'handle_new_user()'
  ] loop
    if to_regprocedure('public.' || signature) is null then
      raise exception 'R0 prerequisite public.% missing: reconcile actual target schema before applying b341e50', signature;
    end if;
  end loop;
end $$;
select 'R0 routine prerequisites present' as result;

-- The obsolete trial RPC is optional in b341e50; its absence is not a failure.
select to_regprocedure('public.start_user_trial(uuid,text)') is not null as optional_trial_rpc_present;
