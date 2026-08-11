# 100C outreach-readiness contract

A 100A company record is discovery intelligence, not permission or sufficient data for outreach. `OutreachEligibilityCandidate` in `src/types.ts` requires:

- canonical prospect id;
- approved contact id and valid, verified email;
- human outreach approval;
- no suppression;
- confirmed non-customer status;
- no prior submission;
- campaign assignment; and
- stable idempotency key.

100C should own additive tables for contacts, outreach eligibility, suppression, campaign assignment, submission attempts, Instantly identity mapping, Instantly events, idempotency, and reconciliation. None belongs on the canonical prospect table.

Minimum operational sequence:

```text
100A discovery -> Prospect Intelligence Database -> contact/email enrichment
-> email verification -> human approval + suppression/customer checks
-> 100C dry run -> controlled submission
```

For the first pilot, use a small verified CSV supplied and manually approved by an accountable operator as the enrichment prerequisite. This is more bounded and auditable than introducing a live enrichment provider. After the pilot, the first limited 100D/Apollo design may automate enrichment behind its own disabled-by-default controls. Neither is implemented here.
