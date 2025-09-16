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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    let query = supabase
      .from('proposals')
      .select(`
        *,
        profiles!user_id (
          email,
          full_name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (userId !== 'all') {
      query = query.eq('user_id', userId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59');
    }

    const { data: proposals, error, count } = await query;

    if (error) throw error;

    // Get users for filter dropdown
    const { data: users } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('full_name');

    return NextResponse.json({
      proposals: proposals || [],
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { proposalIds, action, value } = body;

    if (!proposalIds || !Array.isArray(proposalIds) || proposalIds.length === 0) {
      return NextResponse.json(
        { error: 'Proposal IDs are required' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let actionName = '';

    switch (action) {
      case 'updateStatus':
        if (!value) {
          return NextResponse.json(
            { error: 'Status value is required' },
            { status: 400 }
          );
        }
        updateData.status = value;
        actionName = 'proposal_status_changed';
        break;

      case 'delete':
        // For delete, we'll handle it separately
        const { error: deleteError } = await supabase
          .from('proposals')
          .delete()
          .in('id', proposalIds);

        if (deleteError) throw deleteError;

        // Log the bulk delete action
        await logAdminAction(
          supabase,
          user.id,
          'bulk_action_performed',
          undefined,
          {
            action: 'delete_proposals',
            proposalIds,
            count: proposalIds.length,
          },
          request
        );

        return NextResponse.json({
          message: `Successfully deleted ${proposalIds.length} proposal(s)`,
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update proposals
    const { data, error } = await supabase
      .from('proposals')
      .update(updateData)
      .in('id', proposalIds)
      .select();

    if (error) throw error;

    // Log the bulk action
    await logAdminAction(
      supabase,
      user.id,
      'bulk_action_performed',
      undefined,
      {
        action: `update_proposals_${action}`,
        proposalIds,
        value,
        count: proposalIds.length,
      },
      request
    );

    return NextResponse.json({
      message: `Successfully updated ${proposalIds.length} proposal(s)`,
      proposals: data,
    });
  } catch (error) {
    console.error('Error updating proposals:', error);
    return NextResponse.json(
      { error: 'Failed to update proposals' },
      { status: 500 }
    );
  }
}