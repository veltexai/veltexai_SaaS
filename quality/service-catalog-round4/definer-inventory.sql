-- Read-only audit; run on disposable target clone and again during the separately
-- authorized real-target inventory. Caller-specific ownership checks in function
-- bodies must be reviewed; ACLs alone cannot establish their safety.
select p.oid::regprocedure as routine,
       has_function_privilege('anon', p.oid, 'execute') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
       p.proconfig as settings,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.prosecdef
order by p.oid::regprocedure::text;

-- Explicit release blocker: these legacy identity-parameter functions require
-- revocation plus caller binding (or service-only RPCs), not table RLS alone.
-- This assertion is intentionally expected to FAIL on the current base schema.
-- Do not remove the check to obtain a green release gate.
do $$ declare exposed text; begin
 select string_agg(p.oid::regprocedure::text, ', ') into exposed
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prosecdef
 and p.proname in ('increment_user_usage','get_user_usage_info','get_user_current_usage','can_user_create_proposal')
 and has_function_privilege('anon',p.oid,'execute');
 if exposed is not null then raise exception 'RELEASE BLOCKED: anonymous legacy identity RPCs: %', exposed; end if;
end $$;
