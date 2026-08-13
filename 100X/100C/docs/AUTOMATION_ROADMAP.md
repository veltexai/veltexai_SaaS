# 100C automation-readiness roadmap

The long-term system runs without routine human review. Founder approval is required for **initial
campaign configuration and pilot activation** — not for each future qualified lead. 100C's design already
supports contact-by-contact automation without a human queue.

## Already true (this phase)
- **Automatic selection** — the runner pulls ready 100B contacts and rechecks every rule; a human does
  not approve each contact.
- **Automatic rejection** — stale/unverified/suppressed/ineligible/duplicate contacts fail closed with a
  preserved reason.
- **Automatic duplicate prevention** — the unique `(contact_id, campaign_config_id)` constraint plus the
  reservation lifecycle prevent any double-submission across replays/retries/overlap.
- **Automatic safety stops** — an unauthorized or unhealthy campaign state, auth/scope/payment/campaign-not-found error,
  or exceeded cap stops the run; ambiguous outcomes go to reconciliation, never a blind retry.
- **Automatic audit trail** — assignments, append-only attempts, lead mappings, and diagnostics.
- **Safe transient retry only** — retryable failures are marked `failed_retryable`; unsafe/permanent
  ones are terminal.

## To reach unattended production (each separately founder-gated)
1. Approve the pilot environment + a Draft/Paused campaign; apply `003`; issue the worker JWT; run the
   supervised single-lead controlled write; review.
2. Raise the centralized caps deliberately (contacts/leads/requests) after the pilot proves out — caps
   live in one place (`src/config.ts` / `campaign_configs`), never scattered.
3. **Implemented:** 100G invokes the same runner daily, honoring the lock and caps; completed-campaign
   continuity can activate only after a new verified lead under a separate gate.
4. **Implemented:** 100D event ingestion is authenticated, idempotent, append-only, and replay-safe so suppression
   updates immediately and the recheck blocks future sends automatically. Feed the durable
   `outbound_suppression_registry` automatically from HubSpot / the production customer DB via
   `apply_100c_suppression(...)` so existing customers, active trials, and unsubscribes/bounces are
   excluded without human review. Until that ingestion exists, the pilot runs with an empty registry
   under the one-contact, founder-confirmed caveat documented in the README.
5. Add per-campaign daily-cap enforcement against `campaign_configs.daily_sync_cap` and a rolling
   deliverability guard (pause sync automatically on a bounce-rate threshold).
6. Daily held-event reconciliation now runs after orchestration and before ramp evaluation. Assignment
   retry automation remains a later enhancement for provider-ambiguous or retryable lead writes.

Until these are separately approved, 100C remains inactive, manual, and single-lead capped.
