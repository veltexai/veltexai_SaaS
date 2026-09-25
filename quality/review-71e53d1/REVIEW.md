# Independent review: 9a81c5c..71e53d1

Reviewed candidate: `71e53d112b17ee4e4cefe42d0b99dbed75d8959e`, branch `codex/r0-privilege-hardening`. **Delta FAIL. Release remains BLOCKED.** This is a review-only record; no candidate fixes are included here.

## Severity-ranked findings

### P1 / High — new public definers fail the required database allowlist (introduced release-control regression)

`supabase/migrations/20260924013000_sync_tracked_engagement_fields.sql:79-80` grants anon/authenticated execution of `record_tracked_download(text)`, `record_tracking_click(text,text,text,text)` and `tracked_proposal_has_paid_access(text)`. None appears in the exact candidate's H1 allowlist in `quality/service-catalog-round4/db-harness/sql/30_assertions.sql:191-200`. The required `CHECK_DEFINERS=1` gate therefore rejects the candidate. This is a review/verification blocker, not proof that these token-scoped functions themselves expose arbitrary proposals. Independently review each boundary, then add targeted valid/invalid/disabled-token, rollback, concurrent-counter and grant checks alongside any justified allowlist update.

### P2 / Medium — public PDF loses catalog rendering (introduced)

`app/api/proposals/[id]/download/route.ts:28,48-50,68` now passes the `read_tracked_proposal` public projection directly into `generateProposalPDF`. That projection deliberately omits `service_specific_data` and supplies `catalog_document: true`. The exporter at `features/proposals/services/pdf/export-jspdf.ts:110` still calls `isCatalogProposal`, which recognizes only `service_specific_data.catalogJob`. It therefore skips `catalogDocumentText` for the public download. Scope and pricing are printed as raw fenced JSON instead of customer-facing rows.

Verified in the committed `quality/paid-entitlement-acceptance-20260924/tracked-link-download-final.pdf`: pages 1 and 2 visibly contain `veliz_scope_table` and `veliz_pricing_table` plus raw JSON. All three pages were rendered and inspected; extracted text is preserved in `committed-pdf-text.txt`. A focused classifier regression probe fails on the exact commit. Preserve the safe public projection and explicitly carry its catalog marker through the export path; do not restore private catalog data to fix presentation.

### P2 / Medium — newly enabled online-only delivery can report success for a dead link

The route's existing error handling at `app/api/proposals/[id]/send/route.ts:146-149` continues after tracking-row insertion fails. With link-only delivery now enabled in `features/proposals/constants/delivery-methods.ts:21-34`, that row is the sole capability that makes the email useful: the returned `/view/<token>` cannot resolve without it. A mocked route probe on exact 71e53d1 makes insertion fail and observes HTTP 200 and an email-service call. For online-only/both, fail before sending when the capability cannot be persisted. The permissive handler predates this delta; enabling these choices exposes the failure through the normal UI.

## Verified behavior and limits

- Exact candidate copied with `git archive 71e53d1` to an isolated directory when the implementation worktree began changing. Final test rerun used that immutable snapshot, not the in-progress fixes.
- Exact-snapshot TypeScript `tsc --noEmit`: PASS, exit 0 (`exact-typecheck.log`).
- Four relevant existing suites passed: 22 tests (hardening, tracking boundary, print session, public view). These include static checks and do not establish database execution.
- Eight additional behavioral/contract probes: six pass, two intentionally fail and demonstrate the PDF classification and dead-link-send findings. Anonymous no-token download returns 401; token/proposal mismatch returns 404; inactive tracked entitlement returns 403; paid token passes only the public projection and records a download; owner query filters by user; the documented token length is valid. Combined exact run: 28 passed, 2 failed.
- Probe patch and full logs are preserved. Route dependencies and email/PDF delivery were mocked; no email was sent and no hosted database was contacted.
- The tracking token `release1-qa-20260924` is exactly 20 characters. An initial manual miscount was corrected; it is not a finding.
- Both committed responsive screenshots were visually inspected. The one residential proposal fits the shown mobile and desktop layouts without visible clipping. Screenshots do not prove live viewport measurement, other proposal types, controls or authenticated screens. The report's two-page claim refers to the owner export; only the public three-page PDF is committed, so owner-PDF visual acceptance cannot be independently established from this folder.
- Public downloads now avoid service-role reads and use the existing allowlisted projection. Mismatched tokens are rejected before rendering. Print data uses the caller's client; owner/paid checks still precede the print page. Company-profile branding is preferred with profiles fallback.
- New view/download counters use an in-row increment plus history insert within one SQL function statement; any insert failure rolls back the increment. Legacy viewed/downloaded booleans and first timestamps are updated together. Owner analytics reads tracking download_count, so removing the old attempted proposals.download_count write does not break the checked owner analytics path.
- Delivery-method constraint accepts the old pdf/online and current pdf_only/online_only/both values. Both statements are not explicitly wrapped in a transaction; migration execution must be transactional to avoid leaving the constraint absent if recreation fails.
- The public HTML reader still has no subscription predicate (pre-existing); this delta checks subscription status for PDF download. No new raw private-data exposure was identified in source review. Subscription revocation behavior for HTML links remains a product-policy/acceptance question, not a newly introduced defect claim.
- Existing committed tests are predominantly source-text assertions. The full 521-test/build report is implementer evidence, not independently rerun here. No production deployment, preview deletion, email or spending occurred.

## Claude review

Completed in the existing chat “Veltex AI Release 1 independent review”: https://claude.ai/cowork/cse_015J3LbDmLeVEV7Qt2Bkcoz9. Downloaded report: `CLAUDE_71E53D1_DELTA_REVIEW.md`. **Claude also returns delta FAIL and release FAIL.**

Claude executed the exact 51-migration scratch PG16 chain. The unchanged CHECK_DEFINERS=1 gate failed with exit 3 naming all three new functions. Diagnostic tests after a scratch-only allowlist addition passed, but do not count as a pass of the committed gate. Its targeted tests verified token length/unknown/NULL/disabled tracking, absence of anonymous direct table writes, legacy-field synchronization, insert-failure rollback and 30 concurrent download/click calls without lost updates. Delivery-method upgrade and rerun passed on the repo schema; alternate constraint names and nonconforming data need target inventory.

Claude's additional Low finding L1 is a real semantic mismatch: profile active with no subscription row grants owner paid actions through get_user_usage_info fallback, while tracked_proposal_has_paid_access requires an active subscriptions row and denies customer download. Unify those rules inside a token-scoped boundary. The report also records Low concerns about unbounded token-based engagement writes, static-only tests, and the synthetic preview's guessable evidence token. Production send uses randomUUID; no production-token weakness was identified. Preview cleanup remains subject to the existing user conditions, not authorized by this report.

Clarification to Claude's M1 explanation: export-jspdf already supports catalog blocks through catalogDocumentText at line 110. The new public projection fails the existing isCatalogProposal classification, skipping that support. This interface regression is introduced by the changed download route; the route-shaped probe and committed artifact establish the failure. Fixing the marker safely is sufficient; restoring private service_specific_data is unnecessary.

Neither reviewer treats independent review as deployment authorization or as overriding existing user authorization. Real PDF-plus-link email acceptance, operator pricing validation and founder acceptance remain open after these code findings are fixed.
