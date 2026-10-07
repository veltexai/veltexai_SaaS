# R3-4.1 Proposal-History Metadata Remediation Review

Review the exact Git tip and packet hashes supplied with this assignment. This
is a bounded independent review of the forward-only migration that exposes
already-persisted v2 package-set metadata through the authenticated proposal
history reader.

## Required checks

1. Confirm the migration changes only
   `public.read_crm_proposal_versions(uuid,uuid)` and does not mutate proposal,
   estimate, package, customer or production data.
2. Confirm `package_count` and `package_set_sha256` are returned from the
   persisted immutable parent row without browser-supplied pricing or counts.
3. Compare the replacement reader against the accepted R3-4 reader and verify
   that tenant filters, deleted-opportunity exclusion, estimator assignment,
   ordering, SECURITY DEFINER search path and authenticated-only execution are
   preserved exactly.
4. Confirm v1 rows remain compatible through nullable metadata and v2 history
   can render the stored package count.
5. Reproduce the migration-foundation and disposable PostgreSQL evidence when
   practical. Inspect the regression assertions for gaps or false positives.
6. Report findings by Critical, High, Medium, Low and informational severity.
   A clean result must explicitly say PASS and state whether any Critical,
   High or Medium finding remains.

## Excluded actions

Do not apply SQL to a hosted database, move a branch, deploy, rotate a
credential, contact production or send a customer-facing message. Review only.
