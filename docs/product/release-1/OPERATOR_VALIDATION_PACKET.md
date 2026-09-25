# Release 1 operator validation packet

Status: **PENDING EXTERNAL OPERATOR INPUT**

Candidate: `codex/r0-privilege-hardening` at the release-candidate commit recorded in `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`.

## Purpose

Validate that Release 1 residential and vacation-rental planning defaults are useful starting points for real cleaning operators. Veltex AI presents suggested prices, not guaranteed or universally correct bids. Operators must enter their actual wages, burden, overhead, travel, supplies, equipment and target margin before comparing results.

## Required panel

- 3–5 experienced residential cleaning operators.
- 2–3 experienced vacation-rental/turnover operators.
- Each operator evaluates one low-, normal- and high-complexity real job they have actually priced or completed.
- No customer names, addresses, access codes or other identifying information belong in the evidence.

## Reference outputs from the verified synthetic 1,500-square-foot example

These are planning examples, not acceptance targets.

| Job type | Low | Base | High | Base person-hours |
|---|---:|---:|---:|---:|
| Recurring standard home cleaning | $210 | $245 | $280 | 3.87 |
| One-time standard home cleaning | $210 | $245 | $285 | 3.91 |
| First visit / deep clean | $260 | $310 | $360 | 5.22 |
| Move-in / move-out | $250 | $300 | $345 | 4.99 |
| Vacation-rental turnover | $235 | $280 | $320 | 4.58 |

## Acceptance method

For every operator/job pair, record:

1. Segment and job type.
2. Low, normal or high complexity.
3. Actual operator price and actual person-hours.
4. Veltex suggested price and modeled person-hours after the operator's real business-cost profile is entered.
5. Price deviation: `(Veltex suggested price - actual operator price) / actual operator price`.
6. Whether scope, exclusions, add-ons and customer responsibilities are usable.
7. Any unsafe underestimate, missing inclusion, unrealistic laundry assumption or bed/bath sensitivity concern.

Release 1 passes only when:

- median absolute price deviation is no more than 15%;
- no evaluated job has an unsafe underestimate that the workbench fails to make visible;
- no operator identifies a critical missing standard inclusion/exclusion;
- turnover operators confirm that laundry inputs represent hands-on labor rather than machine elapsed time;
- founder reviews the evidence and explicitly accepts or rejects the release.

Any failure returns to pricing/catalog remediation. Do not average away a safety or scope defect.

## Evidence template

Use `quality/operator-validation-release1/operator-results.csv`. One row per real job; do not overwrite prior attempts. Record rejected assumptions and corrective decisions in the operating ledger.

