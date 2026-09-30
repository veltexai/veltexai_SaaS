begin;

-- These tables were created after the legacy blanket grants. RLS already
-- defines the tenant/admin boundary; align table privileges so authenticated
-- application sessions can actually reach those policies.
revoke all on table public.proposal_additional_services from anon, service_role;
grant select, insert, update, delete
  on table public.proposal_additional_services to authenticated;
revoke truncate, references, trigger
  on table public.proposal_additional_services from authenticated;

revoke all on table public.additional_service_catalog from anon, service_role;
grant select, insert, update, delete
  on table public.additional_service_catalog to authenticated;
revoke truncate, references, trigger
  on table public.additional_service_catalog from authenticated;
-- The server-only bulk catalog importer inserts rows and returns them. Preserve
-- only those two trusted privileges; all other direct service access is denied.
grant select, insert on table public.additional_service_catalog to service_role;
revoke update, delete, truncate, references, trigger
  on table public.additional_service_catalog from service_role;

commit;
