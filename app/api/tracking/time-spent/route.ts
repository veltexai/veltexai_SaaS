import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tracking_id !== 'string' || !Number.isFinite(body.time_spent)) return NextResponse.json({ error: 'Invalid tracking data' }, { status: 400 });
  const db = await createClient();
  const { data, error } = await db.rpc('record_tracking_metric', { token: body.tracking_id, metric: 'time', value: Math.floor(body.time_spent/1000) });
  return NextResponse.json({ success: Boolean(data) }, { status: error ? 503 : 200 });
}
