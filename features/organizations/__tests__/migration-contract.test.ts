import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    'supabase/migrations/20260925002000_r2_organization_tenancy.sql',
  ),
  'utf8',
);

describe('R2 tenancy migration contract', () => {
  it('binds authorization helpers to auth.uid instead of a user parameter', () => {
    expect(migration).toContain('m.user_id = auth.uid()');
    expect(migration).not.toMatch(/is_organization_member\([^)]*user/i);
    expect(migration).not.toMatch(/organization_role\([^)]*user/i);
  });

  it('keeps legacy attribution while adding mandatory proposal tenancy', () => {
    expect(migration).toContain(
      'alter table public.proposals add column organization_id',
    );
    expect(migration).toContain(
      'alter table public.proposals alter column organization_id set not null',
    );
    expect(migration).not.toContain('drop column user_id');
    expect(migration).toContain('alter table public.company_profiles alter column organization_id set not null');
    expect(migration).toContain('alter table public.user_branding_settings alter column organization_id set not null');
  });

  it('makes infrastructure records non-writable by browser roles', () => {
    expect(migration).toContain(
      'revoke insert, update, delete on public.organization_audit_log from anon, authenticated',
    );
    expect(migration).toContain(
      'revoke all on public.organization_event_outbox from public, anon, authenticated',
    );
    expect(migration).toContain(
      'revoke all on public.organization_event_inbox from public, anon, authenticated',
    );
  });

  it('prevents tenant reassignment and preserves at least one owner', () => {
    expect(migration).toContain('organization ownership cannot be changed in place');
    expect(migration).toContain('organization must retain at least one owner');
    expect(migration).toContain('only an owner can grant owner role');
    expect(migration).toContain('only an owner can revoke owner role');
  });

  it('writes audit and outbox records in the source transaction', () => {
    expect(migration).toContain('create function public.record_organization_change()');
    expect(migration).toContain('insert into public.organization_audit_log');
    expect(migration).toContain('insert into public.organization_event_outbox');
  });

  it('replaces the legacy restrictive creator-only guards with tenant guards', () => {
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposals');
    expect(migration).toContain('public.is_organization_member(organization_id)');
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposal_tracking');
    expect(migration).toContain('drop policy if exists catalog_owner_guard on public.proposal_views');
  });
});
