begin;

-- Expand the PII-free health RPC with all-time reconciliation backlog and
-- conversion-funnel counts. No addresses, message bodies, provider ids, or
-- secrets are returned.
create or replace function public.read_100f_audit_health(
  requested_campaign_id text,
  requested_since timestamptz
)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  with selected_campaign as (
    select c.config_id
    from public.campaign_configs c
    where c.instantly_campaign_id::text = requested_campaign_id
    limit 1
  ), receipt_summary as (
    select
      count(*)::integer as receipt_count,
      count(*) filter (where e.suppresses)::integer as suppressing_event_count,
      count(*) filter (where e.event_type in ('reply_received','lead_interested'))::integer as reply_count,
      count(*) filter (where e.event_type = 'lead_interested')::integer as interested_reply_count,
      count(*) filter (where e.event_type in ('lead_meeting_booked','lead_meeting_completed'))::integer as meeting_event_count,
      count(*) filter (where e.event_type = 'lead_closed')::integer as conversion_event_count,
      max(e.occurred_at) as latest_event_at
    from public.outbound_event_receipts e
    join selected_campaign c on c.config_id = e.campaign_config_id
    where e.occurred_at >= requested_since
  ), processing_summary as (
    select
      count(*) filter (where p.outcome = 'held_unmatched')::integer as held_unmatched_count,
      count(*) filter (where p.outcome = 'reconciled')::integer as reconciled_count
    from public.outbound_event_processing p
    join selected_campaign c on c.config_id = p.campaign_config_id
    where p.occurred_at >= requested_since
  ), open_backlog as (
    select count(*)::integer as open_unmatched_count
    from public.outbound_unmatched_events u
    join selected_campaign c on c.config_id = u.campaign_config_id
    where u.resolved_at is null
  ), diagnostic_summary as (
    select
      count(*) filter (where d.level = 'error')::integer as ingestion_error_count,
      max(d.created_at) as latest_diagnostic_at
    from public.outbound_ingestion_diagnostics d
    where d.created_at >= requested_since
  ), suppression_summary as (
    select count(s.id)::integer as matched_suppression_count
    from public.outbound_event_receipts e
    join selected_campaign c on c.config_id = e.campaign_config_id
    left join public.outbound_suppression_registry s on s.external_reference = e.provider_event_id
    where e.occurred_at >= requested_since and e.suppresses
  )
  select pg_catalog.jsonb_build_object(
    'migrations_complete', true,
    'window_started_at', requested_since,
    'receipt_count', r.receipt_count,
    'suppressing_event_count', r.suppressing_event_count,
    'reply_count', r.reply_count,
    'interested_reply_count', r.interested_reply_count,
    'meeting_event_count', r.meeting_event_count,
    'conversion_event_count', r.conversion_event_count,
    'latest_event_at', r.latest_event_at,
    'held_unmatched_count', p.held_unmatched_count,
    'reconciled_count', p.reconciled_count,
    'open_unmatched_count', b.open_unmatched_count,
    'ingestion_error_count', d.ingestion_error_count,
    'latest_diagnostic_at', d.latest_diagnostic_at,
    'matched_suppression_count', s.matched_suppression_count
  )
  from receipt_summary r, processing_summary p, open_backlog b, diagnostic_summary d, suppression_summary s;
$$;

revoke all on function public.read_100f_audit_health(text,timestamptz) from public, anon, authenticated;
grant execute on function public.read_100f_audit_health(text,timestamptz) to veltex_100f_ramp_v2;

commit;
