import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { leadConversionSchema } from '@/features/crm/schemas/lead-conversion';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; leadId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, leadId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create') || !UUID.test(leadId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  const idempotencyKey = requireIdempotencyKey(request);
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: 'A valid Idempotency-Key header is required.' },
      { status: 400 },
    );
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = leadConversionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid lead conversion.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await context.supabase.rpc('convert_crm_lead', {
    p_organization: context.organizationId,
    p_lead: leadId,
    p_request_key: idempotencyKey,
    p_pipeline: parsed.data.pipelineId,
    p_opportunity_name: parsed.data.opportunityName,
    p_segment: parsed.data.segment,
    p_existing_customer: parsed.data.existingCustomerId ?? null,
    p_existing_contact: parsed.data.existingContactId ?? null,
    p_existing_property: parsed.data.existingPropertyId ?? null,
  });
  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    }
    if (error.code === '23514' || error.code === '23505') {
      return NextResponse.json(
        { error: 'The lead cannot be converted with those selections.' },
        { status: 422 },
      );
    }
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  return NextResponse.json({ data: result, replayed: result.replayed === true });
}
