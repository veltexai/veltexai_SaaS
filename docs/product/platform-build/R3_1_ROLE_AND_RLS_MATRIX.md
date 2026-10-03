# R3-1 CRM role and RLS matrix

Status: **FROZEN FOR IMPLEMENTATION**  
Base: production-verified R2 head `b6ec4ac`  
Scope: Prompt 3 S1+S2, the first increment of the approved R3 Bid-to-Won stage

R3-1 does not complete R3. Walkthrough evidence, estimate/scenario links,
immutable proposal versions, C0 acceptance and receipt, provider-neutral
handoff, A0–A8 instrumentation, and acceptance-received notification remain
required R3-2 through R3-8 increments.

## Fixed product vocabulary

- Roles remain `owner`, `admin`, `estimator`, and `viewer`. R3-1 does not add a
  `sales_manager` role.
- Canonical opportunity categories are `new`, `qualifying`, `walkthrough`,
  `estimating`, `proposing`, `negotiating`, `won`, `handed_off`, `lost`,
  `disqualified`, and `nurture`.
- Starter pipeline keys are `commercial_facility_v1` and
  `residential_turnover_v1`.
- R3-1 permits only a reasoned manual transition into `won`.
  Customer-acceptance wins wait for R3-5.
- `handed_off` is unreachable until the R3-6 handoff package exists.
- `proposing` and `negotiating` require a linked existing proposal whose status
  is `sent` or `accepted`; R3-1 never regenerates proposal content.

## Permission overlay

| Capability | Owner | Admin | Estimator | Viewer |
|---|---:|---:|---:|---:|
| Read pipeline configuration | Organization | Organization | Organization | Organization labels/counts through a redacted read model |
| Configure pipelines, stages, loss reasons | Yes | Yes | No | No |
| Create leads/customers/contacts/properties/opportunities | Yes | Yes | Yes | No |
| Edit leads/opportunities | Organization | Organization | Created by or assigned to member | No |
| Assign owner/estimator | Yes | Yes | No | No |
| Move stage | Organization | Organization | Created by or assigned to member; gates apply | No |
| Mark manual win | Yes | Yes | No | No |
| Read customer/contact PII | Organization | Organization | Only through created/assigned opportunity scope | No direct table access |
| Read opportunity price | Organization | Organization | Created/assigned | Redacted read model only |
| Read cost, wage, margin, access notes | Existing R2 permission boundary | Existing R2 permission boundary | Denied unless a later reviewed permission exists | Denied |
| Import, export, merge, email, SMS, AI apply, handoff | Not present in R3-1 | Not present | Not present | Not present |

Every command and query carries an explicit `organization_id`. The profile's
`active_organization_id` selects UI context only and never authorizes access.

## Table policy contract

All R3-1 tables:

1. carry a non-null `organization_id` foreign key;
2. enable RLS and revoke all anonymous access;
3. use caller-bound R2 membership helpers, never a caller-supplied user ID;
4. prevent changing `organization_id` in place;
5. expose no service-role credential or bypass through browser responses.

Direct authenticated writes are revoked from the CRM tables; product mutations
run only through the reviewed caller-bound commands. Any remaining direct reads
are constrained by the table policies: managers see the organization, estimators
see their scoped records, and the viewer experience is served through the
explicit redacted server read model. Anonymous callers receive no CRM grant.

`opportunity_stage_history` is append-only and may be written only by the
reviewed stage-move command/trigger. Audit and domain events reuse
`organization_audit_log` and `organization_event_outbox`; R3-1 creates no
second audit or queue subsystem.

## Required isolation matrix

For two synthetic organizations, verify owner, admin, estimator, viewer,
non-member, anonymous, service runtime, and direct SQL maintenance contexts.
Every new table must prove:

- no cross-organization read, list, count, insert, update, or delete;
- an estimator cannot infer or mutate an unassigned opportunity;
- a viewer cannot receive contact PII, opportunity price through raw tables, or
  any cost/margin/access data;
- stage history cannot be updated or deleted and cannot be forged directly;
- assignment references belong to the same organization;
- pipeline/stage/property/customer/package references cannot cross tenants;
- failed access is indistinguishable from a missing record at the HTTP layer.

## Non-duplication boundary

R3-1 consumes the production R2 organization, membership, audit, outbox/inbox,
tenantized proposal, and active-organization contracts. It does not edit
organization/team UI, invitations, pricing, proposal bytes, tracking, Stripe,
trial usage, marketing attribution, or 100D.
