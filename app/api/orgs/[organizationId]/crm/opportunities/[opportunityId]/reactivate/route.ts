import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { reactivationSchema } from '@/features/crm/schemas/reactivation';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key || key.length > 140) return NextResponse.json(
    { error: 'A valid Idempotency-Key header of at most 140 characters is required.' }, { status: 400 },
  );
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = reactivationSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(
    { error: 'Invalid reactivation.', issues: parsed.error.flatten() }, { status: 400 },
  );
  const { data, error } = await context.supabase.rpc('reactivate_crm_opportunity', {
    p_organization: context.organizationId,
    p_opportunity: opportunityId,
    p_request_key: key,
    p_name: parsed.data.name ?? null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '23514') return NextResponse.json({ error: 'Only terminal or nurtured opportunities can be reactivated.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result, replayed: result.replayed === true });
}
