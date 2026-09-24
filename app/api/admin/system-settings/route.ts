import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Helper function to check admin access
async function checkAdminAccess(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    throw new Error('Admin access required');
  }

  return user;
}

// Helper function to log admin actions
async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  targetId?: string,
  details?: any,
  request?: NextRequest
) {
  const ip = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown';
  const userAgent = request?.headers.get('user-agent') || 'unknown';

  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action,
    target_id: targetId,
    details,
    ip_address: ip,
    user_agent: userAgent,
  });
}

// Default system settings
const defaultSettings = {
  branding: {
    companyName: 'Veltex Services',
    logo: '',
    primaryColor: '#3b82f6',
    secondaryColor: '#64748b',
    favicon: '',
  },
  email: {
    fromName: 'Veltex Services',
    fromEmail: 'noreply@veltexservices.com',
    replyTo: 'support@veltexservices.com',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    smtpSecure: true,
  },
  security: {
    sessionTimeout: 24,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowedDomains: [],
    maxLoginAttempts: 5,
    lockoutDuration: 15,
  },
  features: {
    enableRegistration: true,
    enablePasswordReset: true,
    enableEmailVerification: true,
    enableNotifications: true,
    enableAnalytics: true,
    enableFileUploads: true,
    maxFileSize: 10,
  },
  business: {
    currency: 'USD',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12',
    fiscalYearStart: 'January',
    taxRate: 0,
  },
  maintenance: {
    enabled: false,
    message: 'We are currently performing scheduled maintenance. Please check back soon.',
    allowedIPs: [],
    estimatedDuration: '',
  },
};

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);

    // In a real implementation, you would store these settings in a database table
    // For now, we'll return the default settings
    // You could create a 'system_settings' table to store these values
    
    return NextResponse.json({
      settings: defaultSettings,
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { settings, preserveSmtp = false } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    const service = createServiceClient();
    const { data: existing, error: readError } = await service
      .from('system_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    if (readError || !existing) {
      return NextResponse.json({ error: 'System settings record not found' }, { status: 404 });
    }

    const submitted = settings as Record<string, unknown>;
    const nextSettings: Record<string, unknown> = {};
    const editableColumns = [
      'company_name', 'company_logo_url', 'company_tagline',
      'primary_color', 'secondary_color', 'accent_color',
      'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
      'smtp_from_email', 'smtp_from_name',
      'session_timeout', 'password_min_length', 'require_2fa', 'max_login_attempts',
      'enable_ai_suggestions', 'enable_auto_backup',
      'enable_email_notifications', 'enable_sms_notifications',
      'default_currency', 'default_timezone',
      'business_hours_start', 'business_hours_end',
      'maintenance_mode', 'maintenance_message',
      'theme_applied_to_pdfs', 'ai_attribution_enabled', 'proposal_tracking_enabled',
    ];
    for (const key of editableColumns) {
      if (Object.prototype.hasOwnProperty.call(submitted, key)) nextSettings[key] = submitted[key];
    }
    const aliases: Record<string, string> = {
      email_from_name: 'smtp_from_name',
      email_from_address: 'smtp_from_email',
      ai_enabled: 'enable_ai_suggestions',
      email_notifications_enabled: 'enable_email_notifications',
      business_timezone: 'default_timezone',
    };
    for (const [input, column] of Object.entries(aliases)) {
      if (Object.prototype.hasOwnProperty.call(submitted, input)) nextSettings[column] = submitted[input];
    }
    nextSettings.updated_at = new Date().toISOString();
    if (preserveSmtp) {
      for (const key of ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_from_email', 'smtp_from_name']) {
        delete nextSettings[key];
      }
    } else if (typeof settings.smtp_password !== 'string' || settings.smtp_password.trim() === '') {
      delete nextSettings.smtp_password;
    }

    const { error: writeError } = await service
      .from('system_settings')
      .update(nextSettings)
      .eq('id', existing.id);
    if (writeError) throw writeError;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'system_settings_updated',
      undefined,
      {
        updatedSections: Object.keys(settings),
        timestamp: new Date().toISOString(),
      },
      request
    );

    return NextResponse.json({
      message: 'System settings updated successfully',
    });
  } catch (error) {
    console.error('Error updating system settings', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json(
      { error: 'Failed to update system settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({ error: 'Use POST for settings updates' }, { status: 405 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Use POST with preserveSmtp for reset' }, { status: 405 });
}
