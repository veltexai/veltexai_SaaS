import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { addonFormSchemaWithRefinements } from '@/features/admin/addons/utils/validation';

// Helper function to check admin access
async function checkAdminAccess() {
  const supabase = await createClient();
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Unauthorized', status: 401, supabase };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403, supabase };
  }

  return { user, profile, supabase };
}

// Helper to log admin actions
async function logAdminAction(
  supabase: any,
  adminId: string,
  action: string,
  targetId?: string,
  details?: any
) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_id: targetId,
      details,
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}

/**
 * GET /api/admin/addons
 * Fetch all add-ons with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Admin check - but catalog is readable by all authenticated users
    // For public catalog access, use the public endpoint instead
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const showInProposals = searchParams.get('show_in_proposals');

    let query = supabase
      .from('additional_service_catalog')
      .select('*')
      .order('label', { ascending: true });

    // Apply filters
    if (search) {
      query = query.or(
        `label.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (active !== null && active !== undefined && active !== 'all') {
      query = query.eq('active', active === 'true');
    }

    if (showInProposals !== null && showInProposals !== undefined && showInProposals !== 'all') {
      query = query.eq('show_in_proposals', showInProposals === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching add-ons:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch add-ons' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/addons:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/addons
 * Create a new add-on (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const adminCheck = await checkAdminAccess();
    if (adminCheck.error) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      );
    }

    const supabase = adminCheck.supabase;

    const body = await request.json();

    // Validate with Zod
    const validationResult = addonFormSchemaWithRefinements.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const formData = validationResult.data;

    // Check if SKU is unique
    const { data: existingSku } = await supabase
      .from('additional_service_catalog')
      .select('id')
      .eq('sku', formData.sku)
      .single();

    if (existingSku) {
      return NextResponse.json(
        { success: false, error: 'SKU already exists' },
        { status: 409 }
      );
    }

    // Insert new add-on
    const { data, error } = await supabase
      .from('additional_service_catalog')
      .insert([formData])
      .select()
      .single();

    if (error) {
      console.error('Error creating add-on:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create add-on' },
        { status: 500 }
      );
    }

    // Log admin action
    await logAdminAction(
      supabase,
      adminCheck.user!.id,
      'addon_created',
      data.id,
      { sku: formData.sku, label: formData.label }
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/addons:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

