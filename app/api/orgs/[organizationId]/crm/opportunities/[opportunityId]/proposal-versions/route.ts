import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { composeProposalVersion } from '@/features/crm/proposal-version';
import { proposalVersionRequestSchema } from '@/features/crm/schemas/proposal-version';
import { createServiceClient } from '@/lib/supabase/server';
import { authenticatedCrmContext, crmContextError, requireIdempotencyKey } from '../../../_shared';

type Context = { params: Promise<{ organizationId: string; opportunityId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UNAVAILABLE = 'CRM is unavailable. Please try again.';
const NOT_FOUND = 'CRM workspace not found.';

export async function GET(_request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const [versions, candidates] = await Promise.all([
    context.supabase.rpc('read_crm_proposal_versions', {
      p_organization: context.organizationId,
      p_opportunity: opportunityId,
    }),
    context.supabase.rpc('read_crm_proposal_candidates', {
      p_organization: context.organizationId,
      p_opportunity: opportunityId,
    }),
  ]);
  if (versions.error || candidates.error) {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
  return NextResponse.json({ data: {
    candidates: candidates.data ?? [],
    versions: versions.data ?? [],
  } });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) {
    return NextResponse.json({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = proposalVersionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid proposal version.', issues: parsed.error.flatten() }, { status: 400 });
  }
  const value = parsed.data;

  try {
    // These additive R3 tables are ahead of the generated Database interface.
    // Keep the escape hatch local until the next deliberate type regeneration.
    const serviceClient = createServiceClient() as any;
    const [proposalResult, estimateResult, propertyResult, companyResult] = await Promise.all([
      serviceClient.from('proposals').select([
        'id', 'title', 'client_name', 'client_email', 'client_company', 'contact_phone',
        'service_location', 'service_type', 'service_frequency', 'service_scope',
        'generated_content', 'template_id', 'crm_opportunity_id', 'crm_customer_id',
        'crm_property_id',
      ].join(',')).eq('organization_id', context.organizationId).eq('id', value.proposalId).maybeSingle(),
      serviceClient.from('crm_estimate_runs')
        .select('id,selected_amount_minor,currency,pricing_basis,opportunity_id,property_id,work_package_id')
        .eq('organization_id', context.organizationId).eq('id', value.estimateRunId).maybeSingle(),
      serviceClient.from('crm_properties')
        .select('id,customer_id,name,address_line_1,address_line_2,city,region,postal_code')
        .eq('organization_id', context.organizationId).eq('id', value.propertyId).maybeSingle(),
      serviceClient.from('company_profiles').select('company_name,contact_info')
        .eq('organization_id', context.organizationId).maybeSingle(),
    ]);

    if (proposalResult.error || estimateResult.error || propertyResult.error || companyResult.error) {
      return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    }
    const proposal = proposalResult.data;
    const estimate = estimateResult.data;
    const property = propertyResult.data;
    if (!proposal || !estimate || !property || !proposal.crm_customer_id) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    const customerResult = await serviceClient.from('crm_customers').select('id,name')
      .eq('organization_id', context.organizationId).eq('id', proposal.crm_customer_id).maybeSingle();
    if (customerResult.error) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    if (!customerResult.data) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });

    // Fail before composing if the authoritative rows disagree. The database
    // repeats all of these checks inside the atomic command.
    if (proposal.crm_opportunity_id !== opportunityId
      || proposal.crm_property_id !== value.propertyId
      || estimate.opportunity_id !== opportunityId
      || estimate.property_id !== value.propertyId
      || (estimate.work_package_id ?? null) !== (value.workPackageId ?? null)
      || property.customer_id !== proposal.crm_customer_id) {
      return NextResponse.json({ error: 'That proposal cannot be prepared from this CRM context.' }, { status: 422 });
    }

    const { snapshot, renderedContent } = composeProposalVersion({
      proposal,
      companyProfile: companyResult.data,
      customer: customerResult.data,
      property,
      estimate,
      opportunityId,
      propertyId: value.propertyId,
      workPackageId: value.workPackageId ?? null,
    });

    const { data, error } = await serviceClient.rpc('command_crm_publish_proposal_version_internal', {
      p_actor: context.user.id,
      p_organization: context.organizationId,
      p_proposal: value.proposalId,
      p_opportunity: opportunityId,
      p_package: value.workPackageId ?? null,
      p_property: value.propertyId,
      p_estimate_run: value.estimateRunId,
      p_request_key: key,
      p_schema_version: 'crm_proposal_version.v1',
      p_content_snapshot: snapshot,
      p_rendered_content: renderedContent,
      p_expected_package_updated_at: value.expectedPackageUpdatedAt ?? null,
    });
    if (error?.code === '42501') return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    if (error?.code === '40001') {
      return NextResponse.json({ error: 'This package changed. Reload and try again.' }, { status: 409 });
    }
    if (error?.code === '23514' || error?.code === '22P02' || error?.code === '55000') {
      return NextResponse.json({ error: 'That proposal version cannot be prepared.' }, { status: 422 });
    }
    if (error) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    return NextResponse.json({ data: result, replayed: result.replayed === true }, {
      status: result.replayed ? 200 : 201,
    });
  } catch {
    return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
  }
}
