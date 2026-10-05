# Independent review assignment — bounded R3-3 estimate linkage

Review the exact committed archive identified by the packet SHA-256 supplied
with this assignment. Treat the archive as read-only. Do not access hosted
Supabase, Vercel, production, credentials, customer data, or external services.

Return exactly `PASS` or `FAIL`, followed by concrete findings ordered by
severity. A pass means no launch-blocking correctness, tenant isolation,
authorization, replay/concurrency, data-loss, pricing-integrity,
truthfulness, accessibility, or essential-workflow defect remains within R3-3.

## Bounded intended outcome

An authorized owner/admin or exact assigned estimator opens the existing
deterministic service-catalog workbench from an opportunity, reviews
low/base/high or a reasoned override, and appends an internal estimate snapshot
linked to the opportunity and optional package. The CRM immediately shows the
selected summary and prior runs remain read-only. This is not a proposal,
contract, acceptance, handoff, invoice, payment, attachment, or AI price.

## Required review

1. Audit migration `20261004000000_r3_3_estimate_scenario_linkage.sql` for
   organization-bound foreign keys, append-only behavior, authorization before
   receipt lookup, exact assigned-estimator checks, explicit refusal of
   unsupported commercial, specialty and NULL-segment estimates until dedicated
   engines exist, exact residential/turnover snapshot-segment mapping,
   engine/version allowlisting, canonical hashes,
   scenario/amount/basis agreement, package locking, exact replay, changed
   replay, stale-token behavior, ID-only events and explicit service-role denial.
2. Audit the API for strict v2 input/output validation, direct imported
   `estimateJob` use, integer minor units, safe 400/404/409/422/503 responses,
   and absence of a second pricing implementation.
3. Audit the server CRM entry route for tenant/context validation rather than
   trusting query IDs. Confirm package/property/opportunity agreement.
4. Audit Board/List parity, prerequisite messaging, customer/property prefill,
   low/base/high and reasoned override selection, truthful internal-estimate
   labeling, error preservation, immediate reconciliation, append-only history,
   keyboard/touch semantics and likely 390px behavior.
5. Explicitly assess the supported-segment boundary: Board, List, server entry
   route, API and database must allow only residential and turnover, must map
   turnover only to `short_term_rental`, and must consistently refuse
   commercial, specialty, NULL and disguised-segment estimates while the only
   allowlisted engine is the residential/turnover v2 model. Do not invent a new
   engine in review.
6. Inspect executable evidence rather than trusting prose: route/workbench/CRM
   tests, the 68-version validator, R3-3 adversarial matrix, definer allowlist,
   and the two-session package-token race.
7. Confirm no proposal bytes, sends, acceptances, handoffs, billing, photos,
   videos, access credentials, or hosted systems are mutated by this increment.

Also verify the command is callable only by the server service role, still
authorizes the supplied real actor inside the database, strips private access
notes, cannot regress later package states, and binds a package pointer to the
exact opportunity/property/package/run tuple.

## Mandatory regression of both prior FAIL verdicts

Do not return `PASS` unless source plus executable evidence closes each item:

1. The real workbench request omits the private `access` field and the route
   still accepts and validates that exact privacy-stripped request instead of
   returning `400`.
2. Commercial, specialty and NULL-segment opportunities cannot be disguised as
   residential or turnover at the page, API or SQL boundary.
3. Opening/reviewing an estimated package cannot demote it to scoping, and
   proposed/accepted/declined packages are read-only and reject new commands.
4. An exact idempotent replay still returns the original result after the
   package later advances; a changed payload with the same key still fails.
5. The displayed selected price, cost and margin are derived from the selected
   low/base/high or override scenario, not always from the base scenario.
6. Access-adjacent fields (`access`, scheduling, scope additions, cover letter,
   company name, operator notes and turnover restock text) are neither retained
   in the immutable snapshot nor accepted by SQL.
7. Fractional-cent overrides fail deterministically at the route boundary; the
   frozen v2 catalog schema is not globally narrowed to accomplish this.
8. Missing service configuration and thrown RPC failures produce bounded generic
   recovery responses, not leaked internals or an unhandled `500`.
9. The executable role matrix directly covers assigned and unassigned
   estimators, viewers, cross-tenant/package binding, private fields,
   specialty/NULL refusal, lifecycle regression, replay-after-lifecycle and
   authenticated direct-table/RPC denial. Do not accept prose-only claims.
10. The server entry page itself enforces the supported segment and package
    lifecycle allowlists; Board affordance hiding alone is insufficient.

## Mandatory regression of the final independent and operator audits

The replacement candidate also must close the findings reported against packet
`99840f2b...4821f`. Do not return `PASS` unless source and executable evidence
show all of the following:

1. The legacy authenticated package command cannot move an `estimated` package
   back to scoping, move a `proposed` package backward, or reopen an `accepted`
   or `declined` package. Existing evidence pointers remain intact.
2. A turnover opportunity opens the turnover estimator and can persist a
   correctly mapped `short_term_rental` / `airbnb_turnover` / `per_turn`
   snapshot; the matrix proves both the valid path and residential mismatch
   refusal.
3. The selected scenario controls every displayed derived figure, including
   person-hours, elapsed crew hours, labor, modeled cost and margin—not only the
   headline price.
4. A thrown pricing-engine or output-validation failure returns a bounded 422
   response before any persistence call.
5. CRM does not present scheduling, restock, scope-addition or operator-note
   fields as editable when those fields are intentionally excluded from the
   immutable R3-3 snapshot.
6. The CRM Save action remains at least 44 CSS pixels high, List actions wrap
   rather than forcing avoidable horizontal overflow, and locked-package copy
   promises only the summary actually available after returning to CRM.

## Mandatory regression of packet `ed786a74...195f8a`

That exact final-audit candidate returned `FAIL`. Do not return `PASS` unless
source plus executable evidence closes every remaining finding:

1. Once a package leaves `scoping`, the legacy authenticated package command
   cannot clear or replace an existing `walkthrough_id` or `proposal_id`,
   including a same-status update and proposed-to-declined movement. The
   selected estimate pointer must remain bound to the same
   organization/opportunity/property/package/run tuple.
2. The role matrix directly proves pointer preservation for estimated and
   proposed packages and directly exercises estimated-to-scoping and
   proposed-to-scoping refusal. It must not treat a fixture/setup constraint
   failure as proof of the intended command refusal.
3. The closed-opportunity test must first prove that the opportunity actually
   reached a lost stage with an applicable active loss reason, and only then
   isolate and assert the estimate-command refusal.
4. Re-run the complete Jest suite from this replacement archive. The archive
   must include every tracked source/fixture needed by that run, specifically
   `instrumentation-client.ts`,
   `quality/service-catalog-remediation/legacy-golden.json`, and
   `quality/location-pricing/operator-results.csv`; do not accept a partial
   suite as reproduction of the implementer's full-suite claim.

Local evidence reported by the implementer will be frozen with the replacement
packet after remediation: full Jest, TypeScript, production build, 68-version
migration validation, and a
fresh disposable PostgreSQL 16 full harness including
`R3_3_ADVERSARIAL_ROLE_MATRIX_PASS` and `R3_3_CONCURRENCY_PASS`.
