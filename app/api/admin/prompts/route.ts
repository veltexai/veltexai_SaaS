import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Helper function to check admin access
async function checkAdminAccess(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const ip =
    request?.headers.get('x-forwarded-for') ||
    request?.headers.get('x-real-ip') ||
    'unknown';
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
    const category = searchParams.get('category') || 'all';
    const status = searchParams.get('status') || 'all';

    let query = supabase
      .from('prompt_templates')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    // Apply filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`
      );
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    const { data: templates, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      templates: templates || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const { name, description, content, category, variables, isActive } = body;

    if (!name || !content || !category) {
      return NextResponse.json(
        { error: 'Name, content, and category are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('prompt_templates')
      .insert({
        name,
        description,
        content,
        category,
        variables: variables || [],
        is_active: isActive !== undefined ? isActive : true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'prompt_template_created',
      data.id,
      {
        name,
        category,
        isActive,
      },
      request
    );

    return NextResponse.json({
      message: 'Prompt template created successfully',
      template: data,
    });
  } catch (error) {
    console.error('Error creating prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to create prompt template' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const body = await request.json();
    const {
      templateId,
      name,
      description,
      content,
      category,
      variables,
      isActive,
    } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (variables !== undefined) updateData.variables = variables;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('prompt_templates')
      .update(updateData)
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw error;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'prompt_template_updated',
      templateId,
      {
        changes: updateData,
      },
      request
    );

    return NextResponse.json({
      message: 'Prompt template updated successfully',
      template: data,
    });
  } catch (error) {
    console.error('Error updating prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to update prompt template' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const user = await checkAdminAccess(supabase);
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('prompt_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;

    // Log the action
    await logAdminAction(
      supabase,
      user.id,
      'prompt_template_deleted',
      templateId,
      {},
      request
    );

    return NextResponse.json({
      message: 'Prompt template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting prompt template:', error);
    return NextResponse.json(
      { error: 'Failed to delete prompt template' },
      { status: 500 }
    );
  }
}
