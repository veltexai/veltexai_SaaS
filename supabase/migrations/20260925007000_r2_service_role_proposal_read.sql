-- R2 hosted-parity correction.
-- Supabase's service role bypasses RLS but still needs an ordinary table ACL.
-- Current trusted server workflows read proposals for lifecycle/admin reporting;
-- proposal mutations and raw tracking access remain outside this boundary.
begin;

revoke all on table public.proposals from service_role;
grant select on table public.proposals to service_role;
revoke all on table public.proposal_tracking from service_role;

commit;
