# Round 4 — migration corrections and follow-up hardening

Input: CLAUDE_ROUND3_REVIEW_RESULT.md for candidate 9df4073; the separate older-candidate review also identified JSONB ordering and the statistics RPC. No deployment is authorized by this document.

- R3-1: service_catalog_funnel_daily reads the actual `occurred_at` column. The corrected first catalog migration is included explicitly in the next bundle.
- R3-2: public token projection omits unavailable company colour columns. Existing UI colour defaults apply. It still projects the real company name and logo. Live branding-source parity is an external acceptance item.
- R3-4: shared `estimateInitialClean` clears both ongoing price and labour-hours overrides. UI and composition use that same calculation; heavy-condition tests retain its independent model. The ongoing monthly budget still excludes the initial clean.
- JSONB-order follow-up: unchanged-input comparison canonicalizes object keys recursively while preserving array order; unchanged stored text and money survive key reordering and forged browser output.
- Tracking statistics: legacy `get_proposal_tracking_stats` now uses SECURITY INVOKER and caller RLS; explicit anon and PUBLIC grants revoked; only authenticated and service_role execution granted. Identity-free history cannot support unique-person or per-view-duration estimates, so those outputs are NULL rather than a fabricated zero whenever events lack identity.
- R3-6/7: owner guards can be recreated on a repeat application. Unknown or merely textually different policy bodies still abort deliberately; inventory and adjudication precede deployment.
- R3-9/10/11: advisory detects digit-before-keypad cases and excludes square-foot quantities; catalog link metadata no longer says residential; company-name-only loading no longer claims cost defaults loaded.
- R3-12: monthly budgets intentionally retain cents because they multiply the rounded visit price by average annual visit frequency. Do not round the arithmetic a second time or claim a fixed monthly invoice.

## R3-3 disposition — release blocker, no waiver

The catalog tracking-statistics helper is fixed locally. The broader pre-existing privileged-function surface is NOT declared safe: `increment_user_usage(uuid)`, `get_user_usage_info(uuid)`, `get_user_current_usage(uuid)`, `can_user_create_proposal(uuid)`, template entitlement helpers and funnel/admin helpers require an infrastructure audit of direct grants and caller binding. A mass revoke without mapping legitimate authenticated/service-role callers could break subscription/usage accounting and onboarding. No such broad live action is authorized here.

Decision for this candidate: HOLD RELEASE until that dedicated audit and hardening are implemented and executed on the disposable target clone. Do not treat the new table owner guards as mitigation for those definer functions. `quality/service-catalog-round4/definer-inventory.sql` enumerates their bodies and ACLs and deliberately raises a release-blocking error while the known anonymous identity RPCs remain exposed. This is a local handoff document, not a sent external handoff and not acceptance of the vulnerability.

## Evidence limits

Claude independently executed a patched round-3 chain in sandbox Postgres 16 with an approximation of Supabase roles, plus 40 concurrent token views. That is valuable independent evidence, but it was not the unpatched committed candidate, an actual Supabase clone, CI execution or authenticated staging. The exact bootstrap/harness was requested for reproducibility. The target inventory, full role/definer matrix, email/hosted PDF, operators and founder gates remain mandatory. Release remains FAIL/not approved.

## Reproducible database checks

Claude supplied its exact original sandbox harness. A reviewed derivative is checked in at `quality/service-catalog-round4/db-harness/`: it applies the actual candidate migrations with scratch patches forbidden, loads synthetic fixtures, runs the original owner matrix plus full payload/legacy token/other-user insert-update/owner-write/version-guard assertions, injects bad policies, tests dirty historical events and repeat application, and runs 40 concurrent view calls. Added tests cover the fixed statistics RPC and service_role. Safety checks constrain every helper to a dedicated marked Unix-socket cluster and verify the server's data directory.

`.github/workflows/catalog-migrations.yml` wires those checks to a disposable PostgreSQL 16 cluster, followed by a mandatory definer-function gate. That final gate is EXPECTED TO FAIL while R3-3 remains exposed; behavioral success is not overall release success. This workflow has not been pushed, dispatched or executed by Codex. The original Claude harness execution must not be represented as execution of this derived harness.

## Codex local validation

505 tests in 57 suites and 5 snapshots pass; typecheck and production build pass. Shell syntax checks pass for the derived harness. Static mobile/desktop artifacts and local PDFs are regenerated under `quality/service-catalog-round4/`. Codex still has no local psql/Docker runtime, so it does not claim an executed database or GitHub CI run. Next independent review must execute the actual corrected chain without scratch patches and distinguish the expected R3-3 release-gate failure from migration/ownership behavior.
