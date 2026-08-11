# 100E — Reply Intelligence

100E turns authenticated Instantly reply events from 100D into durable, replay-safe classifications and
action routes. It is designed for full-volume operation but is disabled by default and pinned to the
isolated pilot until deployment verification is complete.

## What it does

- Classifies `reply_received` and `auto_reply_received` as interested, meeting intent, question, not
  interested, unsubscribe, out of office, wrong person, automatic reply, or unknown.
- Routes replies to sales review, scheduling review, delayed follow-up, human review, or no action.
- Atomically adds `do_not_contact` suppression for explicit opt-outs, not-interested replies, and wrong
  person replies so 100C blocks future outreach.
- Persists a SHA-256 fingerprint, content length, non-PII evidence codes, confidence, route, and version.
- Never persists the reply body, subject, HTML, secrets, or provider headers.
- Never drafts, sends, resumes, pauses, or edits email campaigns.

## Safety and scale

There is no artificial one-reply pilot cap in the domain model. Scale is controlled operationally by the
webhook provider and database. Idempotency is anchored to the 100D provider event ID. Unknown and low-
confidence replies route to human review instead of guessing. Migration `005` uses a dedicated
`veltex_100e_reply` role with EXECUTE on one fixed-search-path function and no table privileges.

## Environment

All are server-only:

- `VELTEX_100E_ENABLED` — exactly `true` to process replies; default false.
- `VELTEX_100E_MAX_REPLY_CHARS` — defaults to 32,000.
- `VELTEX_100E_SUPABASE_URL` — dedicated pilot URL.
- `VELTEX_100E_SUPABASE_ANON_KEY` — pilot publishable key.
- `VELTEX_100E_REPLY_JWT` — JWT whose role is exactly `veltex_100e_reply`.

No 100E credential falls back to shared production environment variables.
