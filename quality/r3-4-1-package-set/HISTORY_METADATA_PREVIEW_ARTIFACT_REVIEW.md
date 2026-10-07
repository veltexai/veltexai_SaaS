# R3-4.1 History-Metadata Preview Artifact Review

Perform a bounded, read-only independent review of the exact guarded SQL
artifact for isolated Supabase Preview project `ynzkwctwlssjcsjmahey`.
Production is excluded.

## Required checks

1. Recompute every SHA-256 in `PACKET_MANIFEST.txt` and verify the Git bundle
   records complete history at the stated tip.
2. Confirm the guarded SQL contains exactly one outer transaction, one advisory
   transaction lock and one migration-history insert for version
   `20261007010000`.
3. Confirm preflight requires the exact 71-version predecessor, refuses missing
   or extra history, refuses a missing or already-replaced reader, and verifies
   the accepted authenticated-only privilege boundary.
4. Confirm only the reviewed migration body executes and its source SHA-256 is
   pinned to `2016dfa7101b3d5e377f046eb292d804188837aa647d5d5bcff09b9dd5d737e8`.
5. Confirm postflight requires history count 72, exactly one new history row,
   both persisted metadata columns, `SECURITY DEFINER`, the pinned search path,
   and authenticated-only execute.
6. Confirm the success row is emitted before the only commit and every failure
   aborts the transaction.
7. Confirm the target is isolated Preview only and no production, deployment,
   credential, unrelated schema, or application mutation is authorized.

Report Critical, High, Medium, Low and informational findings, then explicitly
state `PASS` or `FAIL`. Do not access hosted systems or modify files, branches,
credentials, Preview, Vercel or production.
