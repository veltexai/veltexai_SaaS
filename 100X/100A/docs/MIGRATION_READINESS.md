# 100A pilot migration — APPLIED (2026-08-08)

## Result (nonsecret)
```
Migration approval: 100A-PILOT-MIGRATION-APPROVED-2026-08-08
Target: wzpgbbwdqtpyfiojowdj.supabase.co  (org "Veltex AI 100A Pilot", Free, us-west-2)
Migration: 100X/100A/database/001_prospect_intelligence_foundation.sql
  sha256: c5726f07ed97dbf2c80df360b931aa8b04aaed0235041c1aecc9dad21e54c1c6 (byte-identical to reviewed/tested)
Result: applied successfully (single execution; "Success. No rows returned")
Prospect records after migration: 0
Source records after migration: 0
Diagnostic records after migration: 0
Workflow state: 100A / cursor 0 / unlocked
Google calls: 0
Pilot writes: 0
Supabase Security Advisor: 0 errors, 0 warnings, 0 info
```

## Verified in the pilot project (read-only catalog checks)
- Tables (4): internal_prospects, prospect_source_records, acquisition_workflow_state, acquisition_diagnostics — RLS enabled on all four.
- Indexes (12) incl. unique `(provider, provider_record_id)`; domain and phone indexes are non-unique; FK source→prospect present.
- Provider-neutral canonical (no provider column); source geography/query nullable.
- Worker role `veltex_100a_worker`: NOLOGIN, NOINHERIT, NOBYPASSRLS; member of `authenticator`.
- Worker grants: SELECT prospects/sources/workflow, INSERT diagnostics, diagnostics sequence USAGE, EXECUTE on the 6 functions. No direct INSERT/UPDATE/DELETE on prospects/sources/workflow; no SELECT on diagnostics.
- anon/authenticated: no SELECT on prospects and no EXECUTE on persist.
- Policies (4), all to `veltex_100a_worker` only: prospects read, sources read, workflow-state read (=100A), diagnostics insert (=100A). None to public/anon/authenticated.
- Functions (6): acquire/renew/release/set_cursor/touch/persist — all SECURITY DEFINER, fixed `search_path = pg_catalog, public`, owner postgres. (Google-only persistence and run-owned-lock gating are byte-identical to the version validated by 59/59 ephemeral-Postgres assertions.)

## Next authorized step (NOT performed here)
Issue a short-lived `veltex_100a_worker` JWT, configure a restricted Google Places key + quota/billing alerts, then run the true dry run → Google preview → supervised five-record write. No credentials, Google calls, or prospect writes occurred in this task.
