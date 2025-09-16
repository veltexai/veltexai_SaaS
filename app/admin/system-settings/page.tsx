import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import SystemSettingsForm from '@/components/admin/system-settings-form';

interface SystemSettings {
  // Branding
  company_name: string;
  company_logo_url: string;
  company_tagline: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;

  // Email Settings
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_from_email: string;
  smtp_from_name: string;

  // Security
  session_timeout: number;
  password_min_length: number;
  require_2fa: boolean;
  max_login_attempts: number;

  // Features
  enable_ai_suggestions: boolean;
  enable_auto_backup: boolean;
  enable_email_notifications: boolean;
  enable_sms_notifications: boolean;

  // Business
  default_currency: string;
  default_timezone: string;
  business_hours_start: string;
  business_hours_end: string;

  // Maintenance
  maintenance_mode: boolean;
  maintenance_message: string;
}

const defaultSettings: SystemSettings = {
  company_name: 'Veltex Services',
  company_logo_url: '',
  company_tagline: 'Professional Printing Solutions',
  primary_color: '#3b82f6',
  secondary_color: '#64748b',
  accent_color: '#10b981',
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_from_email: '',
  smtp_from_name: '',
  session_timeout: 30,
  password_min_length: 8,
  require_2fa: false,
  max_login_attempts: 5,
  enable_ai_suggestions: true,
  enable_auto_backup: true,
  enable_email_notifications: true,
  enable_sms_notifications: false,
  default_currency: 'USD',
  default_timezone: 'America/New_York',
  business_hours_start: '09:00',
  business_hours_end: '17:00',
  maintenance_mode: false,
  maintenance_message: 'System is under maintenance. Please check back later.',
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
