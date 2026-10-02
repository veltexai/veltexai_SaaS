import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { opportunityDetailsSchema } from '@/features/crm/schemas/opportunity-details';
import { authenticatedCrmContext, crmContextError } from '../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = opportunityDetailsSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(
    { error: 'Invalid opportunity details.', issues: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await context.supabase.rpc('update_crm_opportunity_details', {
    p_organization: context.organizationId, p_opportunity: opportunityId,
    p_expected_updated_at: value.expectedUpdatedAt, p_name: value.name,
    p_service_family: value.serviceFamily ?? null,
    p_expected_close_date: value.expectedCloseDate ?? null,
    p_value_amount_minor: value.valueAmountMinor ?? null,
    p_value_basis: value.valueBasis ?? null, p_currency: value.currency ?? null,
    p_next_action_due_at: value.nextActionDueAt ?? null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '40001') return NextResponse.json({ error: 'This opportunity changed. Reload before saving.' }, { status: 409 });
    if (error.code === '23514') return NextResponse.json({ error: 'Invalid opportunity details.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result });
}
