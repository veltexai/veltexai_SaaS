# 100D — Automated Suppression & Event Intelligence

100D closes the acquisition feedback loop. It receives outbound events (Instantly) and internal
customer/trial status, records them **idempotently**, and feeds the durable
`outbound_suppression_registry` that 100C already reads — so existing customers, active trials,
unsubscribes, hard bounces, spam complaints, and do-not-contact records automatically block future
outreach without human review. **Not deployed, not activated, disabled by default.**

```
Instantly webhook ──▶ shared-secret auth ──▶ workspace/campaign allowlist ──▶ validate + normalize
  ──▶ deterministic fingerprint ──▶ resolve contact ──▶ [atomic] idempotent receipt (+ suppression
      when bounce/unsub/complaint/DNC) + processing outcome + hold-if-unmatched ──▶ 100C recheck blocks
Internal status  ──▶ shared-secret auth ──▶ normalize ──▶ customer/active-trial suppression (idempotent)
```

## Status and safety
- **Disabled by default** (`VELTEX_100D_ENABLED` must equal `true`). No endpoint is deployed and no
  Instantly webhook is registered in this phase.
- **Instantly API V2 only.** No official signed-webhook mechanism exists, so authentication is a
  dedicated shared-secret header `X-Veltex-100D-Secret`, compared timing-safely to a server-only env var.
- **No PII at rest beyond normalized email.** Full email/reply bodies (`email_text`, `email_html`,
  `reply_text`, `reply_html`, subjects, unibox URLs) are never read into the domain model or persisted.
  Secrets, API keys, and Authorization headers are never logged or stored.
- **Least privilege.** All mutation flows through migration-004 fixed-search-path `SECURITY DEFINER`
  functions; the route authenticates as the dedicated `veltex_100d_ingest` role (a short-lived JWT) with
  EXECUTE on those functions only — no direct table access, no service-role key.
- **Additive only.** Migration `004` adds a role, four tables, and functions. It does not modify `001`,
  `002`, or `003`; it only *reads/writes the existing* receipt + suppression tables from inside functions.
- **Append-only.** Receipts, suppression, processing, and unmatched history are never deleted or
  weakened. A reply/open/click never removes a suppression. A trial ending never auto-removes suppression.

## What it does automatically (once approved + deployed)
Recognizes and blocks: existing customers, active trials, unsubscribes, hard bounces, spam complaints,
do-not-contact, manual blocks, legal/compliance suppressions. Ingestion and suppression then run without
routine human review; founder approval remains for initial deployment, credentials, and limit changes.

## Operator (terminal only, all offline)
```
pnpm 100d:operator -- --mode=dry-run                 # validate config + allowlist; construct nothing
pnpm 100d:operator -- --mode=fixture-preview         # synthetic events through the full pipeline
pnpm 100d:operator -- --mode=local-route-test        # exercise shared-secret auth + pipeline, no server
pnpm 100d:operator -- --mode=reconciliation-preview  # hold unmatched, then reconcile after late assignment
```

## Required environment (only when a founder later deploys — nothing is set/used in this phase)
`VELTEX_100D_ENABLED=true`, `VELTEX_100D_WEBHOOK_SECRET` (≥16 chars), `VELTEX_100D_INGEST_JWT`
(role `veltex_100d_ingest`), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, optional
`VELTEX_100D_MAX_BODY_BYTES` (default 65536).

Endpoints (written, **not deployed**): `POST /api/internal/100x/instantly/events`,
`POST /api/internal/100x/customer-status`.

Docs: `ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/TESTING.md`, `docs/PILOT_RUNBOOK.md`,
`docs/INSTANTLY_EVENT_MAPPING.md`, `docs/CUSTOMER_STATUS_HANDOFF.md`.
Migration: `database/004_automated_suppression_and_event_intelligence.sql` (unapplied; depends on 001+002+003).
