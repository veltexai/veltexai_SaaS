# Bounded correction review: 644000d..3293601

Historical checkpoint within the same review. The implementation task subsequently supplied 3f9ce76; see ../review-3f9ce76/REVIEW.md for the final candidate verdict.

Exact candidate `32936010906a7cb6830bcedce29d04291e0736df`. Scope limited to prior H1/M1/M2/L1 and correction regression impact. **Correction verdict: PASS with one remaining Low finding. H1/M1/M2 are closed; L1 is only partially closed. Release remains FAIL / BLOCKED by the outstanding external acceptance gates.**

## Local verification

An isolated source snapshot was created with `git archive 3293601`. No application source in the implementation worktree was edited. Relevant existing suites and additional behavioral probes: **6 suites, 80 tests PASS**. TypeScript `tsc --noEmit`: **PASS**. Logs and replayable probe patches are included here; the extra probes ran only in the isolated snapshot.

- **M1 PASS:** actual `generateProposalPDF` executed for all five catalog types using the public catalog marker with private service-specific data removed. Each resulting PDF contained the expected price/brand and no raw `veliz_`, code-fence or `**` markers. The corrected committed public PDF was extracted, rendered and all three pages visually inspected. Scope/pricing rows are customer-readable; no visible Markdown artifacts were found. The new classification accepts only literal `catalog_document === true`, retaining the existing private catalog marker path.
- **M2 PASS:** mocked tracking insertion failures for online_only, both and pdf_only return errors before EmailService is called. Successful controls for all three delivery methods still call mocked delivery once and return 200. No actual email was sent.
- Existing anonymous, mismatched token, unpaid download and owner-filter protections still pass the focused route probes. These mocks test routing behavior, not database authorization.
- **H1 PASS:** Claude executed the exact 51-migration candidate and committed CHECK_DEFINERS=1 run_all.sh in disposable PG16, without a diagnostic allowlist patch: exit 0, all assertions, injection, dirty-data, rerun and 40-way concurrency passed. Definer inventory passed. Scratch mutations that made the download or paid function return true were caught at F4a/F4c, confirming the unknown-token negatives are effective.
- **L1 PARTIAL / Low remains:** active-profile/no-subscription now agrees with owner paid access, and normal active-subscription cases pass. Full equivalence does not hold. Claude compared actual authenticated-owner get_user_usage_info against the tracked RPC over 8 profile statuses × 10 subscription sets: 74/80 agree. The six mismatches have a free_trial profile plus an active subscription: owner helper denies paid access while tracked access allows it. With trialing permitted in a diagnostic scratch schema, 11/32 additional cases diverge due to profile/newest-subscription precedence. The repo constraint currently rejects trialing, so those are latent drift cases, not established production failures.

No production/hosted writes, deployments, preview deletion, email, spending or external human contact. No full build/full-suite rerun was claimed. The existing chat “Veltex AI Release 1 independent review” is being reused; no duplicate review task was created.

## Severity-ranked remaining finding

**Low L1′ — duplicated paid-access rules disagree under mixed billing state**, `supabase/migrations/20260924013000_sync_tracked_engagement_fields.sql:72-76`. The SQL OR rule admits any active profile or subscription, while the owner helper first honors free_trial and then chooses the latest active/trialing subscription before profile fallback. A previously issued token can still download during states in which the owner helper denies paid actions. Token possession and proposal scoping remain enforced; new links cannot be sent in those states. No cross-tenant exposure was found, so this is retained as Low rather than a blocking security finding. Recommended correction: derive tracked access from the same internal helper after resolving the token and add the state matrix to the harness. Claude's scratch-only same-helper variant matched 80/80 plus 32/32 latent cases; that fix is not in 3293601.

No remaining Critical/High/Medium findings in this bounded correction review. Earlier unrelated Low/Info observations are carried forward without re-review. An informational operational note remains: the already-applied migration body was edited in place; fresh-chain PASS does not prove an existing target has the corrected body. This review made no hosted changes.

## Independent review artifact

Claude's executed SQL results and complete matrix interpretation are in `CLAUDE_3293601_FOLLOWUP_REVIEW.md`, downloaded from the existing [Veltex AI Release 1 independent review](https://claude.ai/cowork/cse_015J3LbDmLeVEV7Qt2Bkcoz9) chat. Codex independently performed the route/PDF tests, typecheck and PDF visual inspection above. Do not interpret correction PASS as confirmation of full entitlement parity or release approval. Real PDF-plus-link email acceptance, operator pricing validation and founder acceptance remain outstanding; existing user authorization and its conditions still govern deployment.
