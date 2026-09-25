-- The current send API uses pdf_only/online_only/both, while legacy rows may
-- still contain pdf/online. Accept both vocabularies during the transition so
-- tracking records cannot fail silently after a successful delivery.
alter table public.proposal_tracking
  drop constraint if exists proposal_tracking_delivery_method_check;

alter table public.proposal_tracking
  add constraint proposal_tracking_delivery_method_check
  check (delivery_method in ('pdf', 'online', 'pdf_only', 'online_only', 'both'));
