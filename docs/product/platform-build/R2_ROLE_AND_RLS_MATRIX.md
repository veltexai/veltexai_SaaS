# R2 organization role and RLS matrix

Status: implementation candidate; hosted execution and independent review pending.

| Capability | Owner | Admin | Estimator | Viewer | Service role |
|---|---:|---:|---:|---:|---:|
| Read organization | Yes | Yes | Yes | Yes | Yes |
| Rename organization | Yes | Yes | No | No | Yes |
| Read memberships | Yes | Yes | Yes | Yes | Yes |
| Add/remove non-owner member | Yes | Yes | No | No | Yes |
| Grant/revoke owner | Yes | No | No | No | Yes |
| Read work/proposals | Yes | Yes | Yes | Yes | Yes |
| Create/update work | Yes | Yes | Yes | No | Yes |
| Delete proposal | Yes | Yes | No | No | Yes |
| Read tenant audit | Yes | Yes | No | No | Yes |
| Write audit/outbox/inbox directly | No | No | No | No | Yes |

## Invariants

- Authorization helpers accept an organization identifier but never a user identifier. Identity comes exclusively from `auth.uid()`.
- A record's `organization_id` cannot be changed in place.
- An organization must always retain at least one owner.
- Admins can manage ordinary memberships but cannot grant or revoke ownership.
- `viewer` is read-only. `estimator` may edit operational work but cannot manage organization settings or membership.
- Audit and outbox writes are transactional trigger effects. Browser roles cannot forge, update or delete them.
- Inbox identity is `(consumer, event_id)` so redelivery is idempotent per consumer.
- Public proposal access remains token-scoped through the separately hardened RPC; membership policies do not make proposals public.

## Compatibility boundary

`proposals.user_id` and `business_service_profiles.user_id` remain creator/legacy attribution fields. R2 adds mandatory organization ownership without rewriting proposal content. New proposal insertion requires `user_id = auth.uid()`; organization members can subsequently collaborate according to role.
