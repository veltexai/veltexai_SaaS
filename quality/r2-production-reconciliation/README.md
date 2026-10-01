# R2 production reconciliation — G3

This directory builds the production-specific migration plan required by G3.
It is deliberately split into discovery, planning and execution so that a
29-row migration history can never be mistaken for proof that later schema
effects are absent.

## Safety contract

- Production is `iwoaaljitifloolszxlu` and every other project ref is refused.
- The committed discovery query is read-only.
- No customer content, email address, tracking token or credential is selected.
- The plan builder refuses an incomplete or unreviewed fingerprint.
- Generated SQL is written only below `/private/tmp` and is **unarmed**. It
  begins with an unconditional exception and cannot mutate any database.
- A separate arming step is intentionally not implemented. It may be added
  only after G2 backup evidence, exact-artifact independent review, G4 founder
  acceptance and action-specific production authorization.

## Workflow

1. Run `00-read-only-production-fingerprint.sql` in the production SQL editor.
2. Save only its redacted result into a copy of
   `production-fingerprint.template.json`; never save row content.
3. Independently review the fingerprint and set `review.status` to `PASS` with
   reviewer and timestamp.
4. Build the unarmed plan:

   ```sh
   node quality/r2-production-reconciliation/build-production-plan.mjs \
     /private/tmp/veltex-r2-production-plan \
     /path/to/reviewed-fingerprint.json
   ```

5. Validate it:

   ```sh
   node quality/r2-production-reconciliation/validate-production-plan.mjs \
     /private/tmp/veltex-r2-production-plan
   ```

The plan classifies each prerequisite as `verify-recorded`,
`reconcile-history`, or `apply`. `partial` is always a hard refusal. All source
files are SHA-256 pinned and every step carries executable preconditions and
postconditions. R2 migrations are never eligible for history-only
reconciliation: they must be absent and then applied in source order.

