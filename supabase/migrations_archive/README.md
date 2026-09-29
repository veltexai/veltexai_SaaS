# Superseded migration artifacts

Files in this directory are retained as historical evidence and are **not** part
of the executable Supabase migration chain.

## Duplicate version `034`

The repository previously contained two executable migrations with version
`034`:

- `034_fix_trial_display_after_proposals_exhausted.sql`
- `034_free_trial_no_credit_card.sql`

The later `034_free_trial_no_credit_card.sql` is the canonical version in
`supabase/migrations/`. It added the no-card `free_trial` lifecycle and replaced
the usage functions changed by the earlier artifact. Later migrations `040` and
`20260908000000` further supersede the affected trial/template behavior.

The older file is preserved here rather than deleted so its provenance and
failed historical path remain inspectable. Its SHA-256 at archival time is:

`874732f2e5a8cdd5b3e0c3e482c91330cbf60da523e2a0b3f64d2e1fa35b3f09`

Do not record the archived file as a second `034` migration and do not replay it
after the canonical `034`. Fresh databases must execute exactly one version
`034`: `supabase/migrations/034_free_trial_no_credit_card.sql`.
