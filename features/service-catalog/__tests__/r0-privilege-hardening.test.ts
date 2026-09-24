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
    expect(migration).toContain("current_setting('role', true) = 'service_role'");
    expect(migration).toContain("session_user in ('service_role','postgres','supabase_admin')");
    expect(migration).not.toContain("current_user not in ('service_role','postgres','supabase_admin')");
    expect(migration).not.toContain("auth.role(),'') <> 'service_role'");
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
    const service = fs.readFileSync('lib/email/service.ts', 'utf8');
    expect(service).not.toContain('EmailService: Data:');
  });

  it('keeps system settings and the stored SMTP password server-side', () => {
    const page = fs.readFileSync('app/admin/system-settings/page.tsx', 'utf8');
    const form = fs.readFileSync('features/admin/components/system-settings-form.tsx', 'utf8');
    const branding = fs.readFileSync('features/admin/components/enhanced-branding-settings.tsx', 'utf8');
    const api = fs.readFileSync('app/api/admin/system-settings/route.ts', 'utf8');
    expect(page).toContain('smtp_password: null');
    expect(form).not.toContain("from('system_settings')");
    expect(branding).not.toContain('from("system_settings")');
    expect(api).toContain('createServiceClient()');
    expect(api).toContain("delete nextSettings.smtp_password");
    expect(api).toContain("const editableColumns = [");
    expect(api).not.toContain('changes: data');
  });
});
