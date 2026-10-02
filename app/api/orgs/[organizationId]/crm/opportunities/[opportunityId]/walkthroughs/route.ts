import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { scheduleWalkthroughSchema } from '@/features/crm/schemas/walkthrough';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const idempotencyKey = requireIdempotencyKey(request);
  if (!idempotencyKey) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = scheduleWalkthroughSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid walkthrough.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { data, error } = await context.supabase.rpc('schedule_crm_walkthrough', {
    p_organization: context.organizationId,
    p_opportunity: opportunityId,
    p_property: parsed.data.propertyId,
    p_estimator: parsed.data.estimatorUserId,
    p_site_contact: parsed.data.siteContactId ?? null,
    p_request_key: idempotencyKey,
    p_window_start: parsed.data.windowStart,
    p_window_end: parsed.data.windowEnd,
    p_timezone: parsed.data.timezone,
  });
  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    }
    if (error.code === '23P01') {
      return NextResponse.json({ error: 'That estimator already has a walkthrough during this time.' }, { status: 409 });
    }
    if (error.code === '23514') {
      return NextResponse.json({ error: 'The walkthrough conflicts with an existing command.' }, { status: 422 });
    }
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result, replayed: result.replayed === true });
}
