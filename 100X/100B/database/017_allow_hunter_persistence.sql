begin;

-- Migration 016 added Hunter to the source-table constraint, but existing
-- installations still have the provider allowlist embedded in this security
-- definer function. Replace only that function so verified Hunter records pass
-- through the same lock, identity, eligibility, and source-audit controls.
create or replace function public.persist_100b_contact(
  requested_run_id uuid,
  contact_record jsonb,
  source_record jsonb,
  matched_contact_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare contact uuid; source_id uuid; contact_created boolean := false;
begin
  if not exists (
    select 1 from public.enrichment_workflow_state
    where workflow_id='100B'
      and lock_run_id=requested_run_id
      and lock_expires_at > pg_catalog.now()
  ) then
    raise exception using errcode='55000', message='persist requires the live run-owned 100B lock';
  end if;
  if source_record->>'provider' not in ('apollo','hunter','data_axle','csv_import','referral','fixture') then
    raise exception using errcode='22023', message='100B rejects unapproved contact provider';
  end if;
  contact := matched_contact_id;
  if contact is null then
    insert into public.prospect_contacts (
      prospect_id,first_name,last_name,full_name,title,role_category,email,normalized_email,
      email_verification_status,phone,linkedin_url,is_current_contact,outreach_eligibility,
      eligibility_reason,suppression_status,suppression_reason,first_discovered_at,last_verified_at
    ) values (
      (contact_record->>'prospect_id')::uuid,contact_record->>'first_name',contact_record->>'last_name',
      contact_record->>'full_name',contact_record->>'title',contact_record->>'role_category',
      contact_record->>'email',contact_record->>'normalized_email',contact_record->>'email_verification_status',
      contact_record->>'phone',contact_record->>'linkedin_url',(contact_record->>'is_current_contact')::boolean,
      contact_record->>'outreach_eligibility',contact_record->>'eligibility_reason',
      contact_record->>'suppression_status',contact_record->>'suppression_reason',
      (contact_record->>'first_discovered_at')::timestamptz,nullif(contact_record->>'last_verified_at','')::timestamptz
    ) returning id into contact;
    contact_created := true;
  elsif not exists (select 1 from public.prospect_contacts where id=contact) then
    raise exception 'matched contact does not exist';
  end if;
  insert into public.prospect_contact_sources (
    contact_id,provider,provider_record_id,provider_verification_status,provider_metadata,
    first_observed_at,last_observed_at
  ) values (
    contact,source_record->>'provider',source_record->>'provider_record_id',
    source_record->>'provider_verification_status',source_record->'provider_metadata',
    (source_record->>'first_observed_at')::timestamptz,(source_record->>'last_observed_at')::timestamptz
  ) returning id into source_id;
  return pg_catalog.jsonb_build_object(
    'contact_id',contact,'source_record_id',source_id,
    'contact_created',contact_created,'source_created',true
  );
end $$;

revoke all on function public.persist_100b_contact(uuid,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.persist_100b_contact(uuid,jsonb,jsonb,uuid) to veltex_100b_worker;

commit;
