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

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    let query = supabase
      .from('pricing_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: settings, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      settings: settings || [],
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { userId, laborRate, productionRates } = body;

    if (!userId || !laborRate || !productionRates) {
      return NextResponse.json(
        { error: 'User ID, labor rate, and production rates are required' },
        { status: 400 }
      );
    }

    // Check if settings already exist for this user
    const { data: existingSettings } = await supabase
      .from('pricing_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;
    if (existingSettings) {
      // Update existing settings
      const { data, error } = await supabase
        .from('pricing_settings')
        .update({
          labor_rate: laborRate,
          production_rates: productionRates,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('pricing_settings')
        .insert({
          user_id: userId,
          labor_rate: laborRate,
          production_rates: productionRates,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'pricing_settings_updated',
      result.id,
      {
        userId,
        laborRate,
        productionRates,
        action: existingSettings ? 'updated' : 'created',
      },
      request
    );

    return NextResponse.json({
      message: 'Pricing settings saved successfully',
      settings: result,
    });
  } catch (error) {
    console.error('Error saving pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { settingsId, laborRate, productionRates } = body;

    if (!settingsId) {
      return NextResponse.json(
        { error: 'Settings ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (laborRate !== undefined) {
      updateData.labor_rate = laborRate;
    }

    if (productionRates !== undefined) {
      updateData.production_rates = productionRates;
    }

    const { data, error } = await supabase
      .from('pricing_settings')
      .update(updateData)
      .eq('id', settingsId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'pricing_settings_updated',
      settingsId,
      {
        changes: updateData,
      },
      request
    );

    return NextResponse.json({
      message: 'Pricing settings updated successfully',
      settings: data,
    });
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to update pricing settings' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const { searchParams } = new URL(request.url);
    const settingsId = searchParams.get('id');

    if (!settingsId) {
      return NextResponse.json(
        { error: 'Settings ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('pricing_settings')
      .delete()
      .eq('id', settingsId);

    if (error) throw error;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'pricing_settings_deleted',
      settingsId,
      {},
      request
    );

    return NextResponse.json({
      message: 'Pricing settings deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting pricing settings:', error);
    return NextResponse.json(
      { error: 'Failed to delete pricing settings' },
      { status: 500 }
    );
  }
}