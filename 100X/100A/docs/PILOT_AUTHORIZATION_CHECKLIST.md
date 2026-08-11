# 100A Seattle pilot — authorization checklist

Status date: 2026-08-08. Database foundation applied; no discovery/write/credential action has occurred.

## Geography
- Seattle, WA (`seattle-wa`) is **approved** — `100A-SEATTLE-PILOT-APPROVED-2026-08-07`. Single-metro scope only.

## Environment — APPROVED (`operator/environments.json`)
- id `100a-pilot` · label `100A Seattle Pilot` · type `pilot` · hostname `wzpgbbwdqtpyfiojowdj.supabase.co`
- approved `true` · controlledWritesAllowed `true` · ref `100A-PILOT-ENV-APPROVED-2026-08-07`
- Org **Veltex AI 100A Pilot** (Free), region **West US (Oregon)** `us-west-2`, ref `wzpgbbwdqtpyfiojowdj`. Isolated from the production app.

## Database foundation — APPLIED (2026-08-08)
- Migration `001_prospect_intelligence_foundation.sql` applied once (approval `100A-PILOT-MIGRATION-APPROVED-2026-08-08`).
- 4 tables (RLS on), 12 indexes, worker role + 4 policies + 6 SECURITY DEFINER functions verified. Records: 0/0/0. Workflow: 100A/cursor 0/unlocked. Security Advisor: 0/0/0.
- Worker JWT **not yet issued**. Google credential **not yet configured**. Google preview / write **not yet executed**.
- No secret (password/anon key/service-role key/JWT/token) is stored in the repository.

## Approved pilot limits (unchanged; enforced by `APPROVED_PILOT_LIMITS`)
5 new prospects · 5 source records · 50 candidates · 6 Places requests · 1 page/query · 600,000 ms runtime · 900,000 ms lock TTL. Production rejected unconditionally; no scheduled execution.

## Founder approvals
- [x] Seattle geography — approved (`100A-SEATTLE-PILOT-APPROVED-2026-08-07`)
- [x] Pilot environment `100a-pilot` — approved (`100A-PILOT-ENV-APPROVED-2026-08-07`)
- [x] Supabase hostname — recorded (`wzpgbbwdqtpyfiojowdj.supabase.co`)
- [x] Controlled database writes — authorized at config level
- [x] Pilot migration — approved + applied (`100A-PILOT-MIGRATION-APPROVED-2026-08-08`)
- [x] Google preview — passed (2 requests; relevant Seattle cleaning companies)
- [x] Five-record write pilot — PASSED (5 prospects, 5 sources, 21 diagnostics; lock released; JWT deleted)

## Technical prerequisites
- [x] SQL reviewed (independent verification; ephemeral PG16 59/59)
- [x] Environment recorded/approved; env/geography pairing validated
- [x] True dry run passed (validated-no-call, 0 clients, 0 writes)
- [x] Existing-schema preflight completed on the pilot project (was empty)
- [x] Pilot migration applied to the pilot project (verified; 0 records)
- [x] Database owner assigned
- [x] Operator assigned
- [x] Restricted Google Places API key configured (Places API New only)
- [x] Google billing alert configured ($5 budget alert; not a hard cap)
- [x] Short-lived `veltex_100a_worker` JWT issued (and deleted after pilot)
- [x] Google preview passed
- [x] Five-record write configuration confirmed

## Pilot success criteria (pass only if ALL hold)
1. No more than five canonical prospects created.
2. No more than five provider-source records created.
3. At least four of five stored prospects are legitimate cleaning companies.
4. No obvious non-cleaning business accepted.
5. No duplicate provider source created.
6. Replaying the same discovery input creates no duplicate source record.
7. Ambiguous identity matches held for review.
8. Locks are released.
9. Cursor behavior matches the documented capped/success policy.
10. No email or downstream outreach action occurs.
11. No Instantly, Apollo, HubSpot, or Data Axle integration runs.
12. Workflow disabled immediately after the pilot.
13. Cost and data quality documented.
