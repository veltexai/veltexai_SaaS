# U8 local disposable claimer spike

Status: **LOCAL SPIKE EXECUTED / HOSTED NOT EXECUTED**

Runtime choice: **OPEN**

This directory is an in-memory comparison harness for the committed
transactional outbox contract. It does not install or enable `pg_cron`,
`pgmq`, QStash, Inngest, or any hosted service.

## What this models and tests locally

- claim order by `available_at`, then `event_sequence`
- immutable lease token on every claim
- same-worker double-claim denial while a lease is unexpired
- expiry/reclaim with a new token
- stale-success and stale-failure denial after reclaim
- transactional inbox+outbox completion: both persist on success
- injected fault between inbox insert and outbox `delivered_at` rolls both back
- duplicate inbox conflict leaves outbox undelivered
- four-total-attempt ceiling: initial attempt plus three retries
- observed end-to-end retry delays 100 / 200 / 400 ms, then terminal DLQ
- explicit `dead_lettered_at`; `last_error` alone is not a terminal DLQ
- cleanup leaves no residue

The committed outbox table does not yet contain the modeled immutable
lease-token or `dead_lettered_at` columns. This harness is algorithm evidence;
it is not proof of the current hosted schema or runtime.

## What remains unproven

- hosted `pg_cron` or `pgmq` wake
- Supabase scheduled-function latency
- real HMAC webhook delivery

```bash
node --test ./quality/r2-hosted-verification-20260925/u8-local-spike/outbox-claimer.test.mjs
node ./quality/r2-hosted-verification-20260925/u8-local-spike/run-u8-local-spike.mjs
```
