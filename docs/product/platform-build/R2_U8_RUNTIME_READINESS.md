# U8 background-job / runtime readiness analysis

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
| **R2 outbox + service-role claimer**, woken by a short-interval Supabase scheduled function or `pg_cron` after separately authorized enablement | Yes. Uses committed tables and the existing service role already used by server jobs | Visibility via `available_at`; claim with `ORDER BY available_at, event_sequence` and `FOR UPDATE SKIP LOCKED` (spike SQL later); an explicit terminal-DLQ state/exclusion predicate is still required | Inbox `(consumer, event_id)` already committed; outbox `(organization_id, event_id)` unique | `attempts`, `last_error`, `delivered_at`; Sentry already registers Vercel cron check-ins and can be extended later without a new vendor | No new paid product and no new credential in this assignment. Wake cost is scheduled-function invocations only | **Provisional direction; executable spike required** |
| Vercel Cron as the *job store* (pattern of `trial-automation`) | Already exists for marketing/trial mail | Daily schedule; comment in the route admits a skipped day. Prompt 2 U8 forbids this as the contractual mechanism | Table-level dedupe only for that mail feature | Sentry cron check-in for that one path | Existing `CRON_SECRET` | **Rejected as Bid-to-Won dispatcher.** Cron may later *wake* the claimer; it must not replace the outbox |
| Supabase Queues / pgmq as a *second* durable log | `pgmq` 1.5.1 is available but not installed on the isolated preview; no `supabase/config.toml` exists in this worktree | Meets Prompt 2’s preferred class if visibility/DLQ are configured and proved | Would duplicate the already-committed outbox unless used only as a wake/channel | Provider metrics plus outbox rows | Enabling the extension is a hosted mutation and is **not** authorized here | **Candidate for the executable spike, not selected** |
| Inngest-class / QStash / other managed worker | Not in the repo. Would add a dependency and an external control plane | Typically strong retries/DLQ | Must still consume the R2 outbox or risk dual sources of truth | Vendor dashboards | Requires purchase or new credentials — forbidden by this assignment | **Deferred.** Revisit only after a founder cost decision if the Supabase-native claimer fails a later spike |

## Evidence captured after the desk review

Read-only isolated-preview inventory on 2026-09-26:

- `pg_net` 0.20.4 is installed;
- `pg_cron` 1.6.4 is available but not installed;
- `pgmq` 1.5.1 is available but not installed;
- `http` 1.6 is available but not installed.

Evidence: `quality/r2-hosted-verification-20260925/u8-preview-runtime-inventory-20260926.json`.
No extension was enabled.

Current official external comparison (read-only research, 2026-09-25 Pacific):

- [Supabase Queues](https://supabase.com/docs/guides/queues) is Postgres-native,
  pgmq-backed and provides durable delivery, visibility windows, archival and
  queue monitoring. The extension is available on the preview, but enabling and
  executing it remain consequential hosted actions.
- [QStash pricing](https://upstash.com/pricing/qstash) lists a $0 tier capped at
  1,000 messages/day and usage pricing of $1 per 100,000 delivery attempts;
  retries count as additional messages. Usage pricing lists seven-day DLQ
  retention. This would require a new external account/credential and is not
  selected.
- [Inngest pricing](https://www.inngest.com/pricing) lists a $0 Hobby tier with
  50,000 executions/month and a Pro tier starting at $99/month with one million
  executions, managed retries, concurrency and observability. This would add an
  external control plane and is not selected.

This closes the preview metadata and official capability/cost research portions
of U8. The executable claim/retry/terminal-DLQ comparison remains open.

## Provisional recommendation — U8 remains OPEN

The present repository evidence favors keeping the committed R2 transactional
outbox as the sole durable job log. This is a **provisional direction**, not the
required U8 technical-spike decision. The isolated-preview inventory and
official external capability/cost comparison are now captured. U8 remains open
until executable claim/retry/terminal-DLQ behavior is compared and proved.

If that evidence passes, implement (when separately authorized) a
**service-role outbox claimer** that:

1. selects pending rows (`delivered_at is null` and `available_at <= now()`)
   in `event_sequence` order;
2. claims with a visibility timeout by advancing `available_at` and
   incrementing `attempts` in the same update;
3. delivers at-least-once to an idempotent consumer (inbox key already exists);
4. on success sets `delivered_at`;
5. on exhaustion of a recorded attempt bound writes an explicit terminal state
   (or equivalent exclusion predicate) that prevents reclaim until an operator
   intentionally replays it; `last_error` alone is not sufficient;
6. is *woken* by the smallest Supabase-native scheduler available on the
   isolated preview — not by treating Vercel Cron as the store.

This appears to be the smallest option consistent with U8, ADR-007, and the
tables already merged. It is not selected until the required spike proves the
wake/runtime, retry ceiling, terminal dead-letter state, observability and cost.

Do not implement the claimer in this assignment.

## Rollback

Match `R2_MIGRATION_AND_ROLLBACK.md`: application-first. Disable the scheduler /
claimer; leave outbox and inbox rows in place. Do not drop
`organization_event_outbox` after real events exist. Destructive reversal stays
preview-only and founder-gated.

## Open decisions (not invented here)

- Exact attempt ceiling and 24 h handoff retry bound (Prompt 3 records 24 h for
  later webhook delivery; R2 has no numeric bound yet).
- Whether the executable spike should temporarily enable available `pg_cron`
  1.6.4 and/or `pgmq` 1.5.1 on the isolated preview, then compare them with the
  outbox-only claimer. The metadata inventory is complete; enablement is not.
- Whether Sentry check-ins are extended from the trial cron to the claimer.
- Whether a later founder decision introduces an external worker after the
  native claimer is evidenced.
- The current outbox has no terminal dead-letter status. `last_error` alone does
  not stop a row whose `delivered_at` is null and `available_at <= now()` from
  being reclaimed. The spike must define and prove an explicit terminal state
  or equivalent exclusion predicate before implementation approval.

## Risks

- Calling the existing daily Vercel cron “good enough” for handoff/webhooks
  contradicts U8.
- Enabling pgmq or creating a vendor account during the spike would exceed this
  assignment.
- Dual-writing to both the R2 outbox and an external queue creates split-brain
  delivery.
- Payload logging of outbox `jsonb` can leak tenant data; keep logs to IDs,
  `event_type`, `attempts`, and error class.
