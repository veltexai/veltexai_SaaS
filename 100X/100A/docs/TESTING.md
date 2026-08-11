# Testing and validation

```bash
pnpm exec jest 100X/100A/tests --runInBand
pnpm exec tsc --noEmit --pretty false
git diff --check -- 100X REVIEW_SUMMARY.md
```

Fixtures cover all six accepted categories, exclusions, ambiguity, franchises, shared domain, and shared phone. Tests cover canonical/source separation, nullable provider provenance with strict Google provenance, provider idempotency, identity dispositions, caps across queries/pages/repeats/races, diagnostics failures, lock ownership/renewal/cleanup, duration/cursor policy, Places retry/request accounting and reusable clients, Supabase mappings, worker-role SQL authorization, environment/geography allowlists, unconditional production rejection, every pilot limit, zero-call dry-run, Google-preview isolation, preflight factory ordering, secret redaction, inactive/manual-only controls, and prohibited integrations.

These are unit/static validations only. No claim of live Places, Supabase, or outreach integration is made.
