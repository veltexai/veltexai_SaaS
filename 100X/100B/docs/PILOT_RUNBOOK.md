# 100B supervised pilot runbook

This runbook does not authorize or execute external actions. Each step is separately approved.

1. Founder approves one nonproduction pilot environment for 100B and records its nonsecret Supabase
   hostname, enables controlled writes, and records the approval reference in `operator/environments.json`.
   (The pilot may reuse the isolated 100A pilot project `wzpgbbwdqtpyfiojowdj.supabase.co`.)
2. Database owner reviews `database/002_contact_enrichment.sql` and the dedicated `veltex_100b_worker`
   role. Confirm 100A `001` is already applied and that no incompatible 100B objects exist.
3. After separate authorization, apply `002` to the pilot project only. Verify tables, indexes,
   the unique `(provider, provider_record_id)` constraint, the worker role flags, the four 100B
   policies plus the additive `internal_prospects_100b_read` policy, and the six `SECURITY DEFINER`
   functions.
4. Issue a short-lived `veltex_100b_worker` JWT; supply it only as `SUPABASE_100B_WORKER_JWT`.
5. For the first pilot, prepare a **human-approved, verified contact fixture/CSV** keyed to the five
   100A prospect IDs (the fixture provider). A live Apollo run is a later, separately-authorized step.
   Note the two distinct, non-interchangeable preview inputs: `fixture-preview` reads synthetic
   `operator/enrichment-fixtures.json` (reserved `example.com`), while `provider-preview` reads the
   approved real-company file `operator/provider-preview-targets.json` (real 100A domains, nonsecret,
   no contacts). Keep the approved target file reviewed and current; unknown prospect IDs are rejected
   before any Apollo client is built, and provider-preview processes at most two companies with no
   Supabase client, no write, and redacted output (no email/phone/name printed).
6. Run the true dry run:
   `pnpm 100b:operator -- --mode=dry-run --target=<approved-environment>`
   Confirm `validated-no-call`, zero clients, zero writes.
7. Run the fixture preview and review every proposed contact, role classification, eligibility state,
   and reason:
   `pnpm 100b:operator -- --mode=fixture-preview --target=<approved-environment>`
8. (Optional, later) Provider preview for live Apollo reads without any Supabase write:
   `pnpm 100b:operator -- --mode=provider-preview --provider=apollo --target=<approved-environment> --prospects=<id,id>`
   This runs Apollo's **two-stage** flow (People Search → People Enrichment; see `docs/APOLLO.md`)
   for at most two companies, one search + at most three work-email enrichments per company, with
   phone, personal-email, and waterfall enrichment disabled and no webhook. It consumes Apollo
   credits (≈1 per returned work email). Before this step, confirm the Apollo key carries only the
   `mixed_people_api_search` and `people_match` capabilities and has sufficient credit balance. A
   search result alone is never outreach-ready; only a verified enrichment email is.
9. Temporarily enable 100B and run the capped controlled write:
   `pnpm 100b:operator -- --mode=controlled-write --provider=fixture --target=<approved-pilot-environment> \`
   `  --prospects=<id,id> --confirm-target=<approved-pilot-environment> --confirm-writes=CONTACTS_MAX_10`
10. Review every stored contact, source, eligibility disposition, suppression status, diagnostic,
    cursor decision, and lock release. Confirm no more than the approved caps were written.
11. Immediately unset/disable `VELTEX_100B_ENABLED` and destroy/expire the worker JWT.
12. Record accountable owners, counts, provider cost, data quality, and the go/no-go result.

Stop on any missing approval, hostname mismatch, production target, excessive limit, unexpected
client construction, secret exposure, fabricated email, or external-system coupling.
