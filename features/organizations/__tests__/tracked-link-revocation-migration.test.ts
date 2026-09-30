import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260925010000_tracked_link_revocation.sql',
  'utf8',
);
const definerGate = fs.readFileSync(
  'quality/service-catalog-round4/db-harness/sql/30_assertions.sql',
  'utf8',
);

describe('tracked proposal link revocation migration', () => {
  it('adds nullable evidence fields without invalidating legacy links', () => {
    expect(migration).toContain('add column if not exists revoked_at timestamptz');
    expect(migration).toContain('add column if not exists revoked_by uuid references public.profiles(id) on delete set null');
    expect(migration).toContain('add column if not exists revocation_reason text');
    expect(migration).not.toMatch(/alter column revoked_(at|by) set not null/);
  });

  it('allows only authenticated organization managers to revoke idempotently', () => {
    const rpc = migration.split('create or replace function public.revoke_tracked_proposal_link')[1]
      .split('create or replace function public.read_tracked_proposal')[0];
    expect(rpc).toContain('security definer');
    expect(rpc).toContain('set search_path = pg_catalog, public');
    expect(rpc).toContain('auth.uid() is null');
    expect(rpc).toContain('public.can_manage_organization(tenant_id)');
    expect(rpc).toContain('if existing_revoked_at is not null then return true');
    expect(rpc).toContain("'proposal_tracking.revoked'");
    expect(rpc).not.toContain('tracking_id');
    expect(migration).toContain('revoke all on function public.revoke_tracked_proposal_link(uuid,uuid,text) from public, anon');
    expect(migration).toContain('grant execute on function public.revoke_tracked_proposal_link(uuid,uuid,text) to authenticated');
    expect(definerGate).toContain("'revoke_tracked_proposal_link(uuid,uuid,text)'");
  });

  it.each([
    'read_tracked_proposal',
    'read_tracked_proposal_print',
    'record_tracked_view',
    'record_tracked_download',
    'record_tracking_click',
    'record_tracking_metric',
    'tracked_proposal_has_paid_access',
  ])('%s rejects revoked tokens inside the definer boundary', (name) => {
    const start = migration.indexOf(`function public.${name}(`);
    expect(start).toBeGreaterThan(-1);
    const bodyEnd = migration.indexOf('$$;', start);
    expect(migration.slice(start, bodyEnd)).toContain('revoked_at is null');
  });

  it('does not restore direct tracking mutation to browser roles', () => {
    expect(migration).not.toMatch(/grant\s+(?:update|delete|all)[^;]*proposal_tracking[^;]*(?:anon|authenticated)/i);
  });
});
