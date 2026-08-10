# 100D security model

## Authentication
Instantly API V2 exposes **no** signed-webhook / HMAC mechanism (verified 2026-08 against
developer.instantly.ai — the Webhook object has a custom `headers` field but no signing secret).
100D therefore authenticates with a dedicated shared-secret custom header **`X-Veltex-100D-Secret`**:
- The secret comes only from the server env var `VELTEX_100D_WEBHOOK_SECRET` (never a query param, never
  a cookie, never end-user auth).
- Comparison is timing-safe (`node:crypto.timingSafeEqual` over fixed-width SHA-256 digests, so it never
  early-exits on length).
- Missing, blank, malformed, incorrect, or (server-side) unset/too-weak (<16 char) secrets fail closed.
- Responses are generic (`401`, no detail). The secret and request headers are never logged.
If Instantly later ships a documented signed-webhook mechanism, prefer it; do not invent signature
validation.

## Request hardening (both routes)
Disabled by default → `404` when `VELTEX_100D_ENABLED != true` (existence not revealed). `POST` only
(`405` otherwise). `Content-Type` must be JSON (`415`). Body is size-capped (`413`, default 64 KiB).
Payload shape is validated before any database access (`400`). Node runtime (crypto). No PII in logs.

## Database authorization (migration 004)
Dedicated role `veltex_100d_ingest` (`NOLOGIN NOINHERIT NOBYPASSRLS`) with a short-lived JWT whose role
claim is exactly `veltex_100d_ingest`. It holds **EXECUTE on the six 004 functions only** — no table
SELECT/INSERT/UPDATE/DELETE, no `SUPABASE_SERVICE_ROLE_KEY`. Every new table has RLS enabled and all
privileges revoked from `public`/`anon`/`authenticated`; only the fixed-search-path SECURITY DEFINER
functions (owned by the migration owner) read/write them. Functions set
`search_path = pg_catalog, public`.

## Append-only / no-weakening
Suppression, receipts, processing, and unmatched history are insert-or-noop. No function deletes or
updates a suppression; a reply/open/click never removes one; a trial ending never auto-removes one. The
migration contains no `DELETE`, `DROP TABLE`, or `TRUNCATE`.

## Data minimization
Persisted per event: provider, fingerprint id, event type, campaign config, contact (when resolved),
occurred/received time, engagement category, suppression flag/kind, and PII-free metadata
(step/variant/isFirst/flags). **Never persisted:** `email_text`, `email_html`, `reply_text`, `reply_html`,
`reply_subject`, `unibox_url`, Authorization headers, webhook secrets, API keys, billing/payment details.
Normalized email is stored only where the existing 003 registry already stores it (suppression + the
unmatched queue, for reconciliation matching); full emails never appear in logs or diagnostics.

## Secrets & rotation
- `VELTEX_100D_WEBHOOK_SECRET`: rotate by generating a new high-entropy value, updating the server env
  and the Instantly webhook's custom header together. Overlap is not supported (single active secret) —
  rotate during a quiet window.
- `VELTEX_100D_INGEST_JWT`: short-lived, minted server-side with role `veltex_100d_ingest`; never stored
  in the repo or exposed to the browser. Rotate by re-minting.
- Compromise response: rotate the webhook secret (stops unauthorized posts) and the ingest JWT
  immediately; because all history is append-only and idempotent, no data cleanup is required.

## Rollback
Nothing is deployed in this phase. To roll back a future deployment: set `VELTEX_100D_ENABLED` unset/false
(routes return 404) and remove the Instantly webhook. Migration 004 is additive; if reversal is ever
required, drop the four 004 tables, the six 004 functions, and the `veltex_100d_ingest` role — 001/002/003
are untouched and unaffected.
