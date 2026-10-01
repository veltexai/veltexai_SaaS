# Claude assignment — R2 G3 production reconciliation

Perform an independent read-only review of the exact G3 delta on branch
`codex/r2-fresh-preview-guard`. Do not access or mutate any hosted system.

## Scope

- `quality/r2-production-reconciliation/`
- `docs/product/platform-build/R2_PRODUCTION_RELEASE_PACKET.md`
- the G3 entry in `docs/OPERATING_STATE_AND_DECISION_LEDGER.md`

## Evidence

The redacted production fingerprint was collected inside an explicit
`begin transaction read only` / `rollback` block from project
`iwoaaljitifloolszxlu`. It contains no customer content, email, token or
credential. Production still has 29 recorded versions, 86 profiles, 166
proposals, four tracking rows, four branding rows, 11 subscriptions, zero
company profiles and zero measured orphans. R2 is absent.

The new builder must refuse the fingerprint until independent review is PASS.
It emits only an unarmed artifact with an unconditional exception. There is no
arming or production runner in this delta.

## Required review

1. Verify the discovery SQL is genuinely read-only and redacts customer data.
2. Verify every prerequisite step is represented and cannot be inferred from
   migration history alone.
3. Verify the builder rejects wrong project, history drift, missing digests,
   partial state, present R2 and pending review.
4. Verify all 32 migration sources are SHA-256 pinned.
5. Verify generated SQL is non-executable and contains no mutation outside its
   manifest comment.
6. Identify whether any `complete` probe is too weak to authorize a future
   history-only reconciliation. Treat such a probe as a blocker; the next
   revision must strengthen it before any arming design.
7. Confirm the current artifact does not authorize production and that G2/G4
   remain open.

Return `PASS` or `FAIL`, exact commands/evidence, blockers ranked by severity,
and the minimum next implementation contract. Stop after review.

