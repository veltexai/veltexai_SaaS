# R3-7 activation registry and R3-8 operator notification contract

Status: **ENTRY BOUNDARY PREPARED / A0–A8 SEMANTICS SOURCE REQUIRED /
IMPLEMENTATION DEPENDENCY-BLOCKED**

R3-7 follows accepted R3-6. R3-8 consumes accepted R3-5 receipt events and may
be implemented in parallel with R3-6/R3-7, but full R3 release acceptance still
requires R3-6, R3-7 and R3-8 to pass their own gates. Both reuse R2 audit/outbox
foundations and do not create parallel analytics or email systems.

## 1. Evidence audit and unresolved source

The repository repeatedly requires the Prompt 12 A0–A8 activation framework,
but does not contain the authoritative meaning, qualifying event or ordering for
each code. Existing `marketing_funnel_events` defines acquisition milestones
such as `sign_up`, `first_proposal` and `purchase`; those are not evidence that
they equal A0–A8. R3-7 must not invent a mapping from CRM stages or reuse the
unrelated A1–A8 security assertion labels in the database harness.

Before implementation, recover the approved Prompt 12 A0–A8 definition and
record, for each code:

- stable name and business meaning;
- qualifying source event and required evidence;
- whether it is ordered, repeatable or terminal;
- exclusion rules for sample/demo/test/imported data;
- timestamp policy and backfill policy; and
- product metric and operator-facing use.

Until that source is restored and independently checked, R3-7 remains blocked
at semantics—not at schema mechanics.

### Repository source reconciliation (2026-10-06)

A full working-tree and all-ref Git-history search found no checked-in or
deleted authoritative Prompt 12 A0–A8 semantic map. The older C1–C7 quick-
proposal planning packet lists nine lightweight UI analytics events, from
`demo_proposal_viewed` through `upgrade_or_trial_prompt_viewed`, but it never
labels those events A0–A8, cites Prompt 12 as their source, or supplies the
qualification, exclusion, ordering and backfill rules required above. Equal
cardinality is not semantic evidence. Positional mapping of that list to
A0–A8 is therefore explicitly rejected.

The next acceptable source is the original approved Prompt 12 text or a new
founder-approved semantic table containing every field listed above. This
reconciliation closes the repository-search task; it does not unblock
implementation.

## 2. R3-7 registry mechanics

Once the exact semantics are supplied, use one organization-scoped registry:

### `activation_metric_definitions`

- immutable metric key (`A0` through `A8`), semantic version and display name;
- source event key, evidence schema version and ordering/repeatability rules;
- sample/test/import/backfill policy; and
- active-from timestamp and superseded definition link.

Definitions are seeded by reviewed migration, not editable through ordinary
application UI.

### `organization_activation_milestones`

- organization ID, metric key/version and first-qualified timestamp;
- immutable source object type/ID and source event ID;
- canonical evidence hash and recorded timestamp; and
- provenance (`live`, `approved_backfill`) with sample/test prohibited.

Unique `(organization_id,metric_key,definition_version)` prevents double
counting first-qualified milestones. Repeat metrics, if the authoritative
source actually defines any, use a separate append-only occurrence table.

The recorder consumes committed domain events from the R2 outbox after the
source transaction. It validates the source object in the database, writes an
idempotent milestone and never changes domain lifecycle state. Client analytics
calls, page views and UI button clicks cannot directly qualify activation.

## 3. R3-7 truthfulness and privacy

- Demo/sample organizations and synthetic Preview fixtures are excluded.
- Imported historical activity is not silently presented as post-onboarding
  activation. Any allowed backfill is labeled and definition-bound.
- Registry events contain organization and immutable source identifiers only;
  no customer names, emails, access notes, estimate economics or proposal
  content.
- Acquisition attribution may join activation for reporting, but neither table
  rewrites the other and Stripe subscription purchase is not business-workflow
  activation unless the recovered definition explicitly says so.
- Operator dashboards must display only metrics whose definitions and source
  evidence are accepted; missing metrics remain `not yet recorded`, not zeroed
  or guessed.

