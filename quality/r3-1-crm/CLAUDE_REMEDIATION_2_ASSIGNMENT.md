# Claude assignment — R3-1 second remediation design audit

Perform a read-only design and adversarial audit against exact repository commit
`deda877`. Do not edit files and do not access or mutate Supabase, Vercel,
production, credentials, billing, campaigns, or any other hosted system.

Focus only on the remaining database and command-layer blockers from your
`b312b78d…50743` re-review:

1. Propose the smallest safe SQL changes that authenticate before replay reads
   and eliminate the direct-opportunity cross-tenant key oracle.
2. Specify exact post-trigger `updated_at` return semantics for opportunity,
   customer, contact and property commands.
3. Define payload-complete replay contracts for duplicate-reviewed lead creation,
   conversion and reactivation. Include the required receipt columns or canonical
   payload hashes and safe migration treatment for existing receipts.
4. Define a legal transition matrix that permits same-category stage movement,
   preserves terminal/reactivation rules and gives Nurture a future revisit gate.
5. Close package/property and walkthrough/site-contact estimator-scope gaps and
   keep customer acceptance outside R3-1.
6. Review membership-removal behavior and recommend a bounded solution that does
   not weaken organization isolation or silently erase audit ownership.
7. Convert your 21 rollback-only probes into exact committed regression cases,
   adding any missing concurrency or unrelated-definer bypass probes.

Return a severity-ranked implementation contract with exact current file/function
references, SQL pseudocode where useful, and a mutation-test matrix. Explicitly
identify any recommendation that changes the frozen product contract. Stop after
the report; do not implement or send external messages.
