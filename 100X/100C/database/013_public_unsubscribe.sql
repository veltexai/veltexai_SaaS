-- Public unsubscribe endpoint write primitive. Additive and fail-closed.
begin;
create or replace function public.apply_100c_public_unsubscribe(requested_email text, requested_external_reference text, requested_occurred_at timestamptz)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare inserted boolean := false;
begin
  if requested_email is null or btrim(requested_email) = '' or position('@' in requested_email) < 2 then
    raise exception using errcode='22023', message='valid email is required';
  end if;
  if exists (select 1 from public.outbound_suppression_registry where source = 'public_unsubscribe' and external_reference = requested_external_reference) then
    return jsonb_build_object('accepted', true, 'inserted', false);
  end if;
  insert into public.outbound_suppression_registry (kind, match_type, normalized_email, source, reason, external_reference, occurred_at)
  values ('do_not_contact', 'email', lower(btrim(requested_email)), 'public_unsubscribe', 'recipient requested unsubscribe', requested_external_reference, requested_occurred_at)
  on conflict (kind, match_type, coalesce(normalized_email,''), coalesce(normalized_domain,''), source, occurred_at) do nothing;
  inserted := true;
  return jsonb_build_object('accepted', true, 'inserted', inserted);
end $$;
revoke all on function public.apply_100c_public_unsubscribe(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.apply_100c_public_unsubscribe(text,text,timestamptz) to veltex_100d_ingest;
commit;
