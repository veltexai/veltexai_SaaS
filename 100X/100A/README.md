# 100A — Google Places Discovery

100A searches one geography per supervised manual run, normalizes and deterministically qualifies cleaning companies, resolves provider/source identity conservatively, writes canonical prospects plus traceable Google observations, and emits resilient diagnostics.

## Pilot defaults

- Disabled unless `VELTEX_100A_ENABLED=true`; `trigger` must be `manual`.
- Five new canonical prospects and five new source records maximum.
- 50 processed candidates, six Places requests, and one page per query maximum.
- Ten-minute duration under a fifteen-minute renewable lock.
- Capped and failed runs keep the cursor on the same geography; fully completed runs advance it.

The operator enforces named approved maxima before constructing any client: five canonical prospects, five source records, 50 candidates, six physical Places requests, exactly one page/query, at most ten minutes, and exactly a fifteen-minute lock TTL.

Environment overrides are explicit: `VELTEX_100A_MAX_NEW_PROSPECTS`, `VELTEX_100A_MAX_SOURCE_RECORDS`, `VELTEX_100A_MAX_CANDIDATES`, `VELTEX_100A_MAX_PLACES_REQUESTS`, `VELTEX_100A_MAX_PAGES_PER_SEARCH`, `VELTEX_100A_MAX_RUN_DURATION_MS`, and `VELTEX_100A_LOCK_TTL_MS`. Any pilot override requires operator approval.

The Places adapter has timeout, bounded retry/backoff for 429 and selected 5xx responses, permanent-4xx rejection, response validation, request tracking, and a page-token contract. Pilot pagination is disabled (`maxPagesPerSearch=1`); a returned token produces `search.pagination_omitted`, so coverage is never implied to be complete.

## Deployment boundary

The included SQL remains unapplied. The terminal-only command requires allowlisted, approved environment and geography records. The placeholder files are intentionally unapproved and contain no invented Supabase identifier. Production is rejected unconditionally.

Operator modes are exactly:

- `dry-run`: validates and prints a redacted plan; constructs no external client and performs no call, lock, diagnostic, or write.
- `google-preview`: warns about quota, calls only Google, and uses an in-memory repository/diagnostics path.
- `write`: requires the approved pilot environment, matching hostname, enable switch, target confirmations, five-write phrase, restricted credentials, and worker-role JWT.

All validation completes before Google or Supabase client construction. Output includes credential-presence booleans and approved nonsecret identities, never secret values. There is no route, browser surface, webhook, cron, schedule, outreach call, or production support.

Request accounting is run-scoped: the runner supplies remaining budget to every search and retries count as physical requests. The client retains only a per-search defensive maximum and can be safely reused for the idempotency replay.

Use `docs/PILOT_RUNBOOK.md` before any live action.
