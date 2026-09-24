import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260924000000_r0_privilege_hardening.sql',
  'utf8',
);

describe('R0 privilege hardening', () => {
  it('removes client readability from plaintext system settings', () => {
    expect(migration).toContain('drop policy if exists "Allow read access to system settings"');
    expect(migration).toContain('revoke all on table public.system_settings from public, anon, authenticated');
    expect(migration).toContain('grant select, insert, update, delete on table public.system_settings to service_role');
  });

  it('binds identity-parameter RPCs to the current caller', () => {
    expect(migration).toContain("auth.uid() is distinct from target_user");
    expect(migration).toContain("coalesce(auth.role(),'') <> 'service_role'");
    for (const name of [
      'get_user_current_usage',
      'can_user_create_proposal',
      'get_user_usage_info',
      'increment_user_usage',
      'can_user_access_template',
      'user_has_active_access',
      'get_user_accessible_templates',
    ]) {
      expect(migration).toContain(`create or replace function public.${name}`);
    }
  });

  it('restricts unowned maintenance routines to the service role', () => {
    expect(migration).toContain('revoke all on function public.update_template_usage(uuid) from public, anon, authenticated');
    expect(migration).toContain('revoke all on function public.handle_subscription_expiration() from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.update_template_usage(uuid) to service_role');
  });

  it('keeps lifecycle mutation service-only and fixes search paths', () => {
    expect(migration).toContain('revoke all on function public.start_user_trial(uuid,text) from public, anon, authenticated');
    expect(migration).toContain('grant execute on function public.start_user_trial(uuid,text) to service_role');
    expect(migration).toContain('set search_path = pg_catalog, public');
  });

  it('does not log the generated email prompt', () => {
    const route = fs.readFileSync('app/api/emails/generate/route.ts', 'utf8');
    expect(route).not.toContain('email generation prompt');
  });
});
