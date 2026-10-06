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

export async function GET(request: NextRequest, { params }: Context) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(opportunityId)) {
    return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
  }
  const estimateRunId = request.nextUrl.searchParams.get('estimateRunId');
  const propertyId = request.nextUrl.searchParams.get('propertyId');
  const workPackageId = request.nextUrl.searchParams.get('workPackageId');
  if (!estimateRunId || !propertyId || !UUID.test(estimateRunId) || !UUID.test(propertyId)
      || (workPackageId !== null && !UUID.test(workPackageId))) {
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
  const serviceClient = createServiceClient() as any;
  const hydratedCandidates = (await Promise.all((candidates.data ?? []).map(async (candidate: any) => {
    try {
      const sourceResult = await serviceClient.rpc('read_crm_proposal_version_source_internal', {
        p_actor: context.user.id, p_organization: context.organizationId,
        p_proposal: candidate.id, p_opportunity: opportunityId,
        p_package: workPackageId, p_property: propertyId, p_estimate_run: estimateRunId,
      });
      if (sourceResult.error || !sourceResult.data) return null;
      const composed = composeProposalVersion({ ...sourceResult.data,
        opportunityId, propertyId, workPackageId });
      return { ...candidate, preview: { rendered_content: composed.renderedContent,
        scope_lines: composed.snapshot.scopeLines, amount_minor: composed.snapshot.pricing.amountMinor,
        currency: composed.snapshot.pricing.currency, pricing_basis: composed.snapshot.pricing.basis } };
    } catch { return null; }
  }))).filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null);
  return NextResponse.json({ data: {
    candidates: hydratedCandidates,
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
    const { data: sourceData, error: sourceError } = await serviceClient
      .rpc('read_crm_proposal_version_source_internal', {
        p_actor: context.user.id,
        p_organization: context.organizationId,
        p_proposal: value.proposalId,
        p_opportunity: opportunityId,
        p_package: value.workPackageId ?? null,
        p_property: value.propertyId,
        p_estimate_run: value.estimateRunId,
      });
    if (sourceError?.code === '42501') return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    if (sourceError?.code === '23514') {
      return NextResponse.json({ error: 'That proposal cannot be prepared from this CRM context.' }, { status: 422 });
    }
    if (sourceError || !sourceData) return NextResponse.json({ error: UNAVAILABLE }, { status: 503 });
    const source = sourceData as any;

    const { snapshot, renderedContent } = composeProposalVersion({
      proposal: source.proposal,
      companyProfile: source.companyProfile,
      customer: source.customer,
      property: source.property,
      estimate: source.estimate,
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
