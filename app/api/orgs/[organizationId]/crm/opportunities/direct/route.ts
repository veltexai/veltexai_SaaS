import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { directOpportunitySchema } from '@/features/crm/schemas/direct-opportunity';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../_shared';

type Context = { params: Promise<{ organizationId: string }> };
export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned')) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = directOpportunitySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid opportunity.', issues: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const ownerUserId = context.role === 'estimator' ? context.user.id : value.ownerUserId;
  const estimatorUserId = context.role === 'estimator' ? context.user.id : value.estimatorUserId ?? null;
  if (!ownerUserId) return NextResponse.json({ error: 'Choose an opportunity owner.' }, { status: 400 });
  const { data, error } = await context.supabase.rpc('create_crm_direct_opportunity', {
    p_organization: context.organizationId, p_opportunity: value.opportunityId, p_lead: value.leadId,
    p_request_key: key, p_customer: value.customerId, p_property: value.propertyId ?? null,
    p_pipeline: value.pipelineId, p_name: value.name, p_owner: ownerUserId,
    p_estimator: estimatorUserId,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '23514') return NextResponse.json({ error: 'Those opportunity details are unavailable.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ data: result, replayed: result?.replayed === true }, { status: result?.replayed ? 200 : 201 });
}
