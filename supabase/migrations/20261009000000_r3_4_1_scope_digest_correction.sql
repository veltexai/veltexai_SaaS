begin;

-- R3-4.1 stored the final loop iteration's scope digest on every association
-- row in a mixed-scope publish. The immutable customer_visible_scope and the
-- association digest remained correct. Preserve that history, treat the legacy
-- metadata column as untrusted, and derive it for every future insert.
create function public.derive_crm_proposal_version_package_scope_sha256()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
begin
  new.scope_sha256:=public.crm_estimate_sha256(new.customer_visible_scope);
  return new;
end;
$$;

revoke all on function public.derive_crm_proposal_version_package_scope_sha256()
  from public,anon,authenticated,service_role;

create trigger derive_crm_proposal_version_package_scope_sha256
  before insert on public.crm_proposal_version_packages
  for each row execute function
    public.derive_crm_proposal_version_package_scope_sha256();

-- NOT VALID intentionally preserves immutable historical rows. PostgreSQL
-- still enforces the constraint for all new rows after the derivation trigger.
alter table public.crm_proposal_version_packages
  add constraint crm_proposal_version_packages_scope_digest_check
  check (
    scope_sha256=public.crm_estimate_sha256(customer_visible_scope)
  ) not valid;

comment on column public.crm_proposal_version_packages.scope_sha256 is
  'Derived from customer_visible_scope for rows inserted after migration 20261009000000. Older R3-4.1 rows may repeat the final package digest; consumers must derive from customer_visible_scope.';

commit;
