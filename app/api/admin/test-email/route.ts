import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Test email configuration
    const isConfigValid = await EmailService.testEmailConfiguration();

    if (!isConfigValid) {
      return NextResponse.json(
        { error: 'Email configuration is invalid' },
        { status: 400 }
      );
    }

    // Send a test email
    const testEmailSent = await EmailService.sendTestEmail(
      user.email!,
      profile?.full_name || 'Admin'
    );

    if (testEmailSent) {
      return NextResponse.json({
        success: true,
        message: 'Test email sent successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