## 4. R3-8 first required notification

The minimum R3 notification is `acceptance_received` for the owner/admin and
assigned estimator of the accepted opportunity. The source is the committed
R3-5 receipt event, never mutable proposal status or a browser callback.

### `operator_notifications`

- organization, recipient user, notification key/version;
- immutable source object type/ID and source event ID;
- bounded title/body template key plus identifier-only interpolation data;
- in-app state (`unread`, `read`, `archived`), created/read timestamps; and
- unique `(recipient_user_id,notification_key,source_event_id)`.

R3-8 first ships the durable in-app notification. It must not claim email/SMS
delivery.

### Optional channel deliveries

Email may be enabled later only through a versioned preference/consent and
delivery record:

- channel, template version, destination hash, attempt state and provider
  message ID;
- ordered outbox attempt, bounded exponential retry, terminal dead letter and
  operator-visible recovery; and
- no raw proposal content, customer data or access information in event payloads
  or logs.

Customer marketing consent is unrelated. Acceptance-received is a
transactional operator event; it cannot subscribe the customer to marketing.

## 5. Recipient and lifecycle rules

1. Resolve recipients at processing time from the organization and opportunity,
   then persist the exact recipient set with the notification rows.
2. Owner/admin recipients must be active members. The estimator receives it
   only when still an active exact assignee.
3. Membership removal before processing prevents delivery; removal afterward
   does not rewrite notification history but blocks future reads through RLS.
4. Exact event replay creates no duplicate. A corrected event requires a new
   explicit source event, not mutation of the old notification.
5. Notification failure never rolls back customer acceptance or changes CRM
   stages. It is visible and retryable independently.
6. In-app links resolve through authenticated organization context and cannot
   trust stored URLs or cross-tenant IDs.

## 6. Operator experience

- A keyboard-accessible notification center shows unread count and bounded
  acceptance summary without private customer content in global navigation.
- Opening the item marks it read only after successful authorized resolution.
- The linked CRM view shows the exact receipt and accepted packages subject to
  the user's current role.
- Errors preserve unread state; stale/removed access returns a generic message.
- Desktop and genuine 390px evidence covers focus, live count updates, 44px
  controls, no overflow and reduced-motion behavior.

## 7. Explicit exclusions

- invented A0–A8 meanings or CRM-stage approximations;
- a second GA4/Meta/marketing funnel registry;
- customer reminders, nurture campaigns or marketing messages;
- SMS, push, Slack, Teams or webhook delivery in the first R3-8 slice;
- notification-triggered domain mutations; and
- analytics or delivery provider activation without separate authorization.

## 8. Required proof

### R3-7

- checked-in authoritative A0–A8 semantic map and source citation;
- definition/version mutation and completeness tests for all nine codes;
- source-event validation, exact replay, out-of-order, concurrent and approved
  backfill tests;
- demo/sample/test/import exclusion and cross-tenant negatives;
- reconciliation query from source evidence to registry with no missing or
  duplicate qualified milestones; and
- privacy scan of registry, events, logs and reporting projection.

### R3-8

- owner/admin/active-assignee recipient matrix plus removed member, viewer and
  cross-tenant negatives;
- exact replay, concurrent worker, retry/dead-letter and acceptance-independence
  tests;
- in-app read/archive RLS and link-resolution IDOR proof;
- email remains disabled unless its preference, secret, provider and hosted
  delivery gates are explicitly accepted; and
- desktop/genuine-390px accessibility and refresh persistence.

### Shared release gate

- focused/full tests, TypeScript, build, migration validation and disposable
  database harness;
- exact independent Claude `PASS`, operator/accessibility review, guarded
  Preview proof and founder acceptance; and
- separately authorized production/provider activation.

## 9. Next action

R3-7 cannot move from boundary preparation to implementation until accepted
R3-6 and the exact approved Prompt 12 A0–A8 semantics exist. R3-8 waits for
accepted R3-5 receipt events and may proceed independently of outbound email by
shipping the durable in-app notification first. That parallelism does not waive
R3-6/R3-7 from the full R3 release gate.
