# Customer / active-trial status handoff (100D)

Purpose: exclude existing Veltex AI customers and active trials from cold outreach **automatically**, by
adding a durable suppression to the same `outbound_suppression_registry` that 100C already reads — without
touching Stripe, billing logic, or C1–C7.

## Verified repository data model
Subscription/trial state lives in the app's own schema (verified in
`supabase/migrations/014_stripe_subscription_schema.sql`, `015_trial_system_setup.sql`,
`033_7_day_trial_system.sql`):
- `profiles`: `id` (= auth user id), `email`, `subscription_status` (default `trial`), `trial_end_at`,
  `stripe_customer_id`.
- `subscriptions`: `user_id → profiles.id`, `status`, `plan`, `current_period_start/end`, stripe ids.
- The Stripe webhook (`app/api/webhooks/stripe/route.ts`) already updates these on
  `customer.subscription.created/updated/deleted` and invoice events. **100D does not modify it.**

## Contract
`POST /api/internal/100x/customer-status` (disabled by default; same shared-secret auth as the event
webhook). Body:
```json
{ "status": "subscription_active", "email": "user@company.com",
  "occurredAt": "2026-08-10T00:00:00Z", "externalReference": "sub_…", "source": "veltex_customer_status" }
```
Matching is by **normalized user email only**. No billing data is sent or stored; `externalReference` is an
opaque, non-secret id (e.g. a subscription id) for audit.

## Status → durable suppression kind
| incoming status | registry kind |
| --- | --- |
| `trial_started`, `subscription_trialing` | `active_trial` |
| `subscription_active`, `customer_confirmed` | `existing_customer` |

Applied idempotently via `apply_100d_customer_status` (dedupe on kind/match/email/source/occurred-at). A
duplicate status event is a no-op.

## Clean future integration point (not wired in this phase)
Emit a `customer-status` POST from the existing signup/subscription flow — e.g. immediately after the
Stripe webhook updates `profiles.subscription_status`, read the user's `profiles.email` and post the
mapped status. Because ingestion is server-to-server with the shared secret and is idempotent, it is safe
to (re)emit on every subscription change. Recommended emit points: trial start, trialing→active, and an
explicit customer confirmation.

## Append-only (deliberate)
Suppression is never auto-removed when a trial ends or a subscription cancels — former customers must not
silently re-enter cold outreach. Re-enabling outreach to a former customer is a separate, deliberate,
future decision, not an automatic side effect of a cancellation event.
