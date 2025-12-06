import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SystemSettingsForm from '@/components/admin/system-settings-form';
import { SystemSettings } from '@/types/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const defaultSettings: SystemSettings = {
  id: '1',
  company_name: 'Veltex Services',
  company_logo_url: null,
  company_tagline: 'Professional Printing Solutions',
  primary_color: '#3b82f6',
  secondary_color: '#64748b',
  accent_color: '#f59e0b',
  email_from_name: 'Veltex Services',
  email_from_address: 'noreply@veltexservices.com',
  email_reply_to: null,
  smtp_host: null,
  smtp_port: 587,
  smtp_username: null,
  smtp_password: null,
  smtp_secure: true,
  max_login_attempts: 5,
  session_timeout: 30,
  password_min_length: 8,
  require_2fa: false,
  ai_enabled: true,
  pdf_generation_enabled: true,
  email_notifications_enabled: true,
  analytics_enabled: true,
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  business_timezone: 'America/New_York',
  maintenance_mode: false,
  maintenance_message: 'System is under maintenance. Please check back later.',
  theme_applied_to_pdfs: true,
  ai_attribution_enabled: true,
  proposal_tracking_enabled: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function checkAdminAccess() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return user;
}

async function fetchSystemSettings(): Promise<SystemSettings> {
  const supabase = createServiceClient();

  try {
    // In a real implementation, you would fetch from a system_settings table
    // For now, we'll return default settings as this would be server-side fetched
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching system settings:', error);
      return defaultSettings;
    }

    return data ? { ...defaultSettings, ...data } : defaultSettings;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return defaultSettings;
  }
}

export default async function SystemSettingsPage() {
  const currentUser = await checkAdminAccess();
  const settings = await fetchSystemSettings();

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
      </div>

      <SystemSettingsForm
        initialSettings={settings}
        defaultSettings={defaultSettings}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
