# 100B database authorization

100B uses a dedicated `veltex_100b_worker` Postgres JWT role through Supabase/PostgREST. The operator
rejects a `service_role` JWT and never consumes `SUPABASE_SERVICE_ROLE_KEY`.

`database/002_contact_enrichment.sql` (unapplied) creates the `NOLOGIN NOINHERIT NOBYPASSRLS` worker
role, grants it to `authenticator`, and applies RLS to all four new tables. The worker may only:

- read canonical contacts, contact source records, the 100B workflow row, and — read-only — the 100A
  `internal_prospects` company table (via an **additive** policy that does not alter 100A's own policy);
- insert 100B diagnostics; and
- execute six fixed-search-path `SECURITY DEFINER` mutation functions.

The worker has no direct contact/source/workflow mutation grants and no read on diagnostics.
`persist_100b_contact` and `touch_100b_source` require the live run-owned lock; lock renewal, release,
and cursor movement require the matching run id. `persist_100b_contact` accepts only approved contact
providers (`apollo`, `data_axle`, `csv_import`, `referral`, `fixture`) and is atomic: a duplicate
`(provider, provider_record_id)` raises `23505` and leaves no orphan contact.

## Relationship to 100A
100B does **not** weaken 100A. It adds a new role and a read-only policy/grant on `internal_prospects`
so the enrichment worker can see the companies it enriches. 100A's tables, role, policies, grants, and
functions are unchanged (verified: 100A regression tests remain green and an ephemeral-Postgres run
confirmed 100A objects intact after applying `002`).

## Worker JWT
Create a short-lived server-side JWT whose role claim is exactly `veltex_100b_worker`, using the
approved Supabase signing process. Supply it only as `SUPABASE_100B_WORKER_JWT` to the terminal
operator. Never store either credential in the repository or expose it to browser code. Before
applying SQL, verify function ownership, `authenticator` membership, grants, policies, token expiry,
rotation, audit access, and backups in the target pilot project.
