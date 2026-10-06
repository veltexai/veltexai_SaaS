# R3-1 production rollback-proof independent review

Status: **READ-ONLY REVIEW REQUEST — NOT PRODUCTION AUTHORIZATION**.

Review the exact packet bytes adversarially. Do not access any hosted system,
run SQL against Supabase, deploy, change environment variables, or send any
message. The SQL candidate must remain incapable of commit.

## Exact bindings

- Target identity: production project `iwoaaljitifloolszxlu`.
- Fresh hashes-only capture SHA-256:
  `d22b04c72c863cde6b2eaa04a61f0f322df11493968f4478afdacf5d7a97aa11`.
- Accepted R3-1 application commit:
  `0d765d7a9ae33c43f95e2721c661b651e7dbf76f`.
- Migration `20261001000000` SHA-256:
  `526b56f0bd32c542f77b89e61df79eed18304e7cccd4b06d5c458fa3273ea795`.
- Migration `20261002000000` SHA-256:
  `85fac17469510408ab777a04101c585850fd5774874e0fb01c663c8fddd3cf18`.
- Non-committing proof SHA-256:
  `2b81526cb8bb3db8ec5c5825ec900684ecc5e706a7b4fa38da65b097c152ddc1`.
- Proof size: `701235` bytes.

## Required review

1. Recompute every listed SHA-256 and refuse any mismatch.
2. Confirm the capture is hashes-only, project/environment bound, read-only,
   PostgreSQL 17.6, history 64, catalog count 2,527 and effective-privilege
   count 1,323.
3. Confirm the generator embeds only the two exact accepted migration bodies,
   refuses any capture/source/history/catalog/privilege/content/invariant drift,
   and inserts exactly two temporary history rows inside the proof transaction.
4. Confirm the SQL has exactly one outer `BEGIN`, no `COMMIT`, one terminal
   `ROLLBACK`, and deliberately raises `P0001` only after emitting hashes-only
   postcondition evidence.
5. Review lock scope, timeouts, transaction behavior, provider compatibility,
   RLS/direct-DML/anonymous-routine postconditions and every path that could
   accidentally persist state.
6. Verify the test independently proves deterministic generation and refusal
   when capture bytes change.
7. Return `PASS` only if the exact proof is safe for a separately authorized
   rollback-only production execution. Otherwise return `FAIL` with severity,
   exact evidence and the smallest required remediation.

This review does not authorize rollback-proof execution, database migration,
application deployment, environment-variable changes or CRM enablement.
