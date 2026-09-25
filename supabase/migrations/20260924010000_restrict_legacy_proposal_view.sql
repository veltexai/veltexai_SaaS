-- Legacy definer view from migration 021 bypasses proposal owner RLS.
-- No application callers use it; customer access uses the token-scoped RPC.
-- Preserve the view for trusted server reporting and protect future grants.
begin;
alter view public.enhanced_proposals set (security_invoker = true);
revoke all on public.enhanced_proposals from public, anon, authenticated;
do $$
declare column_name text;
begin
  for column_name in
    select a.attname from pg_attribute a
    where a.attrelid='public.enhanced_proposals'::regclass
      and a.attnum>0 and not a.attisdropped
  loop
    execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.enhanced_proposals from public, anon, authenticated',
      column_name,column_name,column_name,column_name);
  end loop;
end $$;
grant select on public.enhanced_proposals to service_role;
comment on view public.enhanced_proposals is 'Legacy server-only reporting view. Client proposal access uses owner-RLS tables or the token-scoped public RPC.';
commit;
