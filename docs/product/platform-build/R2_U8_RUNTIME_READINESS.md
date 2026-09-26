# U8 background-job / runtime readiness

Status: **PREPARED / NOT EXECUTED**  
Date: 2026-09-25 Pacific  
Candidate head this memo was prepared against: `f761469` on `codex/r2-integrated-read-adapter`  
Authorization: comparison and recommendation only. No purchase, configuration,
deployment, credential creation, hosted queue, or worker was performed.

## Binding sources

- Prompt 2 Codex **U8**: the transactional Postgres outbox is the durable source;
  run a bounded spike comparing Supabase Queues/pgmq with an external managed
  worker before implementation; prefer the smallest Supabase-native option that
  satisfies retries, dead-letter, observability and idempotency; **a best-effort
  cron is not sufficient for contractual handoffs**.
- Prompt 2 §5.1 / ADR-007: provider-neutral queue adapter; at-least-once
  delivery; visibility timeouts; dead-letter state; implementation choice was
  UNKNOWN at specification time (`pgmq` / Supabase Queues vs Inngest-class vs
  cron worker).
- Prompt 2 §5.1 topology: Next.js command handlers write domain tables and
  `outbox_event` in the same transaction; a dispatcher claims the outbox;
  webhook delivery is HMAC-signed with retries and a DLQ; inbound events hit an
  idempotent inbox.
- Prompt 3 §10.3 (future handoff, not R2 scope): webhook retries exponential for
  up to 24 h, then dead-letter and operator notification. That bound is recorded
  here as a later consumer requirement, not an R2 implementation task.
- R2 committed outbox/inbox (`20260925002000` + `20260925004000`):
  `organization_event_outbox` with `available_at`, `delivered_at`, `attempts`,
  `last_error`, monotonic `event_sequence`, unique `(organization_id, event_id)`;
  pending index `(available_at, event_sequence) WHERE delivered_at IS NULL`;
  inbox primary key `(consumer, event_id)`; browser `REVOKE ALL` on outbox/inbox;
  `GRANT ALL` to `service_role` only.
- Current app runtime, verified in this worktree: Next.js App Router, Supabase
  Postgres, Vercel. `vercel.json` declares one cron,
  `/api/cron/trial-automation` at `0 10 * * *`. That route is a daily
  best-effort lifecycle-email sweep keyed by `CRON_SECRET` and
  `email_automation_log` uniqueness. `package.json` has no Inngest, pgmq,
  QStash, BullMQ, Graphile Worker, or Trigger.dev dependency. No
  `supabase/functions` tree is present.

## Viable runtimes compared

| Option | Fits current stack? | Retries / visibility / DLQ | Idempotency | Observability | Secrets / cost | Verdict |
|---|---|---|---|---|---|---|
| **R2 outbox + service-role claimer**, woken by a short-interval Supabase scheduled function or `pg_cron` *if present on the preview* | Yes. Uses committed tables and the existing service role already used by server jobs | Visibility via `available_at`; claim with `ORDER BY available_at, event_sequence` and `FOR UPDATE SKIP LOCKED` (spike SQL later); DLQ via exhausted `attempts` + `last_error`; outbox remains the contract if a wake is missed | Inbox `(consumer, event_id)` already committed; outbox `(organization_id, event_id)` unique | `attempts`, `last_error`, `delivered_at`; Sentry already registers Vercel cron check-ins and can be extended later without a new vendor | No new paid product and no new credential in this assignment. Wake cost is scheduled-function invocations only | **Recommended bounded runtime** |
| Vercel Cron as the *job store* (pattern of `trial-automation`) | Already exists for marketing/trial mail | Daily schedule; comment in the route admits a skipped day. Prompt 2 U8 forbids this as the contractual mechanism | Table-level dedupe only for that mail feature | Sentry cron check-in for that one path | Existing `CRON_SECRET` | **Rejected as Bid-to-Won dispatcher.** Cron may later *wake* the claimer; it must not replace the outbox |
| Supabase Queues / pgmq as a *second* durable log | Unknown on hosted preview. No extension inventory is recorded; no `supabase/config.toml` in this worktree | Meets Prompt 2’s preferred class *if* the preview has the extension and visibility/DLQ are configured | Would duplicate the already-committed outbox unless used only as a wake/channel | Provider metrics plus outbox rows | Enabling an extension is a hosted mutation and is **not** authorized here | **Upgrade path, not the first runtime.** Inventory on the isolated preview before any enablement |
| Inngest-class / QStash / other managed worker | Not in the repo. Would add a dependency and an external control plane | Typically strong retries/DLQ | Must still consume the R2 outbox or risk dual sources of truth | Vendor dashboards | Requires purchase or new credentials — forbidden by this assignment | **Deferred.** Revisit only after a founder cost decision if the Supabase-native claimer fails a later spike |

## Recommendation

**Use the committed R2 transactional outbox as the sole durable job log.** Implement
(when separately authorized) a **service-role outbox claimer** that:

1. selects pending rows (`delivered_at is null` and `available_at <= now()`)
   in `event_sequence` order;
2. claims with a visibility timeout by advancing `available_at` and
   incrementing `attempts` in the same update;
3. delivers at-least-once to an idempotent consumer (inbox key already exists);
4. on success sets `delivered_at`;
5. on exhaustion of a recorded attempt bound writes a dead-letter state through
   `last_error` (and stops reclaiming until an operator replay);
6. is *woken* by the smallest Supabase-native scheduler available on the
   isolated preview — not by treating Vercel Cron as the store.

This is the smallest option that honors U8, ADR-007, and the tables already
merged. It does not require a new vendor, a new secret, or enabling pgmq before
the preview inventory exists.

Do not implement the claimer in this assignment.

## Rollback

Match `R2_MIGRATION_AND_ROLLBACK.md`: application-first. Disable the scheduler /
claimer; leave outbox and inbox rows in place. Do not drop
`organization_event_outbox` after real events exist. Destructive reversal stays
preview-only and founder-gated.

## Open decisions (not invented here)

- Exact attempt ceiling and 24 h handoff retry bound (Prompt 3 records 24 h for
  later webhook delivery; R2 has no numeric bound yet).
- Whether the isolated preview already has `pg_cron` or `pgmq` (UNKNOWN until a
  metadata-only inventory; that inventory is not this memo’s execution).
- Whether Sentry check-ins are extended from the trial cron to the claimer.
- Whether a later founder decision introduces an external worker after the
  native claimer is evidenced.

## Risks

- Calling the existing daily Vercel cron “good enough” for handoff/webhooks
  contradicts U8.
- Enabling pgmq or creating a vendor account during the spike would exceed this
  assignment.
- Dual-writing to both the R2 outbox and an external queue creates split-brain
  delivery.
- Payload logging of outbox `jsonb` can leak tenant data; keep logs to IDs,
  `event_type`, `attempts`, and error class.
