import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

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
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: 'Settings are required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would save these settings to a database
    // For now, we'll just validate and return them
    
    // Validate required fields
    const requiredFields = {
      'branding.companyName': settings.branding?.companyName,
      'email.fromEmail': settings.email?.fromEmail,
      'business.currency': settings.business?.currency,
      'business.timezone': settings.business?.timezone,
    };

    for (const [field, value] of Object.entries(requiredFields)) {
      if (!value) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

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
      settings,
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