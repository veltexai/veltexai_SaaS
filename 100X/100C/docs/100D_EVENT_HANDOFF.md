# 100C → 100D event-ingestion handoff contract

**Status (2026-08-10): 100D is now implemented as a non-live foundation** under `100X/100D/` (core,
migration `004`, operator, tests, and two disabled-by-default routes). It fulfils this contract:
authenticated ingestion (timing-safe shared-secret header — Instantly V2 has no signed-webhook mechanism),
idempotency on `(provider, provider_event_id)` via a deterministic SHA-256 fingerprint (Instantly sends no
event id), append-only receipts + durable suppression, and immediate suppression on
bounce/unsubscribe/complaint/DNC so 100C's recheck blocks future sends. Nothing is deployed and migration
`004` is unapplied; Instantly event webhooks may still require a qualifying plan (a dependency to confirm
before deployment). The original contract below is preserved for reference.

---

100C defined the future contract and the idempotency foundation. No public webhook or route was built or
exposed by 100C itself; 100D owns those (disabled by default).

## Event types 100D will consume
`email_sent · email_bounced · email_opened · reply_received · auto_reply_received · link_clicked ·
lead_unsubscribed · campaign_completed · lead_interested · lead_not_interested · lead_meeting_booked ·
lead_closed · lead_out_of_office · lead_wrong_person`.

## The provider-neutral receipt (`OutboundEventReceipt` in `src/types.ts`)
- `provider`, `providerEventId` (unique per provider event — the idempotency key)
- `type`, `campaignConfigId`, `contactId`, `occurredAt`
- `suppresses` — whether the event must immediately suppress the contact (bounce/unsubscribe/complaint)

The DB foundation already exists: `outbound_event_receipts` with `unique (provider, provider_event_id)`
and the append-only `apply_100c_event_receipt(...)` function (idempotent insert; **does not** modify
`prospect_contacts`).

## 100D obligations (future, separately gated)
- **Authenticated** ingestion (verify the provider signature/secret; reject unauthenticated events).
- **Idempotent** on `(provider, providerEventId)` — a replayed webhook or reconciliation job is a no-op.
- **Append-only** receipts; never mutate historical events.
- **Replay-safe** — safe to reprocess the full event history.
- **Immediate suppression** — a bounce/unsubscribe/DNC/complaint updates suppression at once, so 100C's
  recheck (which already reads `outbound_event_receipts`) blocks any future send to that contact.
- Separate from the initial lead-submission build; owns its own tables beyond the shared receipts.

100C writing a lead is **not** a promise the campaign will send; 100D closes the loop by returning
delivery/engagement/suppression events to 100X.
