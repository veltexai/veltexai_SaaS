-- PREVIEW ONLY: restore template prerequisites omitted from the Supabase branch copy.
-- Derived from read-only production metadata on 2026-09-24. No application rows
-- or credentials are copied. Run only on preview ref wcnfhriosemgchmtwgof.
begin;

create table if not exists public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  template_type text not null check (template_type in ('basic','premium')),
  preview_image_url text,
  template_config jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  preview_pdf_url text
);

create table if not exists public.template_tier_access (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.proposal_templates(id) on delete cascade,
  subscription_tier text not null check (subscription_tier in ('starter','professional','enterprise')),
  created_at timestamptz default now(),
  unique (template_id, subscription_tier)
);

create index if not exists idx_proposal_templates_active on public.proposal_templates(is_active,sort_order);
create index if not exists idx_proposal_templates_type on public.proposal_templates(template_type);
create index if not exists idx_template_tier_access_template on public.template_tier_access(template_id);
create index if not exists idx_template_tier_access_tier on public.template_tier_access(subscription_tier);

alter table public.proposal_templates enable row level security;
alter table public.template_tier_access enable row level security;

drop policy if exists "Admins can manage all templates" on public.proposal_templates;
drop policy if exists "Users can view active templates" on public.proposal_templates;
drop policy if exists "Admins can manage template tier access" on public.template_tier_access;
drop policy if exists "Users can view template tier access" on public.template_tier_access;

create policy "Admins can manage all templates" on public.proposal_templates for all
  using (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "Users can view active templates" on public.proposal_templates for select using (is_active=true);
create policy "Admins can manage template tier access" on public.template_tier_access for all
  using (exists (select 1 from public.profiles where profiles.id=auth.uid() and profiles.role='admin'));
create policy "Users can view template tier access" on public.template_tier_access for select using (true);

grant all on table public.proposal_templates to anon, authenticated, service_role;
grant all on table public.template_tier_access to anon, authenticated, service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname='proposal_templates_updated_at'
    and tgrelid='public.proposal_templates'::regclass) then
    create trigger proposal_templates_updated_at before update on public.proposal_templates
      for each row execute function public.handle_updated_at();
  end if;
end $$;

create or replace function public.get_user_accessible_templates(user_uuid uuid)
returns table(template_id uuid,template_name text,template_description text,template_type text,
  preview_image_url text,template_config jsonb,is_accessible boolean,sort_order integer)
language plpgsql security definer as $$
declare user_tier text;
begin
  select coalesce(subscription_plan,'starter') into user_tier from public.profiles where id=user_uuid;
  if user_tier is null then user_tier := 'starter'; end if;
  return query select pt.id,pt.name,pt.description,pt.template_type,pt.preview_image_url,
    pt.template_config,(tta.template_id is not null),pt.sort_order
  from public.proposal_templates pt left join public.template_tier_access tta
    on pt.id=tta.template_id and tta.subscription_tier=user_tier
  where pt.is_active=true order by pt.sort_order asc,pt.created_at asc;
end $$;

create or replace function public.can_user_access_template(user_uuid uuid,template_uuid uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare profile_record record; user_tier text; has_access boolean := false;
begin
  select subscription_status,trial_end_at,subscription_plan into profile_record
    from public.profiles where id=user_uuid;
  if profile_record is null then return false; end if;
  if profile_record.subscription_status='free_trial' and profile_record.trial_end_at is not null
     and profile_record.trial_end_at>now() then
    select exists(select 1 from public.proposal_templates pt where pt.id=template_uuid
      and pt.name='Executive Premium' and pt.is_active=true) into has_access;
    if has_access then return true; end if;
  end if;
  select s.plan into user_tier from public.subscriptions s where s.user_id=user_uuid
    and s.status in ('active','trialing') order by s.created_at desc limit 1;
  if user_tier is null then user_tier := coalesce(profile_record.subscription_plan,'starter'); end if;
  select exists(select 1 from public.template_tier_access tta join public.proposal_templates pt
    on pt.id=tta.template_id where tta.template_id=template_uuid
    and tta.subscription_tier=user_tier and pt.is_active=true) into has_access;
  return has_access;
end $$;

revoke all on function public.can_user_access_template(uuid,uuid) from public;
grant execute on function public.can_user_access_template(uuid,uuid) to anon,authenticated,service_role;
grant execute on function public.get_user_accessible_templates(uuid) to public,anon,authenticated,service_role;

commit;
