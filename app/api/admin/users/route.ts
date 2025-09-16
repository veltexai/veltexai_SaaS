import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to check admin access
async function checkAdminAccess(supabase: any) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }

  return { user, profile };
}

// GET /api/admin/users - Get all users with stats
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check admin access
    const adminCheck = await checkAdminAccess(supabase);
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    // Get users from auth.users (requires service role)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json(
        { error: 'Failed to fetch users from auth' },
        { status: 500 }
      );
    }

    // Get profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (profilesError) {
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Get subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*');
    
    if (subsError) {
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Combine data
    const users = authUsers.users.map(authUser => {
      const profile = profiles?.find(p => p.id === authUser.id);
      const subscription = subscriptions?.find(s => s.user_id === authUser.id);
      
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || null,
        created_at: authUser.created_at,
        last_sign_in_at: authUser.last_sign_in_at,
        email_confirmed_at: authUser.email_confirmed_at,
        role: profile?.role || null,
        subscription: subscription || null,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - Update user (admin status, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Check admin access
    const adminCheck = await checkAdminAccess(supabase);
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const body = await request.json();
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json(
        { error: 'Missing userId or updates' },
        { status: 400 }
      );
    }

    // Prevent self-demotion from admin
    if (updates.role !== 'admin' && userId === adminCheck.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove admin access from yourself' },
        { status: 400 }
      );
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('admin_audit_log')
      .insert({
        admin_id: adminCheck.user.id,
        action: 'user_updated',
        target_id: userId,
        details: { updates },
      });

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}