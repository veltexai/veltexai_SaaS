# R3-4 immutable proposal versions — independent review assignment

Status: **LOCAL REMEDIATION VERIFIED / INDEPENDENT RE-REVIEW REQUIRED**

Review the exact remediation range and candidate named in
`PACKET_MANIFEST.txt`. Start from the prior Claude/Cursor FAIL findings in the
authoritative ledger and verify each claimed fix rather than restarting a
generic feature review. Do not
edit repository files, commit, deploy, access Preview/Production, send customer
messages or reinterpret proposal preparation as delivery or acceptance.

## Frozen scope

R3-4 adds one append-only immutable proposal-version boundary on top of the
accepted R3-3 estimate linkage. It includes:

- migration `20261005000000_r3_4_immutable_proposal_versions.sql`;
- strict customer-visible v1 snapshot validation and exact hashes;
- one service-role-only publish command with caller reauthorization;
- caller-scoped proposal-candidate and immutable-history metadata readers;
- a server composer that takes authoritative records, not browser content or
  prices;
- one authenticated GET/POST opportunity route; and
- one shared Board/List preparation dialog and history view.

It must not send a proposal, expose a public link, record acceptance/signature,
move an opportunity to won, create a contract/invoice, schedule work or hand
off operations.

## Claude lane — database/security/replay/privacy

Return `PASS` or `FAIL`, ordered findings with file/line evidence, commands
actually run and residual risks. Verify:

1. owner/admin/exact assigned-estimator authorization occurs before receipt
   lookup; viewer/unrelated/cross-tenant/unknown records are non-enumerating;
2. proposal/customer/property/opportunity/package/estimate bindings are exact;
3. selected R3-3 amount, currency and basis are reused without recalculation;
4. snapshot nested/top-level allowlists and rendered-byte handling cannot
   persist internal economics, access-adjacent fields or browser forgeries;
5. rows are immutable, version allocation/package pointer update are atomic,
   package stays `estimated`, exact replay works, changed replay and stale/race
   writers fail, and closed/new-lifecycle publication is refused;
6. grants/RLS/definer allowlist/read projections and ID-only audit/outbox data
   preserve tenant boundaries; and
7. the committed matrices and true two-session race genuinely prove their
   claims without vacuous catches or owner/service-role shortcuts.

Specifically re-test every former Claude blocker: authorized source reads,
rendered-byte/selected-estimate binding, authorization before lookup, immutable
proposal bindings, command-managed package pointer invalidation, strict JSON
leaf types, replay order, actor-bound receipts, latest package-less estimate
selection and UPDATE/DELETE/TRUNCATE resistance. Confirm the transaction-local
pointer flag cannot authorize a later direct statement.

Reproduce at least the migration contract, focused Jest, TypeScript, and fresh
PostgreSQL harness if the review environment supports them. Distinguish an
environment limitation from a source failure.

## Cursor lane — operator workflow/accessibility/truthfulness

Return `PASS` or `FAIL`, ordered findings with file/line evidence, commands
actually run and residual risks. Do not duplicate the deep SQL audit. Verify:

1. Board and List expose the same action only with valid supported-segment,
   open-opportunity, property and selected-estimate prerequisites;
2. package/proposal candidate selection, retry-key stability, stale-token
   recovery, refresh/history reconciliation and new-version behavior are
   understandable and do not overwrite history;
3. the browser cannot choose price or rendered/snapshot bytes;
4. copy consistently says prepared/not sent and never implies delivery,
   signature, acceptance, contract, win or handoff;
5. dialog focus/escape/return behavior, keyboard operation, live feedback,
   44px targets and no page-level overflow work on desktop and genuine 390px;
6. viewer and unsupported commercial/specialty paths do not expose the action;
   and
7. existing Estimate/Board/List flows do not regress.

Specifically re-test every former Cursor blocker: exact price/scope/rendered
content review, stable 409 recovery, history/request-key preservation,
deliberate new-version creation, and Board/List alignment to the package-bound
estimate.

Repository-only inspection is acceptable for an initial verdict, but do not
claim genuine 390px perception without actually rendering and inspecting it.

## Required output

- Exact packet SHA-256 and candidate commit verified.
- Verdict: `PASS` or `FAIL`.
- Findings ordered Critical / High / Medium / Low with precise evidence.
- Tests/checks actually executed and results.
- Explicit confirmation that no hosted or production state changed.
- Remaining Preview/founder gates even if the local verdict is `PASS`.
