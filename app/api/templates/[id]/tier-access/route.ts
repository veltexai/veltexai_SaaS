import { NextRequest, NextResponse } from 'next/server';
import { setTemplateTierAccess } from '@/lib/templates/template-service';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { tiers } = body;

    if (!Array.isArray(tiers)) {
      return NextResponse.json(
        { error: 'Tiers must be an array' },
        { status: 400 }
      );
    }

    // Validate tier values
    const validTiers = ['starter', 'professional', 'enterprise'];
    const invalidTiers = tiers.filter(tier => !validTiers.includes(tier));
    
    if (invalidTiers.length > 0) {
      return NextResponse.json(
        { error: `Invalid tiers: ${invalidTiers.join(', ')}` },
        { status: 400 }
      );
    }

    const { id } = await params;
    await setTemplateTierAccess(id, tiers);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting template tier access:', error);
    const message = error instanceof Error ? error.message : 'Failed to set template tier access';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}