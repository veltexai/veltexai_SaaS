# Sender expansion activation checklist

Use this checklist for every new dedicated sending-domain cohort. It prepares activation but does
not authorize a purchase, DNS change, mailbox creation, campaign assignment, or cap change.

## Current scale gap — 2026-08-30

For the 2,500-per-week objective over five sending days:

- Target daily volume: **500**.
- Current healthy inventory: **4 mailboxes**, with a 100/day aggregate safety backstop.
- Minimum additional AirMail-equivalent capacity at 20/day: **20 mailboxes**.
- Recommended order with one five-mailbox resilience cohort: **25 mailboxes on five domains**.
- Current eligible queue: **76 contacts**.
- Seven-day target runway at 500/day: **3,500 contacts**.
- Current lead-supply gap: **3,424 verified, deduplicated, suppression-cleared contacts**.

The health dashboard calculates these gaps automatically. A purchase can begin warmup in parallel,
but campaign assignment must wait until both capacity and supply gates pass.

## Provisioning record

Complete one row per domain and attach provider evidence; never record passwords or API keys here.

| Domain | Registrar/provider owner | Renewal owner | MX | SPF | DKIM | DMARC | Forwarding | Mailboxes | Setup state |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| Cohort domain 1 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | 5 | Not ordered |
| Cohort domain 2 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | 5 | Not ordered |
| Cohort domain 3 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | 5 | Not ordered |
| Cohort domain 4 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | 5 | Not ordered |
| Cohort domain 5 | Pending | Pending | Pending | Pending | Pending | Pending | Pending | 5 | Not ordered |

## Mailbox acceptance gates

Every mailbox must pass all items before assignment:

- Setup is complete and the account is connected.
- SPF, DKIM, DMARC, MX, and tracking-domain evidence is verified for its domain.
- Warmup has completed the approved observation period and health is at least 90%.
- No DNS, connection, warmup, provider, or sending error is present.
- Reply routing is monitored in Instantly Unibox and 100D/100E processing is healthy.
- The sender uses a real approved identity and a monitored reply destination.
- The mailbox has no live campaign assignment during provisioning or warmup.

## Cohort activation gates

- Current campaign has zero spam complaints and remains within the bounce threshold.
- Suppression, unsubscribe, webhook, and audit-store checks pass.
- At least seven days of verified, deduplicated, suppression-cleared supply exists at the proposed
  post-activation daily stage.
- The health dashboard reports current evidence rather than stale or missing metrics.
- A rollback owner and the exact five-mailbox cohort are recorded.
- Founder approval identifies the cohort and campaign assignment.
- 100F remains the only mechanism allowed to advance daily volume.

## Activation sequence

1. Purchase or provision the specifically approved cohort.
2. Verify DNS and forwarding before adding any mailbox to Instantly.
3. Add accounts to Instantly with no campaign assignment and enable conservative warmup.
4. Observe warmup for the approved period; resolve every error before proceeding.
5. Recheck the health dashboard's capacity and seven-day supply forecast.
6. Assign only one five-mailbox domain cohort.
7. Keep the campaign stage unchanged; let 100F evaluate the next scheduled stage.
8. Observe at least one full gated stage before assigning another cohort.

## Immediate rollback

On authentication failure, health degradation, bounce breach, complaint, webhook failure, or missing
suppression evidence: pause progression, remove the affected cohort from assignment, preserve audit
records, repair the cause, and require a new healthy observation window.
