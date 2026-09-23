/** Static contract checks only: these do NOT establish executed RLS behavior. */
import fs from 'fs';
const migration = fs.readFileSync('supabase/migrations/20260922010000_catalog_remediation.sql', 'utf8');
it('revokes anonymous raw table/column access and pins definer search paths', () => {
  expect(migration).toContain('revoke all on public.proposals, public.proposal_tracking from anon, public');
  expect(migration).toContain('revoke select (%I)');
  expect(migration).toContain('set search_path = pg_catalog, public');
});
it('public projection has an allowlist rather than raw row serialization', () => {
  const projection = migration.split('create or replace function public.read_tracked_proposal')[1].split('create or replace function public.record_tracked_view')[0];
  expect(projection).not.toMatch(/to_jsonb\(p\)|'service_specific_data'|'client_email'|'estimateSnapshot'/);
  expect(projection).toContain("'price_range',p.pricing_data->'price_range'");
});
it('view counters resolve their target from the token and increment atomically', () => {
  expect(migration).toContain('where tracking_id=token and track_opens returning proposal_id into target');
  expect(migration).toContain('view_count=coalesce(view_count,0)+1');
  const route = fs.readFileSync('app/api/tracking/view/[trackingId]/route.ts', 'utf8');
  expect(route).not.toContain('request.json');
  expect(route).toContain("rpc('record_tracked_view'");
});
it('candidate refuses unreviewed owner-policy expressions and installs restrictive PUBLIC gates', () => {
  expect(migration).toContain('as restrictive for all to public');
  expect(migration).toContain('pg_get_expr(pol.polqual,pol.polrelid)');
  expect(migration).toContain("raise exception 'Unreviewed policy");
  expect(migration).toContain("rolname in ('anon','authenticated')");
});
it('restores token-resolved history and counts catalog previews without validating unknown historical events', () => {
  expect(migration).toContain('insert into public.proposal_views (proposal_id,tracking_token) values (target,gen_random_uuid()::text)');
  expect(migration).toContain(')) not valid;');
  expect(migration).toContain("e.event_name in ('proposal_generate_succeeded','catalog_previewed')");
});
