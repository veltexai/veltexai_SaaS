# R2 isolated Supabase verification harness

Status: **PREPARED — NOT EXECUTED**

Candidate: fourth-remediation commit produced from `dcf56ce`

This directory is the bounded hosted-verification plan for R2 organization and
tenancy. It does not apply migrations, discover credentials, send email, deploy,
or touch production. Run it only against a disposable isolated Supabase preview
after the exact candidate migration has been applied.

## Required evidence

1. Record pre-migration counts and SHA-256 digests for proposal content.
2. Apply the unmodified candidate through
   `20260925002000_r2_organization_tenancy.sql`.
3. Run `./run-hosted.sh` with an isolated preview database URL.
4. Run `./run-last-owner-concurrency.sh` against the same preview.
5. Complete `HOSTED_APP_CHECKLIST.md` through the preview application/Auth
   surface. SQL simulation is not proof of signup, send, PDF, or tracked-link
   behavior.
6. Save redacted output under an evidence directory. Never commit connection
   strings, JWTs, customer content, or email addresses.

## Matrix covered by SQL

- two organizations;
- owner, uninvited-role candidates, non-member, anonymous and service-role paths;
- fail-closed denial of arbitrary service-role membership creation;
- same-tenant permissions and cross-tenant read/write denials;
- hostile `active_organization_id` input;
- immutable organization and creator attribution;
- final-owner protection;
- append-only audit records;
- browser denial for outbox/inbox and service-role inbox idempotency/conflict;
- fail-closed backfill/orphan checks and proposal-content digest reporting.

All SQL fixtures use reserved `.test` addresses and execute inside a transaction
that rolls back. The separate concurrency test creates one synthetic organization
and deletes it after the assertion; interruption cleanup instructions are printed
by the runner.

## Usage

```bash
export R2_PREVIEW_DATABASE_URL='postgresql://...isolated-preview...'
export R2_EXPECTED_PROJECT_REF='the-isolated-preview-ref'
./quality/r2-hosted-verification-20260925/run-hosted.sh
./quality/r2-hosted-verification-20260925/run-last-owner-concurrency.sh
```

The runners reject the production project reference
`iwoaaljitifloolszxlu`, require an expected preview reference, and refuse a URL
that does not contain that reference. They never apply the migration.
