import { NextRequest, NextResponse } from 'next/server';
import { getUserAccessibleTemplates, createTemplate } from '@/lib/templates/template-service';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const templates = await getUserAccessibleTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch templates';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { name, display_name, description, preview_image_url, template_data, sort_order } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: 'Name and display_name are required' },
        { status: 400 }
      );
    }

    const template = await createTemplate({
      name,
      display_name,
      description,
      preview_image_url,
      template_data,
      sort_order
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    const message = error instanceof Error ? error.message : 'Failed to create template';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}