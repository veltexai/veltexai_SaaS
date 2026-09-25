# Authenticated HTTP/application staging checkpoint

Base: `ded6a10`, 2026-09-24 Pacific. Existing preview: `wcnfhriosemgchmtwgof`.
Completed schema restoration, R0 migration and SQL role/ACL checks were preserved and not repeated.

## Access status

The in-app browser reaches the existing preview; Supabase reports Healthy.
No preview-only environment file was found in the candidate worktree. Its process environment has no NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_APP_URL. No staging application URL has been supplied. A URL or local configuration path was requested; never paste credentials into chat. Production/pilot keys and the production Gmail transport are not staging substitutes.

Pending: provision or identify the candidate app bound exclusively to this preview, synthetic owner/other/admin test sessions and a non-delivering/captured test email transport. Then execute authenticated HTTP/PostgREST, admin settings, create/edit/reopen/status, tracked-recipient link, print/PDF, test email and responsive acceptance. All are NOT RUN at this checkpoint, not failures or passes inferred from SQL tests.

## New release blocker: legacy definer view

Read-only preview metadata query verified `public.enhanced_proposals`:

- owner `postgres`; reloptions NULL (no security_invoker);
- anonymous SELECT true; authenticated SELECT true;
- definition selects proposal identity, client email/phone, service_specific_data, global_inputs, pricing_data, generated_content and related company/pricing fields, with no owner filter.

The Supabase dashboard flagged the same view. Migration 021 creates it and grants both client roles access. Search across app/features/lib/queries found no application reference. R0/table grants do not revoke view privileges, so prior table/RPC tests do not close this path. No customer rows were selected; HTTP exploitation is not claimed.

Local remediation added: `20260924010000_restrict_legacy_proposal_view.sql` sets caller-RLS behavior, revokes table and column privileges from PUBLIC/anon/authenticated, retains service-role SELECT, and preserves the view. `legacy-proposal-view-assertions.sql` checks the result without row access. Migration and focused assertions executed successfully on the existing preview in one transaction; result: `legacy proposal view access restricted`. Independent review and authenticated HTTP verification remain pending. Roll forward on failure; do not restore unsafe browser grants as rollback. No production change was made.

Release remains blocked pending execution/review of this fix and the authenticated staging/operator/founder gates. Preview stays retained as directed.
