# Correction milestone implementation notes

- Split canonical companies from provider observations; Google Place ID now lives only in the source record.
- Removed global domain/phone uniqueness and added conservative match dispositions.
- Rediscovery touches observation time without overwriting canonical facts.
- Added atomic canonical/source persistence, run-owned renewable locks, scoped cursor RPC, fixed function search paths, RLS/revocations, and identity indexes.
- Added five-record/source pilot caps plus candidate, request, page, and duration limits. Capped runs keep their cursor.
- Made diagnostics best-effort with a fallback and original-error preservation.
- Added Places timeout, retry/backoff, structured errors, response validation, quota tracking, and pagination warning contract.
- Removed lifetime Places request state; request accounting is authoritative in each runner and retry usage is returned per search call.
- Added a terminal-only operator dry-run/write command with approved-geography, target, limits, explicit-write confirmation, and structured summaries.
- Resolved database authorization on a dedicated worker JWT role with RLS and execute-only mutation functions; the operator rejects service-role credentials.
- Added an explicit environment allowlist with an unapproved pilot placeholder and unconditional production rejection.
- Centralized every pilot maximum in `APPROVED_PILOT_LIMITS` and fail closed before client factories.
- Split true zero-call `dry-run` from quota-consuming, Supabase-isolated `google-preview`.
- Made operator composition dependency-injected so tests prove client-construction ordering and mode isolation.
- Redacted all operator output to nonsecret identities and credential-presence booleans.
- Made provider-source geography/query nullable while retaining strict non-null Google normalization.
- Versioned deterministic qualification; future AI cannot bypass exclusions by default.
- Added a type-only 100C eligibility contract and recommended verified CSV enrichment for the first outreach pilot.

No live migration, external request, production activation, enrichment, outreach, CRM, email, proposal, pricing, billing, or customer workflow was added.
