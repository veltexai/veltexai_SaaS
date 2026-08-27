# Veltex AI sender-expansion purchase packet

Prepared: 2026-08-26

This packet is purchase-ready but does not authorize or execute an order, domain registration,
mailbox creation, campaign assignment, cap change, or live mutation.

## Recommended order

Use Instantly Done-for-You AirMail for the next capacity cohort:

- **5 dedicated `.com` sending domains**
- **5 AirMail mailboxes per domain**
- **25 new mailboxes total**
- Forward every secondary domain to `veltexai.com`
- Keep every new mailbox unassigned while DNS, warmup, health, and compliance evidence mature

This intentionally overprovisions the 2,500-per-week objective. New AirMail accounts are bounded at
20 campaign emails per day, so 25 new accounts provide 500/day before counting the four existing
mailboxes. Including the existing inventory provides operating headroom and allows one new five-account
domain cohort to be isolated without eliminating the 500/day target capacity.

## Domain candidates

The following `.com` domains appeared as available in the signed-in Instantly AirMail order flow on
2026-08-26. Availability must be rechecked immediately before purchase.

1. `startveltexai.com`
2. `meetveltexai.com`
3. `chooseveltexai.com`
4. `buildveltexai.com`
5. `nextveltexai.com`

They are dedicated outreach domains, not replacements for the primary product domain. Domain
forwarding should point visitors to `veltexai.com`.

## Mailbox identities

Use the real sender identity **Anthony Veliz** consistently. Create these five addresses on each
domain; do not invent staff identities:

1. `anthony@<domain>`
2. `anthony.veliz@<domain>`
3. `veliz@<domain>`
4. `aveliz@<domain>`
5. `anthonyveliz@<domain>`

Replies must remain visible in Instantly Unibox and flow through the existing 100D/100E event and
reply-intelligence controls. Do not assign the new accounts to 100C during provisioning or warmup.

## Verified price and timing

The signed-in order flow showed:

- AirMail mailbox: **$4/month each**
- Domain: **$15/year each**
- Setup window: **24–72 hours** for provisioning and DNS propagation

For this five-domain, 25-mailbox cohort:

| Cost | Amount |
| --- | ---: |
| Initial mailbox month | $100 |
| Initial annual domain registrations | $75 |
| Expected initial charge | **$175** |
| Ongoing mailbox subscription | **$100/month** |
| Annual domain renewal | **$75/year** |
| First-year total before taxes and the existing Instantly plan | **$1,275** |

Renewals are separate from the main Instantly outreach subscription and process automatically.

## Ownership and continuity tradeoff

Instantly configures DNS and hosts the AirMail sending infrastructure. Domains purchased through
Instantly remain owned/administered by Instantly and currently cannot be transferred. AirMail also has
no standalone inbox outside Instantly. Cancellation takes effect immediately for mailboxes, stops
campaign and warmup activity, and can remove Unibox conversations after the documented grace period.

This is the fastest and lowest-operations path, but it creates provider dependency. Preserve campaign,
reply, suppression, and audit data in the existing Supabase control plane rather than treating Instantly
as the sole system of record.

## Readiness calendar

Assuming order approval and payment on 2026-08-26:

1. **Aug 26:** place the exact approved order.
2. **Aug 27–29:** provisioning and DNS propagation; verify MX, SPF, DKIM, DMARC, and forwarding.
3. **By Aug 29:** enable recommended slow warmup on all 25 accounts; no campaign assignment.
4. **Sep 19:** complete the preferred three-week AirMail warmup observation.
5. **Sep 19–22:** first assignment review; require health above 90%, clean authentication, no errors,
   and healthy current-pilot evidence.
6. **Late Sep onward:** assign one domain cohort at a time. Let 100F advance only one audited stage at
   a time and never jump directly to 500/day.
7. **October:** realistic operating window for 2,500/week if supply and all safety gates remain healthy.

## Acceptance gates before campaign assignment

- Setup Pending has cleared for every mailbox.
- MX, SPF, DKIM, and DMARC are verified for every domain.
- Warmup has run for at least the approved AirMail period with health above 90%.
- No disconnected, DNS-error, or warmup-error account exists in the cohort.
- Current pilot bounce rate, complaints, unsubscribe, webhook, suppression, and provider signals pass.
- At least seven days of verified, deduplicated, suppression-cleared lead supply is available.
- Mailbox-to-campaign assignment and per-account ceiling are explicitly approved and recorded.
- 100F remains the only mechanism allowed to advance the campaign stage after activation.

## Transaction boundary

Immediately before purchase, confirm the five domains are still available and the checkout total is
$175 before taxes. Placing the order creates recurring subscriptions and requires a final action-time
confirmation from the founder.
