# Veltex AI sender-expansion plan

## Objective

Build toward 2,500 delivered campaign emails per five-day week without concentrating reputation risk in one domain or bypassing the audited ramp controller.

## Capacity target

- Target volume: 500 campaign emails per sending day.
- Mature mailbox planning limit: 20 campaign emails per new mailbox per day.
- Minimum active capacity: 25 healthy mailboxes.
- Recommended reserve: 5 additional warmed mailboxes, for 30 total.
- Domain distribution: 2–3 mailboxes per sending domain, requiring approximately 10–15 authenticated domains.
- Eligible-contact inventory: minimum 3,500 contacts (7 days); preferred 7,000 contacts (14 days).

Warm-up traffic is separate from campaign volume. Provider limits, mailbox reputation, bounce signals, complaints, and opt-outs always override the planning limits above.

## September 5 purchase checkpoint

Before purchase, record:

1. Provider and price per domain and mailbox.
2. Initial batch size. Recommended first batch: 3 domains and 6 mailboxes.
3. Domain ownership and renewal account.
4. Mailbox administrator and recovery ownership.
5. DNS administrator responsible for SPF, DKIM, DMARC, and tracking records.
6. Cancellation, replacement, and failed-provisioning terms.

Do not buy all 25–30 mailboxes in the first batch. Validate provisioning, authentication, warm-up, and event reporting on the first six before ordering the next batch.

## Provisioning checklist

For each domain:

- Keep it separate from the primary corporate domain.
- Configure exactly one valid SPF policy.
- Enable provider-issued DKIM signing.
- Publish DMARC in monitoring mode first, with aggregate reporting directed to an owned mailbox.
- Configure a branded tracking subdomain only when required.
- Verify DNS publicly before attaching mailboxes to a campaign.

For each mailbox:

- Assign a real sender identity and monitored reply destination.
- Enable warm-up and keep campaign sending disabled during the initial warm-up period.
- Warm for at least 14 days; extend the period when the domain is newly registered or health is unstable.
- Require health of at least 95% before campaign assignment.
- Add mailboxes to rotation in small batches and preserve reserve capacity.

## Activation sequence

1. Purchase and provision the first 3 domains / 6 mailboxes.
2. Authenticate and verify every domain.
3. Warm the six mailboxes for at least 14 days.
4. Confirm 7–14 days of suppression-cleared lead inventory for the proposed volume.
5. Add two mailboxes at a time to the isolated campaign rotation.
6. Let the ramp controller advance only after dwell, delivery, bounce, unsubscribe, complaint, webhook, health, capacity, and supply gates pass.
7. Keep 15–20% of warmed capacity unassigned as reserve.

## Stop conditions

Stop expansion and investigate if any of these occur:

- Bounce rate exceeds 2%.
- Spam complaints are nonzero.
- Unsubscribe rate exceeds 5% after at least 20 stage sends.
- Any assigned mailbox health falls below 95%.
- Webhook ingestion fails or suppression parity is incomplete.
- Eligible inventory drops below seven sending days.
- A domain or mailbox authentication check fails.

