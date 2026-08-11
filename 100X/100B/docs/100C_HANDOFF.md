# 100B → 100C handoff contract

100C (Instantly Campaign Sync) is **not** implemented and not authorized here. 100B produces the clean,
provider-neutral contract 100C will consume. Only contacts 100B marked `ready_for_outreach` are eligible.

`OutreachReadyContact` (in `src/types.ts`) is the sole shape 100C should accept:

- `canonicalContactId`, `canonicalProspectId`
- `validEmail`, `emailVerificationStatus: "verified"`, `outreachEligibility: "ready_for_outreach"`
- `suppressed: false`, `existingCustomer: false`, `previouslyContacted: false`
- `provider`, `providerRecordId`, and a stable `idempotencyKey`

## 100C obligations (future, separately gated)
- Re-check suppression, customer status, and campaign membership **at send time** — eligibility is a
  point-in-time decision; 100C must not send on a stale `ready_for_outreach`.
- Enforce its own send caps and per-campaign idempotency (a contact must never receive the same
  campaign twice). Discovery/enrichment/send are three independent volume limits.
- Own its additive tables (campaign assignment, submission attempts, Instantly identity mapping,
  Instantly events, reconciliation). None belongs on the 100B contact table.
- Remain disabled and dry-run-first, and never run without an approved verified-contact path.

## Provenance note (Apollo two-stage)
When the provider is Apollo, a `ready_for_outreach` contact's email came from Apollo **People
Enrichment** (`people/match`) with a `verified` status — never from People Search, which returns no
email. The email is a **work** email only (personal-email and phone reveal are disabled upstream), so
100C must not expect or forward personal emails or phone numbers from 100B. Eligibility remains
point-in-time regardless of provider.

A `ready_for_outreach` contact from 100B is **permission to consider**, not permission to send.
