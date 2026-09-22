import { recordFunnelEvents } from '@/lib/analytics/funnel-server';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/features/auth/services/get-user';
import { createClient } from '@/lib/supabase/server';
import { businessProfileSchema } from '@/features/service-catalog/schema';

export async function GET() {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = await createClient();
  const { data, error } = await db.from('business_service_profiles').select('profile').eq('user_id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Business profile unavailable. Please retry.' }, { status: 503 });
  return NextResponse.json({ profile: data?.profile ?? null });
}
export async function PUT(request: NextRequest) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = businessProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map(i => i.message).join('; ') }, { status: 422 });
  const db = await createClient();
  const { error } = await db.from('business_service_profiles').upsert({ user_id: user.id, profile: parsed.data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: 'Unable to save business profile.' }, { status: 503 });
  await recordFunnelEvents([{ eventId: `catalog_profile:${crypto.randomUUID()}`, userId: user.id, eventName: 'catalog_profile_saved', properties: { markets: parsed.data.markets, services: parsed.data.services } }]);
  return NextResponse.json({ profile: parsed.data });
}
