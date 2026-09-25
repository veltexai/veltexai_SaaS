import fs from 'node:fs';
import {
  buildSystemSettingsUpdate,
  mapStoredSystemSettingsToForm,
} from '@/lib/admin/system-settings';

const migration = fs.readFileSync(
  'supabase/migrations/20260924000000_r0_privilege_hardening.sql',
  'utf8',
);
const profilesPolicyMigration = fs.readFileSync(
  'supabase/migrations/20260924010500_fix_profiles_policy_recursion.sql',
  'utf8',
);
const profilesBrandingMigration = fs.readFileSync(
  'supabase/migrations/20260924011000_align_profiles_branding_columns.sql',
  'utf8',
);
const trackingDeliveryMigration = fs.readFileSync(
  'supabase/migrations/20260924012000_align_tracking_delivery_methods.sql',
  'utf8',
);
const trackedEngagementMigration = fs.readFileSync(
  'supabase/migrations/20260924013000_sync_tracked_engagement_fields.sql',
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

  it('removes the self-referential profiles admin policy', () => {
    expect(profilesPolicyMigration).toContain(
      'drop policy if exists "Admins can view all profiles" on public.profiles',
    );
    expect(profilesPolicyMigration).toContain('using (public.is_admin())');
    expect(profilesPolicyMigration).not.toContain('from public.profiles');
    expect(profilesPolicyMigration).not.toContain('from profiles');
  });

  it('keeps proposal branding schema aligned in fresh and preview databases', () => {
    expect(profilesBrandingMigration).toContain(
      'add column if not exists logo_url text',
    );
  });

  it('keeps lifecycle mutation service-only and fixes search paths', () => {
    expect(migration).toContain("if to_regprocedure('public.start_user_trial(uuid,text)') is not null then");
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

  it('keeps optional lifecycle email setup from failing a saved proposal', () => {
    const route = fs.readFileSync('app/api/proposals/route.ts', 'utf8');
    const firstEmailBlock = route.slice(
      route.indexOf('// First proposal: send congratulatory email'),
      route.indexOf('// All 3 free-trial proposals used'),
    );
    const trialExpiredBlock = route.slice(
      route.indexOf('// All 3 free-trial proposals used'),
      route.indexOf('const isFreeTrial'),
    );
    for (const block of [firstEmailBlock, trialExpiredBlock]) {
      expect(block.indexOf('try {')).toBeGreaterThanOrEqual(0);
      expect(block.indexOf('createServiceClientRaw(')).toBeGreaterThan(block.indexOf('try {'));
    }
  });

  it('supports an explicit local Chromium path without changing production PDF launch', () => {
    const route = fs.readFileSync('app/api/proposals/[id]/print/route.ts', 'utf8');
    expect(route).toContain(
      'process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined',
    );
    expect(route).toContain("if (process.env.NODE_ENV === 'production')");
    expect(route).toContain('executablePath: await chromium.executablePath()');
  });

  it('keeps the print page on the authenticated caller client', () => {
    const page = fs.readFileSync('app/print/proposals/[id]/page.tsx', 'utf8');
    const service = fs.readFileSync(
      'features/templates/services/print-data-service.ts',
      'utf8',
    );
    expect(page).toContain('getPrintPageData(supabase, id)');
    expect(service).not.toContain('createServiceClient');
    expect(service).toContain(
      'export async function getPrintPageData(supabase: PrintDataClient, id: string)',
    );
    expect(service).toContain(".from('proposals')\n    .select('*')");
    expect(service).toContain(".from('proposal_templates')");
    expect(service).toContain(".from('company_profiles')");
  });

  it('uses the real secure tracked-view route and exposes link delivery', () => {
    const route = fs.readFileSync('app/api/proposals/[id]/send/route.ts', 'utf8');
    const methods = fs.readFileSync(
      'features/proposals/constants/delivery-methods.ts',
      'utf8',
    );
    expect(route).toContain('proposalViewUrl = `${appUrl}/view/${trackingId}`');
    expect(route).not.toContain('/proposals/view/');
    expect(methods).not.toContain('Coming soon');
    expect(methods.match(/disabled: false/g)).toHaveLength(3);
    expect(trackingDeliveryMigration).toContain(
      "'pdf', 'online', 'pdf_only', 'online_only', 'both'",
    );
    expect(route).toContain('code: "TRACKING_SETUP_ERROR"');
    expect(route.indexOf('TRACKING_SETUP_ERROR')).toBeLessThan(
      route.indexOf('EmailService.sendEnhancedProposalEmail'),
    );
  });

  it('keeps tracked engagement compatible without a public service-role dependency', () => {
    const download = fs.readFileSync('app/api/proposals/[id]/download/route.ts', 'utf8');
    const click = fs.readFileSync('app/api/tracking/click/route.ts', 'utf8');
    expect(download).not.toContain('createServiceClient');
    expect(download).toContain('read_tracked_proposal');
    expect(download).toContain('tracked_proposal_has_paid_access');
    expect(download).toContain('record_tracked_download');
    expect(click).toContain("rpc('record_tracking_click'");
    expect(click).not.toContain(".from('proposal_click_tracking')");
    expect(trackedEngagementMigration).toContain('proposal_viewed = true');
    expect(trackedEngagementMigration).toContain('proposal_downloaded = true');
    expect(trackedEngagementMigration).toContain('security definer set search_path = pg_catalog, public');
    expect(trackedEngagementMigration).toContain('length(token) < 20');
    expect(trackedEngagementMigration).toContain("pr.subscription_status = 'active'");
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
    expect(api).toContain('buildSystemSettingsUpdate');
    expect(api).not.toContain('changes: data');
  });

  it('preserves stored operational values when an admin edits an unrelated field', () => {
    const defaults = {
      email_from_name: 'Veltex Services',
      email_from_address: 'noreply@veltexservices.com',
      ai_enabled: true,
      email_notifications_enabled: true,
      business_timezone: 'America/New_York',
      smtp_password: null,
    } as any;
    const form = mapStoredSystemSettingsToForm({
      smtp_from_name: 'Veltex AI',
      smtp_from_email: 'noreply@send.veltexai.com',
      enable_ai_suggestions: false,
      enable_email_notifications: false,
      default_timezone: 'America/Los_Angeles',
      smtp_password: 'must-not-reach-browser',
    }, defaults);

    expect(form).toMatchObject({
      email_from_name: 'Veltex AI',
      email_from_address: 'noreply@send.veltexai.com',
      ai_enabled: false,
      email_notifications_enabled: false,
      business_timezone: 'America/Los_Angeles',
      smtp_password: null,
    });

    const update = buildSystemSettingsUpdate({ ...form, company_name: 'New name' });
    expect(update).toMatchObject({
      company_name: 'New name',
      smtp_from_name: 'Veltex AI',
      smtp_from_email: 'noreply@send.veltexai.com',
      enable_ai_suggestions: false,
      enable_email_notifications: false,
      default_timezone: 'America/Los_Angeles',
    });
    expect(update).not.toHaveProperty('smtp_password');
  });
});
