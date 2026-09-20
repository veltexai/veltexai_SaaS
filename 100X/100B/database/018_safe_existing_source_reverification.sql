-- Refresh canonical verification only for an exact, still-eligible provider rediscovery.
-- This cannot clear suppression, change eligibility, change identity, or create a lead.
create or replace function public.refresh_100b_verified_source(
  requested_run_id uuid,
  requested_source_id uuid,
  requested_normalized_email text,
  requested_verified_at timestamptz
) returns boolean
language plpgsql security definer set search_path = pg_catalog, public as $$
declare changed boolean;
begin
  if requested_normalized_email is null or btrim(requested_normalized_email) = '' then return false; end if;

  update public.prospect_contacts c
     set email_verification_status = 'verified',
         last_verified_at = requested_verified_at,
         updated_at = pg_catalog.now()
    from public.prospect_contact_sources s
   where s.id = requested_source_id
     and s.contact_id = c.id
     and c.normalized_email = lower(btrim(requested_normalized_email))
     and c.is_current_contact = true
     and c.outreach_eligibility = 'ready_for_outreach'
     and c.suppression_status = 'none'
     and exists (
       select 1 from public.enrichment_workflow_state
        where workflow_id = '100B' and lock_run_id = requested_run_id
          and lock_expires_at > pg_catalog.now()
     )
  returning true into changed;

  if coalesce(changed, false) then
    update public.prospect_contact_sources
       set last_observed_at = requested_verified_at,
           provider_verification_status = 'verified'
     where id = requested_source_id;
  end if;
  return coalesce(changed, false);
end $$;

revoke all on function public.refresh_100b_verified_source(uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.refresh_100b_verified_source(uuid,uuid,text,timestamptz) to veltex_100b_worker;
