# 100S — Veltex AI Supervised Social Growth Engine

100S is the inactive-by-default foundation for a US-first social campaign that turns verified research into platform-native drafts, Reels/Shorts scripts, tracked website visits, trials, and subscribers.

## Safety boundary

- No platform credentials, browser automation, cron jobs, or live publishing.
- Every item begins as `draft`, must move through `needs_review`, and requires a clean policy audit before `approved` or `scheduled`.
- The SQL migration is additive, unapplied, uses RLS, least-privilege read roles, an approval function, and an audit log.
- Publishing adapters must use official platform APIs or native schedulers and are a later, separately approved integration.
- Comment classification is implemented, but ingestion and posting are not. Complaints and legal-risk items receive no AI draft; every other reply still requires human approval.

## What is implemented

- A US campaign brief and verified-research contract
- Six original Reel series separated from their Facebook, Instagram, LinkedIn, and YouTube placements
- 15–60 second scripts with hooks, scenes, captions, product demonstrations, thumbnails, safe-area and licensing notes
- First-/last-touch UTM attribution through signup and Stripe purchase events
- Full-surface claims auditing, destination allowlisting, content hashes, positive claim IDs, and enforced approval transitions
- Conservative weekly platform cadence caps
- Separate creative, traffic, and monthly revenue-cohort learning with minimum sample sizes
- Additive schemas for evidence, creative units, placements, accounts, approval history, engagement, metrics, decisions, attribution, and optional estimate capture
- A privacy/consent checklist and a transactional-only, disabled-by-default calculator estimate email flow

## Initial publishing cadence

| Platform | Weekly cap | Primary format |
| --- | ---: | --- |
| Facebook | 5 | Reel plus selected calculator links |
| Instagram | 5 | Reels plus supporting carousels/Stories |
| LinkedIn | 3 | native video or document carousel |
| YouTube | 3 | Shorts |

Cadence is a starting experiment. Analytics should tune topics, hooks, formats, and posting windows; it should not automatically increase volume.

## Verification

```sh
pnpm test:100s
pnpm 100s:operator -- --mode=dry-run
```

## Activation sequence

1. Review and apply `database/100s_001_social_growth_engine.sql`, then app migrations 037 and optional 038, in the intended environment. Migration 038 and `CALCULATOR_EMAIL_CAPTURE_ENABLED` remain optional and off by default.
2. Fill the inactive account inventory after verifying ownership, analytics access, and least privilege.
3. Film three original units and follow `docs/PILOT_RUNBOOK.md`; publish the first week manually.
4. Record platform metrics and provider IDs, then evaluate the preregistered day-seven rule.
5. After the funnel measures reliably, add read-only official provider adapters and reconciliation.
6. Add write-mode scheduling and comment ingestion only as later, separately approved work.

Before activation, complete `docs/PRIVACY_AND_CONSENT_CHECKLIST.md`. Configure `ATTRIBUTION_HASH_SALT`, the official social profile URL environment variables, and—only when enabled—GA4 Measurement Protocol and Meta Conversions API secrets in the deployment secret manager. Never commit those values.

## First campaign

`US Bid Smarter` should send commercial cleaning owners to the free bid calculator, then retarget engaged visitors toward the demo proposal and seven-day trial. The first creative series should explain labor burden, overhead, supplies, frequency, scope clarity, and target margin using real product screens and founder-led vertical video.
