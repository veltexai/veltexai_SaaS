import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ trackingId: string }> }) {
  const { trackingId } = await params;
  const db = await createClient();
  // Never accept a caller-supplied proposal ID. The token resolves its own row.
  const { data, error } = await db.rpc('record_tracked_view', { token: trackingId });
  if (error) return NextResponse.json({ error: 'Unable to record view.' }, { status: 503 });
  return NextResponse.json({ success: Boolean(data) });
}
