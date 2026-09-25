-- Remove the late legacy policy that reintroduced a self-referential lookup
-- on profiles. The SECURITY DEFINER is_admin() helper is the approved way to
-- evaluate admin membership without recursively invoking profiles RLS.
begin;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles
  for select
  to authenticated
  using (public.is_admin());

commit;
