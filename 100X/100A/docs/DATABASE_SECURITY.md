# Database authorization and deployment

The authorization strategy is resolved: 100A uses a dedicated `veltex_100a_worker` Postgres JWT role through Supabase/PostgREST. The operator command deliberately rejects a `service_role` JWT and never consumes `SUPABASE_SERVICE_ROLE_KEY`.

The unapplied SQL creates the `NOLOGIN NOINHERIT NOBYPASSRLS` worker role and grants it to `authenticator`. RLS policies allow only:

- reading canonical prospects, source observations, and the 100A workflow row;
- inserting 100A diagnostics; and
- executing six fixed-search-path mutation functions.

The worker has no direct canonical, source, or workflow mutation grants. `SECURITY DEFINER` functions own those writes and are revoked from public/anonymous/authenticated roles. Persistence and source-touch functions require the live run-owned lock; lock renewal, release, and cursor movement also require the matching run id. The persistence function accepts only `google_places` observations.

## Worker JWT

Create a short-lived server-side JWT whose role claim is exactly `veltex_100a_worker`, using the approved Supabase signing process. Supply it only as `SUPABASE_100A_WORKER_JWT` to the terminal operator. The anon key is used only as the PostgREST API key; authorization comes from the worker JWT. Never store either credential in the repository or expose the worker JWT to browser code.

Before applying SQL, the database owner must verify function ownership, `authenticator` membership, grants, policies, token expiry, rotation, audit access, backups, and incident response in the target pilot project. No migration has been applied by this work.

The approved environment record must bind its stable ID to the exact Supabase URL hostname. Write preflight compares the configured URL hostname before client construction. The initial `pilot-placeholder` is deliberately unapproved, disallows writes, and has no hostname or approval reference; a founder/database owner must replace those placeholders with real reviewed values. Production entries are rejected regardless of flags or matching strings.
