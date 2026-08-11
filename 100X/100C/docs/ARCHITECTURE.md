# 100C architecture

100C is a provider-neutral outbound-sync subsystem in the ports-and-adapters style used by 100A/100B.
Business logic (recheck, campaign safety, idempotency, caps, reconciliation) lives in the runner and
pure modules; the Instantly specifics live only in the adapter.

## Data flow
```
loadCandidates (100B ready contacts, ≤5)          [SyncRepository]
  → recheckSyncEligibility (fresh, fail-closed)   [eligibility-recheck.ts]
  → selectApprovedCampaign + assertCampaignStateSafe (Draft/Paused only)  [campaign-allowlist.ts]
  → getCampaignState (live read BEFORE any write)  [OutboundSyncProvider]
  → reserveAssignment (unique contact/campaign)    [SyncRepository, SECURITY DEFINER]
  → createLead (capped, explicit skip flags)       [OutboundSyncProvider]
      submitted → recordLeadMapping + transition('submitted')
      skipped   → transition('skipped_duplicate')
      ambiguous → reconcileLead (read-only) → submitted OR reconciliation_required
  → redacted diagnostics + summary                 [DiagnosticSink]
```

## Modules
- `src/types.ts` — the provider-neutral contract: `SyncCandidate`, `OutboundLead`, `OutboundSyncProvider`,
  `SyncRepository`, submission/campaign states, accounting, and the future `OutboundEventReceipt`.
- `src/config.ts` — centralized pilot limits, config loader, `assertSafeToRun` (disabled by default).
- `src/campaign-allowlist.ts` — `selectApprovedCampaign`, `assertCampaignStateSafe`, workspace check.
- `src/eligibility-recheck.ts` — deterministic, fail-closed recheck (fixed precedence).
- `src/instantly-config.ts` — V2 endpoints, numeric-status map, pilot lead flags, planned scopes.
- `src/instantly-provider.ts` — Instantly V2 adapter (Bearer, retries/Retry-After, accounting,
  structured errors, redaction, ambiguity handling).
- `src/fixture-provider.ts` — offline mock adapter (scriptable state/create/reconcile).
- `src/in-memory-repository.ts` / `src/supabase-adapters.ts` — the sync store (offline / PostgREST).
- `src/run.ts` — the orchestrating runner (`run100C`).
- `operator/*` — terminal operator: `command.ts` (parse + preflight gates), `runtime.ts`
  (mode dispatch + redacted output), `campaigns.ts` (allowlist binding), `entry.ts`, `cli.mjs`.

## Provider neutrality
`OutboundSyncProvider` exposes only `getCampaignState`, `createLead`, `reconcileLead`, and
`getAccounting`. A second outbound provider (or a CSV/manual sink) can be added without touching the
runner. The runner never sees an Instantly-specific response object.

## Isolation from 100A/100B
100C reads 100B contacts and 100A companies through additive read policies and never mutates them.
Instantly campaign/submission state is stored in 100C-owned tables only — never in `prospect_contacts`.
