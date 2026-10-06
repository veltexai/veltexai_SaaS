# R3-1 production rollback-proof verdict reconciliation

Status: **OPERATOR CHECKLIST — NO EXECUTION AUTHORIZATION**.

Use this checklist only for the exact packet
`/private/tmp/veltex-r3-1-production-rollback-proof-v2-review.zip`, SHA-256
`a78f5242c5f34197c76cc76d0004bf85459eff466e8d11d71f2b43b72f8d6492`.
Any changed byte requires a new packet, hash, review, and decision.

## Accept a review verdict only when

- The reviewer reports the recomputed packet SHA-256 and it matches exactly.
- The reviewer reports the proof SHA-256
  `2b81526cb8bb3db8ec5c5825ec900684ecc5e706a7b4fa38da65b097c152ddc1`
  and size `701235` bytes.
- Both migration hashes match the assignment and the accepted application
  commit is `0d765d7a9ae33c43f95e2721c661b651e7dbf76f`.
- The reviewer independently confirms one outer `BEGIN`, zero `COMMIT`, one
  terminal `ROLLBACK`, and exactly two in-transaction history writes.
- The reviewer accounts for deliberate `P0001`, including explicit session
  rollback or closure after the error so locks cannot remain held.
- The reviewer checks the complete pre-write refusal boundary: project,
  PostgreSQL version, migration history, catalog, effective privileges,
  protected content and data invariants.
- The reviewer checks postconditions for 66 history rows, all expected CRM RLS
  tables, authenticated direct-DML denial and anonymous-routine denial.
- The reviewer reproduces deterministic generation and changed-capture refusal
  without editing the reviewed packet.
- The verdict begins with `PASS`, or begins with `FAIL` and gives the smallest
  exact remediation. Ambiguous, partial or assumption-only conclusions do not
  advance the gate.

## Reconciliation decision

- `PASS` from one external lane plus the existing independent local exact-byte
  audit permits requesting separate authorization for rollback-only production
  execution; it does not itself authorize execution.
- Conflicting external verdicts stop the execution gate. Reproduce the disputed
  claim locally and either remediate/repacket/re-review or document why a
  nonblocking observation is outside the frozen proof contract.
- Any persistence path, missing drift check, wrong hash, source mismatch,
  insufficient lock cleanup, customer-row disclosure or hosted action is a
  blocking `FAIL`.
- Low findings may be deferred only when they do not weaken non-commit behavior,
  target binding, evidence integrity, drift refusal, lock cleanup or privacy.

## Next gate after a reconciled PASS

1. Re-read the Production project identity immediately before execution.
2. Recompute the proof SHA-256 from the local file and compare it to this
   checklist and the accepted reviews.
3. Obtain the separate action-specific authorization for the rollback-only
   production proof.
4. Run the exact proof once in a dedicated session; never concatenate, edit or
   append it in the SQL editor.
5. Capture the complete hashes-only `P0001` evidence, explicitly close or roll
   back the aborted session, and run a separate read-only cleanup query proving
   history remains 64 and both planned versions remain absent.
6. Independently reconcile postflight evidence before generating any
   commit-capable artifact.

Production database migration, application deployment, environment-variable
changes and CRM enablement remain separate gates.
