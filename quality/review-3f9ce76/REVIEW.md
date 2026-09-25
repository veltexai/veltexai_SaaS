# Final bounded correction review: 644000d..3f9ce76

Exact candidate: `3f9ce76361e7893fdcbef458b6b997d4d04ad9a0`. Scope is prior H1/M1/M2/L1 and correction regression impact. This supersedes the intermediate 3293601 checkpoint in the sibling evidence directory. **Final correction verdict: PASS. H1/M1/M2/L1 are closed. No Critical, High or Medium findings remain in this bounded delta. Release remains FAIL / BLOCKED by the separate external acceptance gates.**

## Local checks

- Exact isolated archive of 3f9ce76: two relevant suites / 59 tests PASS; `tsc --noEmit` PASS (logs here).
- Intermediate 3293601 isolated archive: six suites / 80 tests PASS, including direct public-PDF export across all five catalog types and failed/successful delivery controls for all three delivery methods. Its PDF/send/application code and committed PDF are byte-identical in 3f9ce76; only the entitlement SQL and its static test changed afterwards. These results therefore remain applicable without claiming 80 newly rerun tests on the final commit.
- **M1 closed:** safe public catalog marker triggers catalogDocumentText. Generated PDFs contain customer-readable price/brand with no raw veliz blocks, fences or bold markers. All three committed PDF pages were rendered and visually inspected clean. Privacy-sensitive catalog data remains excluded from the public projection.
- **M2 closed:** tracking insert failure returns TRACKING_SETUP_ERROR and HTTP 500 before any email-service call or sent-status update. Mocked online_only/both/pdf_only failure tests pass; successful controls return 200 and call mocked email once. No real mail was sent.
- Latest SQL explicitly denies free_trial profile, otherwise chooses newest active/trialing subscription, otherwise falls back to active profile. No grants or security-definer boundaries changed relative to the reviewed RPC.

## Independent SQL verification

Completed in the existing [Veltex AI Release 1 independent review](https://claude.ai/cowork/cse_015J3LbDmLeVEV7Qt2Bkcoz9) chat. Full downloaded report: `CLAUDE_3F9CE76_FINAL_REVIEW.md`. These are Claude-executed SQL results, distinct from Codex's local tests above.

- **H1 closed:** exact 51-migration candidate CHECK_DEFINERS=1 run_all.sh passed exit 0 with the committed allowlist, unknown-token negatives and no diagnostic patches. Owner matrix, H1/H2–H6, F4a–F4c, injection, dirty data, rerun and 40-way concurrency passed. Definer inventory passed.
- **L1 closed:** actual authenticated-owner get_user_usage_info and tracked paid access agree in 80/80 normal combinations and 32/32 latent trialing combinations. Four-case precedence verified: free_trial profile denies; otherwise newest active/trialing row decides; otherwise active profile allows; all other statuses deny. The trialing combinations used a diagnostic scratch constraint relaxation because the repo schema currently rejects that status.
- Unknown, short, empty and NULL tokens return SQL NULL from the revised paid RPC, while valid-token matrix results are non-null. Current routes fail closed: the reader rejects unknown tokens first and Boolean(null) is false. There is no current bypass.

## Remaining severity-ranked notes

No blocking findings remain in the requested scope. **Info:** wrap the entire paid-access scalar query in coalesce(..., false) if a strict boolean contract is desired, and add IS FALSE assertions for invalid tokens; a future SQL caller using IF NOT function(...) could mishandle NULL. **Info:** both owner and tracked queries order only by created_at; equal timestamps have no deterministic tie-breaker. Adding the same tie-breaker to both would make parity robust under tied rows. Neither is a newly demonstrated authorization failure in the current flow.

Previously reported Low issues (unbounded token engagement writes, mainly static committed tests, guessable synthetic preview token) and migration-operation Info notes are carried forward, not reopened as blockers in this bounded correction. The executed precedence matrix should ideally be retained as a committed harness assertion to prevent future divergence.

## Limits

No production/hosted mutation, deployment, email, preview deletion, spending or external human contact. Earlier unrelated Low/Info findings were not re-reviewed. The applied migration is edited in place, so fresh-chain results do not attest to any hosted target's current function body. Implementation-reported preview updates were not independently executed in this review. Real combined-delivery email acceptance, operator pricing validation and founder acceptance remain separate release gates; the user's existing deployment authorization and its conditions are preserved.
