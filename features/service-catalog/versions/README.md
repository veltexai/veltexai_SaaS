# Version retention contract

`v1` retains catalog 2026-09-22.1 schema, catalog definitions and exact pricing strategy. Its only validation correction is allowing empty internal access notes. `v2` registers 2026-09-22.2, retains v1 dispatch and adds version-neutral presentation/privacy fields through its compatibility envelope. Pricing projects v1 jobs to the retained v1 input schema before executing the retained strategy.

Do not change published pricing/schema/definitions in place. A subsequent release must copy its new implementation into a new directory and dispatch existing version IDs to these retained modules. Never make an older ID resolve to the newest implementation. Add the new ID to the database registry; don't update an existing proposal's ID. To adopt a new price model, create a new proposal.

Status-only saves return the persisted content, price and snapshots unchanged. Unchanged inputs cannot authorize a forged client quote. Explicit job/client/design changes are recomposed using the job's version, with shared customer-output privacy corrections. Those safety/copy corrections are intentionally shared; original customer document bytes remain stored on status-only updates. Customer prose changes live inside the job snapshot, not in untrusted generated pricing blocks.

Regression evidence: `remediation.test.ts` (v1 after v2 registration), `design-and-pricing.test.ts` (actual status-only PUT), five customer-copy snapshots. Do not confuse these with database execution evidence.
