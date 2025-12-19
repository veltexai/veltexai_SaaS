import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { addonFormSchema, addonFormSchemaWithRefinements } from '@/features/admin/addons/utils/validation';

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
 * GET /api/admin/addons/[id]
 * Fetch single add-on by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    const { data, error } = await supabase
      .from('additional_service_catalog')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Add-on not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching add-on:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch add-on' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/addons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/addons/[id]
 * Update an existing add-on (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();

    // Validate with Zod (partial update allowed)
    // Use base schema for partial updates since refined schemas don't support .partial()
    const validationResult = addonFormSchema.partial().safeParse(body);
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

    const updateData = validationResult.data;

    // If updating SKU, check uniqueness
    if (updateData.sku) {
      const { data: existingSku } = await supabase
        .from('additional_service_catalog')
        .select('id')
        .eq('sku', updateData.sku)
        .neq('id', id)
        .single();

      if (existingSku) {
        return NextResponse.json(
          { success: false, error: 'SKU already exists' },
          { status: 409 }
        );
      }
    }

    // Update add-on
    const { data, error } = await supabase
      .from('additional_service_catalog')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Add-on not found' },
          { status: 404 }
        );
      }
      console.error('Error updating add-on:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update add-on' },
        { status: 500 }
      );
    }

    // Log admin action
    await logAdminAction(
      supabase,
      adminCheck.user!.id,
      'addon_updated',
      id,
      { updates: updateData }
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in PATCH /api/admin/addons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/addons/[id]
 * Delete an add-on (soft or hard delete, admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const body = await request.json();
    const { soft = true } = body;

    if (soft) {
      // Soft delete: set active = false
      const { data, error } = await supabase
        .from('additional_service_catalog')
        .update({ active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { success: false, error: 'Add-on not found' },
            { status: 404 }
          );
        }
        console.error('Error soft-deleting add-on:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to deactivate add-on' },
          { status: 500 }
        );
      }

      // Log admin action
      await logAdminAction(
        supabase,
        adminCheck.user!.id,
        'addon_deactivated',
        id,
        { sku: data.sku }
      );

      return NextResponse.json({
        success: true,
        data,
      });
    } else {
      // Hard delete: permanent removal
      const { error } = await supabase
        .from('additional_service_catalog')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting add-on:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to delete add-on' },
          { status: 500 }
        );
      }

      // Log admin action
      await logAdminAction(
        supabase,
        adminCheck.user!.id,
        'addon_deleted',
        id
      );

      return NextResponse.json({
        success: true,
      });
    }
  } catch (error) {
    console.error('Error in DELETE /api/admin/addons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

