# 100D stable pilot deployment runbook (preparation — do NOT deploy yet)

This runbook prepares a **stable, isolated pilot deployment** of the two disabled-by-default 100D
endpoints. Nothing here is executed in this phase. No deploy, no hosted env change, no new JWT, no webhook,
no event, no campaign, no email. `VELTEX_100D_ENABLED` stays `false` until the endpoint + secret config is
verified. Secrets are entered directly into the host's secret store — never printed, committed, or shared
in chat.

## Recommended target — a dedicated, isolated Vercel *pilot* project
The app deploys on **Vercel** (`vercel.json`, Next.js). The **safest** target is a **separate Vercel
project** linked to the same Git repo (pilot branch), kept fully apart from the production project:
- Reuses existing infrastructure (Vercel + the repo) — no new platform, no unnecessary infra.
- Physically isolated from production: its own env, its own URL. The **production** project is untouched,
  so C1–C7, production billing, proposal generation, and existing customer data cannot be affected.
- 100D is pinned in code to the **pilot Supabase only** (`wzpgbbwdqtpyfiojowdj.supabase.co`) and is
  disabled by default, so even a misconfiguration cannot reach production data.
- Enable **Vercel Deployment Protection** (Vercel Authentication) on the pilot project so the endpoint URL
  is not publicly reachable until the webhook is registered under separate authorization.

Do **not** deploy 100D into the production Vercel project: that would put the pilot ingestion surface on
production and ship the current in-progress branch to prod.

> Cron note: `vercel.json` declares the production cron `/api/cron/trial-automation`. On the pilot project,
> either leave it without the Stripe/production env it needs (it no-ops) or remove that cron in the pilot
> project settings. Do not modify `vercel.json` (production uses it).

## Why this is safe (isolation confirmed)
- The routes import only `100X/100D/*`, the 100C allowlist JSON, `@supabase/supabase-js`, `next/server`,
  and `node:crypto` — nothing from Stripe, billing, proposals, email, or C1–C7.
- All DB writes go through the migration-004 `SECURITY DEFINER` functions as the least-privilege
  `veltex_100d_ingest` role (EXECUTE-only; no table access, no service-role key).
- 100D reads **dedicated** pilot Supabase env vars and validates the host is exactly the approved pilot,
  failing closed otherwise. It never reads the shared `NEXT_PUBLIC_SUPABASE_URL` (production).

## Environment variables (set in the Vercel pilot project — values redacted)
| Variable | Value | Notes |
|---|---|---|
| `VELTEX_100D_ENABLED` | `false` | Keep false until verified; flip to `true` only under separate authorization. |
| `VELTEX_100D_SUPABASE_URL` | `https://wzpgbbwdqtpyfiojowdj.supabase.co` | Pilot project (not secret). Host is enforced in code. |
| `VELTEX_100D_SUPABASE_ANON_KEY` | `<pilot anon/publishable key>` | Pilot project's anon key (Supabase → pilot → Settings → API). RLS-protected. |
| `VELTEX_100D_WEBHOOK_SECRET` | `<redacted>` | The kept `veltex-100d-webhook-secret`. Store as an Encrypted env var. ≥16 chars. |
| `VELTEX_100D_INGEST_JWT` | `<redacted>` | A `veltex_100d_ingest`-role JWT signed with the pilot JWT secret. See JWT-longevity note. |
| `VELTEX_100D_MAX_BODY_BYTES` | `65536` | Optional (default 64 KiB). |

Never set `SUPABASE_SERVICE_ROLE_KEY` for 100D. Never set `NEXT_PUBLIC_SUPABASE_URL` to the pilot on the
production project.

> JWT longevity: the test used a 30-minute token. A stable endpoint needs a **longer-lived, rotatable**
> `veltex_100d_ingest` JWT (e.g. mint with a longer `exp` and rotate on a schedule), OR a later enhancement
> that mints a short-lived token per request from the JWT signing secret. Decide before enabling; the
> minting step is founder-run and is **not** performed in this phase.

## Deployment steps (execute later, each still gated — listed for copy-paste)
1. In Vercel, **create a new Project** from the repo, name it e.g. `veltex-100d-pilot`, target the pilot
   branch. Do not link it to the production project's env.
2. Add the environment variables above (Production scope of the *pilot* project). Keep
   `VELTEX_100D_ENABLED=false`.
3. Enable **Deployment Protection → Vercel Authentication** (or a protection password) so the URL is private.
4. Deploy. Then verify (endpoint stays disabled → 404):
   ```bash
   BASE="https://<pilot-project>.vercel.app"
   # disabled feature flag -> 404
   curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/internal/100x/instantly/events" -H 'content-type: application/json' -d '{}'
   ```
   Expect `404` (feature disabled). No auth needed to confirm the flag gate.
5. Verify the build succeeded and the two routes exist in the deployment's function list
   (`/api/internal/100x/instantly/events`, `/api/internal/100x/customer-status`).
6. **STOP.** Enabling the endpoint (`VELTEX_100D_ENABLED=true`), minting the durable ingest JWT, and
   registering the Instantly webhook are each **separate founder-authorized** actions. Fail-closed behavior
   for every condition is already proven by the test suite (see report).

## Fail-closed behavior (verified by tests — no live calls needed)
| Condition | Result |
|---|---|
| disabled feature flag | `404` |
| missing / incorrect webhook secret | `401` |
| wrong / missing content type | `415` |
| oversized body | `413` |
| invalid / non-object payload | `400` |
| wrong workspace / wrong campaign | `403` (allowlist reject) |
| missing/invalid ingest JWT, or non-pilot Supabase project | `503` (pinned-target guard) |
| provider/DB failure | `502` (generic, fail closed) |
| duplicate event | `200 {"outcome":"duplicate"}` — no second effect |

## Rollback steps
- Set `VELTEX_100D_ENABLED=false` (routes immediately 404) — the primary kill switch.
- If a webhook was registered (later phase): remove it in Instantly first.
- To fully retire: delete the Vercel pilot project (production is untouched). Migration 004 is additive and
  can be reversed independently (drop the 4 tables + 6 functions + `veltex_100d_ingest` role; 001–003 stay
  intact) — see `100X/100D/docs/SECURITY.md`.
- Rotate `veltex-100d-webhook-secret` / the ingest JWT if either is suspected exposed.

## Remaining founder approvals (each separate)
Enable the flag · mint the durable ingest JWT · register the Instantly webhook · begin 100E. None are done
here.
