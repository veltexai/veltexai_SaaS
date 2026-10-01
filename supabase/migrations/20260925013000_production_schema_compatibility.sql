begin;

-- Canonicalize application fields that were introduced directly in the
-- original production project before the migration chain was complete.
alter table public.profiles
  alter column subscription_status set default 'pending'::text;

alter table public.proposal_templates
  add column if not exists preview_pdf_url text;

alter table public.proposals
  add column if not exists city varchar(100);

-- Fail closed if an independently-created column has an incompatible shape.
do $shape$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='proposal_templates'
      and column_name='preview_pdf_url' and data_type='text'
      and is_nullable='YES' and column_default is null
  ) then
    raise exception 'proposal_templates.preview_pdf_url has an incompatible shape';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='proposals'
      and column_name='city' and data_type='character varying'
      and character_maximum_length=100 and is_nullable='YES'
  ) then
    raise exception 'proposals.city has an incompatible shape';
  end if;
end
$shape$;

alter table public.proposals alter column city set default null;

-- These values are written by the Stripe webhook and subscription routes.
-- Install the replacement constraints as NOT VALID first so a conflicting
-- legacy row aborts this transaction at VALIDATE rather than being hidden.
alter table public.billing_history
  drop constraint if exists billing_history_action_check;
alter table public.billing_history
  add constraint billing_history_action_check
  check (action = any (array[
    'upgrade'::text,
    'downgrade'::text,
    'payment'::text,
    'refund'::text,
    'subscription_start'::text
  ])) not valid;
alter table public.billing_history
  validate constraint billing_history_action_check;

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status = any (array[
    'active'::text,
    'trialing'::text,
    'cancelled'::text,
    'past_due'::text,
    'unpaid'::text
  ])) not valid;
alter table public.subscriptions
  validate constraint subscriptions_status_check;

-- Preserve owner self-access through the existing policy while giving only
-- authenticated administrators the cross-account billing-history view.
drop policy if exists "Admins can view all billing history"
  on public.billing_history;
create policy "Admins can view all billing history"
  on public.billing_history
  as permissive
  for select
  to authenticated
  using (public.is_admin());

comment on policy "Admins can view all billing history"
  on public.billing_history is
  'Authenticated administrators may inspect billing history across accounts. Owner self-access remains governed by the separate owner policy.';

commit;
