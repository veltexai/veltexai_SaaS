# 100A backlog (non-blocking)

Independent verification (2026-08-07) confirmed no P0/P1 and no pilot-blocking defect. The following
P3 items must be corrected **before unattended or national-scale operation**; they do not block the
supervised five-record pilot. Do not expand into a redesign.

## P3-1 — Production name/location identity uses `ilike`
`src/supabase-adapters.ts` (`inspectIdentity`) matches `observed_company_name`, `city`, and `state`
with `.ilike(...)`. `%` and `_` in a value are treated as SQL LIKE wildcards, so a name/city containing
those characters can over-match the name+location signal. Contained for the pilot (domain/phone use
exact `eq`; over-matches fall to human-gated `identity_review`, and a false confident match needs two
corroborating signals). Fix: escape LIKE metacharacters, or match on a normalized lowercased column
with `eq`. Do not change production identity behavior during pilot-approval work.

## P3-2 — In-memory identity does not reproduce production `ilike` semantics
`src/in-memory-repository.ts` matches name/location with exact lowercased equality, while the Supabase
adapter uses `ilike` (P3-1). Unit tests and `google-preview` therefore do not exercise the exact
production matching semantics. Align once P3-1 is resolved so tests cover the production path.

## P3-3 — Migration assumes Supabase-provided objects; cannot detect incompatible prior schema
`database/001_prospect_intelligence_foundation.sql` assumes the Supabase `extensions` schema + `pgcrypto`
and the `anon`/`authenticated`/`authenticator` roles pre-exist, and uses `create table if not exists`,
which silently skips a pre-existing table even if its columns differ (no drift detection). Mitigated
procedurally by PILOT_RUNBOOK step 4 (confirm no incompatible earlier schema; stop otherwise). Fix:
document the Supabase role/extension prerequisites in the runbook and add an optional preflight that
fails loudly if an incompatible `internal_prospects`/`prospect_source_records` already exists.
