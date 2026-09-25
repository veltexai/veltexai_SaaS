delete from auth.users where id='92000000-0000-4000-8000-000000000011';
do $$ begin
  if exists(select 1 from auth.users where id='92000000-0000-4000-8000-000000000011')
     or exists(select 1 from public.profiles where id='92000000-0000-4000-8000-000000000011')
     or exists(select 1 from public.organizations where created_by='92000000-0000-4000-8000-000000000011')
     or exists(select 1 from public.organization_memberships where user_id='92000000-0000-4000-8000-000000000011') then
    raise exception 'concurrency cleanup left synthetic user or tenant residue';
  end if;
end $$;
