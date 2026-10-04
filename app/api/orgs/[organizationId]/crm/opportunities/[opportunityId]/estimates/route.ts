import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { estimateOutputSchema, estimateRunSchema } from '@/features/crm/schemas/estimate-run';
import { estimateJob } from '@/features/service-catalog/pricing';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../_shared';

type Context = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId))
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  const { data, error } = await context.supabase.rpc('read_crm_estimate_runs', {
    p_organization: context.organizationId, p_opportunity: opportunityId,
  });
  if (error) return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId))
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  const key = requireIdempotencyKey(request);
  if (!key) return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = estimateRunSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid estimate.', issues: parsed.error.flatten() }, { status: 400 });
  const value = parsed.data;
  const output = estimateOutputSchema.parse(estimateJob(value.job));
  const selected = value.selectedScenario === 'override'
    ? value.job.override!.pricePerVisit : output[value.selectedScenario].suggestedPrice;
  const selectedAmountMinor = Math.round(selected * 100);
  if (!Number.isSafeInteger(selectedAmountMinor) || selectedAmountMinor < 0)
    return NextResponse.json({ error: 'Invalid estimate amount.' }, { status: 400 });
  const { data, error } = await context.supabase.rpc('command_crm_estimate_run', {
    p_organization: context.organizationId, p_opportunity: opportunityId,
    p_package: value.workPackageId ?? null, p_property: value.propertyId,
    p_request_key: key, p_engine_key: 'service_catalog', p_engine_version: '2026-09-22.2',
    p_input_snapshot: value.job, p_output_snapshot: output,
    p_selected_scenario: value.selectedScenario, p_selected_amount_minor: selectedAmountMinor,
    p_currency: 'USD', p_pricing_basis: value.pricingBasis,
    p_expected_package_updated_at: value.expectedPackageUpdatedAt ?? null,
  });
  if (error?.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  if (error?.code === '40001') return NextResponse.json({ error: 'This package changed. Reload and try again.' }, { status: 409 });
  if (error?.code === '23514' || error?.code === '22P02')
    return NextResponse.json({ error: 'That estimate cannot be saved.' }, { status: 422 });
  if (error) return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: { ...result, selected_amount_minor: selectedAmountMinor,
    currency: 'USD', pricing_basis: value.pricingBasis, engine_version: '2026-09-22.2' },
    replayed: result.replayed === true }, { status: result.replayed ? 200 : 201 });
}
