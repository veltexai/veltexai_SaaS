# 100C supervised pilot runbook

This runbook does not authorize or execute external actions. Each step is separately approved. No live
Instantly call, lead, email, migration, JWT, webhook, schedule, or production action occurs in this phase.

## Pilot status — 2026-08-10 (read-only infrastructure verification)
Completed under founder authorization `100C-INSTANTLY-PILOT-CAMPAIGN-APPROVED-2026-08-09`:
- **Environment** `100c-pilot` approved (`100C-PILOT-ENV-APPROVED-2026-08-09`), Supabase hostname
  `wzpgbbwdqtpyfiojowdj.supabase.co`, `controlledWritesAllowed: false` (this assignment is read-only).
- **Migration `003`** applied to the `100c-pilot` project only. Verified: 8 tables + RLS, 9
  fixed-search-path `SECURITY DEFINER` functions, `veltex_100c_worker` read-only on the suppression
  registry, empty locks, and 0 configs/assignments/mappings/attempts at apply time. Supabase Security
  Advisor: 0 errors / 0 warnings (2 benign info items — intentional deny-all RLS). 001/002 intact.
- **Campaign** "Veltex AI 100C Pilot — No Send" created directly in Instantly and verified live as
  **Draft (status 0)** with zero leads, no sequence, and an empty schedule. Its `organization` (workspace)
  matches the pinned `expectedWorkspaceId`.
- **Allowlist + DB config** seeded and cross-checked: `operator/campaigns.json` (approved + active,
  caps 1/1, allowed states Draft/Paused) matches the `campaign_configs` row exactly
  (`config_matches_file = 1`); registry/assignments/mappings/attempts/diagnostics all 0; workflow-state row present.

**Pending (separately gated, run by the founder on the Mac):** least-privilege Instantly key
(`campaigns:read`, `leads:create`, `leads:read`) in Keychain; short-lived `veltex_100c_worker` JWT in
Keychain; the read-only `provider-preview` run; then the post-preview DB re-verification. Controlled-write
is **not** authorized by this assignment.

1. Founder approves one nonproduction pilot environment for 100C and records its nonsecret Supabase
   hostname, enables controlled writes, and records the approval reference in `operator/environments.json`
   (may reuse the isolated 100A/100B pilot project). Until then the environment stays unapproved and
   every mode fails closed.
2. Founder creates a dedicated **Veltex AI test campaign** in Instantly, leaves it **Draft or Paused**,
   and records its internal config id, Instantly campaign id, label, segment, allowed states
   (`draft`/`paused`), daily + total pilot caps, and approval reference in `operator/campaigns.json`
   (`approved: true`, `active: true`). Also seed the matching row in `campaign_configs` after `003`.
3. Database owner reviews `database/003_instantly_campaign_sync.sql` and the `veltex_100c_worker` role.
   Confirm 001 and 002 are applied and no incompatible 100C objects exist. After separate authorization,
   apply `003` to the pilot project only; verify the eight tables, RLS, the unique
   `(contact_id, campaign_config_id)` constraint, the worker-role flags, the additive read policies, and
   the nine `SECURITY DEFINER` functions.
4. Issue a short-lived `veltex_100c_worker` JWT; supply it only as `SUPABASE_100C_WORKER_JWT`. Confirm the
   Instantly API key carries only `campaigns:read` + `leads:create` (+ `leads:read` for reconciliation)
   and has an available plan. Supply the key only as `INSTANTLY_API_KEY` at runtime.
5. True dry run: `pnpm 100c:operator -- --mode=dry-run --target=<env>` — confirm `validated-no-call`,
   zero clients, zero writes.
6. Fixture preview: `pnpm 100c:operator -- --mode=fixture-preview --provider=fixture --target=<env>` —
   review every recheck outcome and the redacted digest offline.
7. Provider preview (read-only): `pnpm 100c:operator -- --mode=provider-preview --provider=instantly
   --target=<env> --campaign=<cfg>` — confirms the live campaign is Draft/Paused (pilot-safe) and creates
   no lead. It consumes one `campaigns:read` request.
8. Controlled write (≤1 lead) — only after every gate:
   `pnpm 100c:operator -- --mode=controlled-write --provider=instantly --target=<env> --campaign=<cfg> \`
   `  --confirm-target=<env> --confirm-campaign=<cfg> --confirm-writes=LEADS_MAX_1` with
   `VELTEX_100C_ENABLED=true`. Review the single submission, the lead mapping, every attempt, and the
   reconciliation status.
9. Immediately unset/disable `VELTEX_100C_ENABLED` and destroy/expire the worker JWT and Instantly key.
10. Record accountable owners, counts, provider request usage, deliverability, and the go/no-go result.

Stop on any missing approval, hostname mismatch, production target, non-Draft/Paused campaign state,
unapproved campaign id, wrong workspace, excessive limit, unexpected client construction, secret
exposure, or ambiguous outcome that cannot be reconciled.
