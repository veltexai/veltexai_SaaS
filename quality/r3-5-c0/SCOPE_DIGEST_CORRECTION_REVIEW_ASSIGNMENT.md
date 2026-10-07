# R3-4.1 scope-digest forward correction — independent review

Review the exact local candidate read-only. Do not access or change hosted
Preview, production, credentials, customer data, or external systems.

## Exact history

- accepted C0.0 predecessor: `a5d7d47`
- C0.1 final review tip: `9ee0f3321613273800ad4f432e566314085ee3fb`
- C0.1 final verdict ledger: `cbbedaf`
- scope-digest correction implementation: `80e300b`

Verify every named commit is present in the complete-history bundle and is an
ancestor of the packet tip recorded by the manifest.

## Required review

1. Confirm the new migration is forward-only and does not rewrite immutable
   `crm_proposal_version_packages` history.
2. Confirm the `BEFORE INSERT` trigger derives `scope_sha256` solely from the
   inserted row's immutable `customer_visible_scope`.
3. Confirm the `NOT VALID` check is enforced for every future insert while
   intentionally tolerating already-existing R3-4.1 rows.
4. Confirm client and service roles cannot execute the trigger function
   directly and no new table privileges are granted.
5. Confirm C0.1 continues deriving the acceptance association digest from
   `customer_visible_scope`, so legacy repeated `scope_sha256` metadata cannot
   weaken acceptance checks.
6. Review the dedicated harness proof: real publisher-path rows must satisfy
   the derived digest, while a rollback-only test temporarily recreates one
   pre-correction row and proves C0.1 accepts its valid association chain.
7. Check exact migration count, definer allowlist impact, diff hygiene, failure
   history, and truthfulness of the ledger evidence.

Return exactly one verdict: `PASS`, `PASS WITH NON-BLOCKING NOTES`, or `FAIL`.
For every blocker, give severity, exact file/line evidence, impact, and the
smallest safe remediation. This review does not authorize Preview or production.
