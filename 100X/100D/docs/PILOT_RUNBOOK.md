# 100D pilot runbook (deployment is separately founder-gated)

Nothing in this runbook is executed in this phase. Migration 004 is **unapplied**; no endpoint is
deployed; no Instantly webhook is registered; no event is ingested; no email is sent.

## Preconditions
- 100C pilot approved and healthy (migration 003 applied; approved campaign in Draft).
- Confirm Instantly event webhooks are available on the current plan (a dependency to verify before use).

## Deployment steps (each separately authorized)
1. **Review + apply migration 004** to the approved pilot project only (never production). Verify: the
   `veltex_100d_ingest` role flags; RLS on the four new tables; fixed `search_path` on the six functions;
   EXECUTE-only grant to the role (no table DML); receipt/processing check constraints; and that 001/002/003
   remain byte-identical.
2. **Mint the ingest JWT** (role `veltex_100d_ingest`, short-lived) and store it server-side as
   `VELTEX_100D_INGEST_JWT`. Never in the repo or the browser.
3. **Set the webhook secret**: generate a high-entropy `VELTEX_100D_WEBHOOK_SECRET` (≥16 chars) in the
   server environment. Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the pilot
   project. Leave `VELTEX_100D_ENABLED` unset until the final go.
4. **Offline verification** (no deploy): `pnpm 100d:operator -- --mode=dry-run`, then `--mode=fixture-preview`,
   `--mode=local-route-test` (with the secret set), and `--mode=reconciliation-preview`. Review outcomes.
5. **Deploy the routes** (still gated by the disabled flag → they 404). Then register the Instantly webhook
   with `target_hook_url = …/api/internal/100x/instantly/events` and the custom header
   `X-Veltex-100D-Secret: <secret>`, scoped to the approved workspace + campaign, for the supported event
   types (see `INSTANTLY_EVENT_MAPPING.md`).
6. **Enable**: set `VELTEX_100D_ENABLED=true`. Send a controlled test event **to a staging/local endpoint
   only** (never a live send). Confirm: one receipt, correct classification, suppression for bounce/unsub,
   idempotent replay, unmatched held, and that a 100C recheck now blocks a suppressed contact.
7. **Customer/trial handoff**: wire existing signup/subscription events to POST
   `/api/internal/100x/customer-status` (see `CUSTOMER_STATUS_HANDOFF.md`). No Stripe change, no billing
   data.

## Stop conditions
Missing/invalid secret, wrong workspace/campaign, unexpected raw-body persistence, any non-append-only
behavior, or a receipt stored without its due suppression. Roll back by unsetting `VELTEX_100D_ENABLED`
and removing the webhook.

## What remains disabled after this build
Endpoints undeployed; webhook unregistered; migration 004 unapplied; no scheduler/cron; no reply-generation
AI; no HubSpot; no meeting scheduling. Reconciliation is a manual operator preview until a scheduler is
separately built.
