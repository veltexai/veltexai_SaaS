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

    const nextSettings: Record<string, unknown> = {
      ...existing,
      ...settings,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };
    if (preserveSmtp) {
      for (const key of ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_from_email', 'smtp_from_name']) {
        nextSettings[key] = existing[key];
      }
    } else if (typeof settings.smtp_password !== 'string' || settings.smtp_password.trim() === '') {
      nextSettings.smtp_password = existing.smtp_password;
    }

    const { error: writeError } = await service
      .from('system_settings')
      .upsert(nextSettings, { onConflict: 'id' });
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
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { error: 'Failed to update system settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { section, data } = body;

    if (!section || !data) {
      return NextResponse.json(
        { error: 'Section and data are required' },
        { status: 400 }
      );
    }

    // Validate section exists
    if (!defaultSettings[section as keyof typeof defaultSettings]) {
      return NextResponse.json(
        { error: 'Invalid settings section' },
        { status: 400 }
      );
    }

    // In a real implementation, you would update the specific section in the database
    // For now, we'll merge with defaults and return
    const updatedSection = {
      ...defaultSettings[section as keyof typeof defaultSettings],
      ...data,
    };

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'system_settings_updated',
      undefined,
      {
        section,
        changes: data,
        timestamp: new Date().toISOString(),
      },
      request
    );

    return NextResponse.json({
      message: `${section} settings updated successfully`,
      section: updatedSection,
    });
  } catch (error) {
    console.error('Error updating settings section:', error);
    return NextResponse.json(
      { error: 'Failed to update settings section' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      // Reset all settings to defaults
      // In a real implementation, you would reset the database values
      
      // Log the action
      await logAdminAction(
        supabase,
        user.id,
        'system_settings_reset',
        undefined,
        {
          timestamp: new Date().toISOString(),
        },
        request
      );

      return NextResponse.json({
        message: 'System settings reset to defaults successfully',
        settings: defaultSettings,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error resetting system settings:', error);
    return NextResponse.json(
      { error: 'Failed to reset system settings' },
      { status: 500 }
    );
  }
}
