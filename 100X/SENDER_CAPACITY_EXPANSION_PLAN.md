# 100X sender-capacity expansion plan

This plan increases capacity without weakening the 100F safety controller. It prepares the path;
it does not authorize purchases, DNS changes, mailbox creation, campaign assignment, or cap changes.

## Capacity model

The controller's default independent backstop is 25 campaign emails per healthy mailbox per day.
Capacity must be calculated from **healthy, authenticated, warmed, and assigned** mailboxes only.

| Weekly target (5 send days) | Daily target | Minimum healthy mailboxes at 25/day |
| --- | ---: | ---: |
| 500 | 100 | 4 |
| 1,500 | 300 | 12 |
| 2,500 | 500 | 20 |
| 5,000 | 1,000 | 40 |

Keep mailbox distribution conservative: use multiple dedicated sending domains, avoid the primary
product domain, and never count an account until Instantly reports healthy status.

## Verified pilot inventory — 2026-08-30

The Veltex AI Instantly workspace currently has **four warmed mailboxes across two dedicated sending
domains**. All four report 100% health and are assigned to the approved 100C pilot. The audited
controller advanced the campaign to the 3/day stage after recording three clean sends on Aug 29.

| Inventory class | Mailboxes | Campaign assignment | Safe role |
| --- | ---: | --- | --- |
| Current pilot senders | 4 | Assigned to the approved 100C pilot | Remain assigned while the 3/day observation window runs |
| Warm reserve | 0 | None | Additional capacity now requires provisioning a new cohort |

All existing mailboxes are now in the pilot. The next sender-capacity step therefore requires a
separately approved provisioning order. Do not assign new mailboxes merely because setup has
completed: assignment waits for warmup and the controller's delivered-volume, dwell-time, bounce,
complaint, webhook, authentication, unsubscribe, account-health, and eligible-supply gates.

## Expansion cohorts

| Cohort | Resulting inventory | Nominal backstop capacity | Activation condition |
| --- | ---: | ---: | --- |
| Pilot | 4 assigned | 100/day / 500 per 5-day week | Current controlled 3/day validation |
| Cohort 2 preparation | 4 existing + 10 new AirMail mailboxes on 2 additional dedicated domains | 300/day / 1,500 per week | Approved budget and identities; DNS verified; warmup completed before assignment |
| Cohort 3 preparation | 4 existing + 25 new AirMail mailboxes on 5 additional dedicated domains | 600/day nominal with one-domain resilience / 2,500 per week target | Cohort 2 operating health remains inside every gate |

Use no more than five mailboxes per dedicated sending domain in the AirMail expansion. A domain or
mailbox does not contribute to usable capacity until it is authenticated, warmed, healthy, and
explicitly assigned. Nominal capacity is an upper backstop, not a direction to jump campaign volume.

## Pre-provisioning packet

Complete and approve this packet before any purchase or account creation:

- Weekly objective: 500, 1,500, or 2,500 emails over five send days.
- Budget ceiling: domain acquisition/renewal, mailbox subscription, and Instantly account capacity.
- Domain convention: dedicated outreach domains only; never the primary product domain.
- Mailbox identities: named senders, recovery owner, and monitored reply destination.
- Registrar/provider owner: renewal contact, emergency access, and documented recovery route.
- DNS evidence: SPF uniqueness, DKIM validation, DMARC alignment/reporting, MX health, and tracking CNAME.
- Warmup acceptance: at least the approved warmup period, sustained provider health, and no abnormal
  spam-placement or authentication signal.
- Assignment record: cohort, campaign, per-mailbox ceiling, approval date, and rollback owner.

Purchasing, DNS mutation, mailbox creation, and campaign assignment remain separate consequential
actions. Prepare their exact values in advance, then execute only after the founder approves the
specific cohort and cost.

## Provisioning sequence

1. Approve the target weekly volume, budget, domain naming convention, and mailbox identities.
2. Buy or designate dedicated sending domains. Record registrar, owner, renewal, and emergency access.
3. Configure SPF, DKIM, and DMARC for every domain. Start DMARC in monitored enforcement appropriate
   to the provider, confirm alignment, and retain DNS evidence before sending.
4. Create mailboxes with unique credentials and recovery controls. Add them to Instantly without
   assigning them to the live campaign.
5. Warm each mailbox independently. Require sustained provider health, no authentication failures,
   and no abnormal spam-placement signal before campaign assignment.
6. Assign mailboxes in small cohorts. Recalculate controller capacity from healthy assigned accounts;
   do not manually jump the campaign cap.
7. Let 100F move only one approved stage at a time (1 → 3 → 5 → 10 → 25 → 50 ...), after dwell time,
   delivered-volume, bounce, complaint, webhook, authentication, unsubscribe, and account-health gates pass.

## Operating gates

- Queue runway: require at least seven days for activation, target fourteen days of operating reserve,
  and alert below three days.
- Bounce rate: at or below the configured 100F threshold.
- Spam complaints: zero at the current policy gate.
- Webhook failures: zero unless a separately reviewed policy explicitly changes it.
- Suppression and unsubscribe: tested and active; never bypassed.
- Domain authentication: SPF, DKIM, and DMARC verified for every sending domain.
- Mutation audit: every hold, pause, or advance is stored with the evidence used.
- Scale-readiness forecast: the health dashboard must show both sender-capacity and eligible-lead
  runway gaps before a cohort can be activated.

## Rollback

Any hard-stop signal triggers PAUSE. Remove an unhealthy mailbox from assignment, preserve audit data,
repair authentication or provider health, and restart only after a fresh healthy observation window.
