# R3-4.1 Hosted Cardinality Remediation Review

Review the exact packet tip and report `PASS` or `FAIL` with severity-ranked
findings. This is a bounded review of the hosted defect discovered during
authenticated Preview acceptance; it is not a review waiver and it does not
authorize a hosted mutation.

## Defect to reproduce from the accepted predecessor

`read_crm_estimate_summaries(uuid)` at accepted R3-3/R3-4.1 state selects
`distinct on(e.opportunity_id)`. Two estimated work packages attached to one
opportunity therefore collapse to one board summary. R3-4.1 sees one package
and truthfully falls back to the v1 dialog instead of presenting the v2 package
set. No proposal version was published during the failed acceptance attempt.

## Exact remediation contract

- append one migration; never rewrite an accepted migration;
- preserve the routine's return signature, caller-scoped authorization,
  `security definer` posture, grants and revokes;
- return only the newest estimate for every `(opportunity_id,
  work_package_id)` pair;
- retain the newest unbound (`work_package_id is null`) opportunity estimate
  so the accepted v1 workflow remains available;
- preserve deterministic ordering and tenant/estimator scoping; and
- add a regression gate that rejects opportunity-only cardinality.

## Required verification

```sh
npm run migrations:validate
npm run r3-4-1:test-migration-foundation
npm run r3-4-1:test-postgres-foundation
npm test -- --runInBand
npm run build
```

The PostgreSQL harness needs normal local shared-memory permission. The build
needs the repository's existing local environment variables and network access
for configured Google Fonts. Do not expose credentials in review output.

## Verdict questions

1. Does the new query return one newest unbound estimate plus one newest
   estimate per distinct package, without returning superseded estimates?
2. Does it preserve all accepted authorization, tenant and estimator bounds?
3. Is the change append-only and safe for a Preview database already at the
   70-migration R3-4.1 state?
4. Can the two-package Board/List flow now receive both estimate summaries
   without changing the v1 fallback contract?
5. Are any High or Medium correctness, security, privacy, concurrency,
   accessibility or compatibility findings present?

Production is excluded. Hosted Preview apply and branch movement remain
separate gated actions after independent review.
