# Supervised five-record pilot runbook

This runbook does not authorize or execute external actions.

1. Founder approves one pilot environment, records its nonsecret Supabase hostname, enables controlled writes, and records the approval reference in `operator/environments.json`.
2. Founder approves one geography and records its approval reference in `operator/geographies.json`.
3. Database owner reviews the unapplied SQL and dedicated worker-role design.
4. Confirm no incompatible earlier 100A schema exists in the pilot project.
5. After separate authorization, apply the approved SQL only to the pilot environment.
6. Issue a short-lived `veltex_100a_worker` JWT.
7. Configure a restricted Google Places key, quota, billing alert, and cost owner.
8. Run the focused Jest suite, full TypeScript validation, SQL/static checks, and diff/whitespace checks.
9. Run true no-call dry-run:
   `pnpm 100a:operator -- --mode=dry-run --geography=<approved-geography> --target=<approved-pilot-environment>`
10. Review the full redacted execution plan, credential-presence flags, effects, terms, and limits.
11. Run Google-only preview:
    `pnpm 100a:operator -- --mode=google-preview --geography=<approved-geography> --target=<approved-pilot-environment>`
12. Review discovered companies, exclusions, pagination warnings, request use, and expected cost. Confirm no Supabase activity.
13. Temporarily enable 100A and run controlled five-record write:
    `pnpm 100a:operator -- --mode=write --geography=<approved-geography> --target=<approved-pilot-environment> --confirm-target=<approved-pilot-environment> --confirm-writes=WRITE_MAX_5`
14. Review every canonical prospect, provider observation, identity disposition, diagnostic, cursor decision, and lock release.
15. Repeat the same approved input and verify provider-source idempotency and a fresh request budget.
16. Immediately unset/disable `VELTEX_100A_ENABLED` and destroy/expire the worker JWT.
17. Record accountable owners, counts, cost, anomalies, data quality, and the signed go/no-go result.

Stop on any missing approval, hostname mismatch, production target, excessive limit, unexpected client construction, secret exposure, external-system coupling, or more than five new records.
