import { NextRequest, NextResponse } from 'next/server';
import { getUserPreferredTemplate, setUserPreferredTemplate } from '@/lib/templates/template-service';
import { getUser } from '@/lib/auth/auth-helpers';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const preferences = await getUserPreferredTemplate();
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching user template preferences:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, template_settings } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      );
    }

    await setUserPreferredTemplate(template_id, template_settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting user template preferences:', error);
    const message = error instanceof Error ? error.message : 'Failed to set preferences';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}