# 100B — Contact Enrichment

100B is the smallest reliable bridge from a discovered **100A company** to an **outreach-ready
contact**, ahead of a future 100C Instantly sync. It enriches a company with decision-maker
candidates, normalizes and deduplicates them, and makes a **deterministic, auditable
outreach-readiness decision**. It sends nothing.

```
100A company → provider enrichment → normalized contact → identity/dedup
             → suppression + verification checks → automated eligibility decision → (future) 100C
```

## Status and safety
- Inactive by default (`VELTEX_100B_ENABLED` must equal `true`); manual execution only.
- No route, webhook, cron, schedule, browser, or autonomous execution.
- Never fabricates an email; never treats an unverified email as outreach-ready.
- Does not import or call Instantly, email, HubSpot, or Data Axle. No Instantly lead is created.
- Provider-neutral: **Apollo** is the first adapter boundary (a **two-stage** search→enrichment
  process, see below and `docs/APOLLO.md`); a **fixture/mock** provider backs previews and tests.
  Data Axle / CSV / referral providers can be added without touching the runner.
- Reuses 100A patterns: run-owned lock, request budgeting, resilient diagnostics, cursor/state,
  environment allowlist, operator preflight-before-factories, in-memory testing, controlled-write,
  credential isolation, RLS + `SECURITY DEFINER` mutation functions, fixture + static-boundary tests.
- **Does not modify or weaken 100A.** The migration only *adds* a dedicated read-only worker role
  and a read policy on `internal_prospects`.

## Automated eligibility (no mandatory human queue)
A contact becomes `ready_for_outreach` only when the parent company is an eligible, non-customer,
non-suppressed cleaning company **and** the contact has a syntactically valid email confirmed by an
approved provider with a verification status on the allowlist, is not unsubscribed/bounced/blocked,
is not already active in or already sent the campaign, and has no identity conflict. Everything else
fails closed into an explicit state with a preserved reason:
`needs_enrichment · unverified · identity_conflict · suppressed · already_contacted · customer · ineligible · provider_error`.

Decision-maker priority (strongest first): owner → founder/co-founder → president → chief executive →
general manager → operations → sales/BD → estimator → office manager. Generic mailboxes
(`info@`, `office@`, `admin@`, …) are stored but classified separately and never preferred over a
verified decision-maker.

## Apollo is a two-stage, capped, credit-aware boundary
Apollo's **People Search** (`POST /api/v1/mixed_people/api_search`) is domain-constrained and returns
**no email or phone** — only person identifiers + demographics. A separate **People Enrichment**
(`POST /api/v1/people/match`) call resolves a **work email** for a small, ranked subset and may
consume ~1 Apollo credit per returned email. The adapter therefore: searches by company domain
(failing closed with no domain), ranks decision-makers locally, then enriches at most three of them —
requesting **work email only** with `reveal_personal_emails`, `reveal_phone_number`,
`run_waterfall_email`, and `run_waterfall_phone` all explicitly `false` and **no webhook**. A search
result alone is never outreach-ready. All caps live in `src/apollo-config.ts`. Full detail:
`docs/APOLLO.md`.

## Operator modes (all external modes inactive by default)
- `dry-run` — validates config + plan; constructs no external client, makes no call, writes nothing.
- `fixture-preview` — **synthetic** fixtures (`operator/enrichment-fixtures.json`, reserved
  `example.com` domains) + in-memory storage; zero external calls.
- `provider-preview` — live Apollo **search + enrichment** reads against **approved real 100A
  targets** (`operator/provider-preview-targets.json`, real company domains), ≤2 companies,
  1 search + ≤3 enrichments per company, + in-memory storage; **no Supabase client and no write**.
  Unknown prospect IDs fail closed before any Apollo client is constructed. Output is redacted
  (no email/phone/name). The two input files are never interchangeable — the target loader rejects
  reserved `example.com` domains.
- `controlled-write` — capped pilot writes into the approved isolated environment only.

See `docs/PILOT_RUNBOOK.md`, `docs/APOLLO.md`, `docs/DATABASE_SECURITY.md`, and `docs/100C_HANDOFF.md`.
Migration: `database/002_contact_enrichment.sql` (applied to the isolated pilot project; depends on 100A `001`).
