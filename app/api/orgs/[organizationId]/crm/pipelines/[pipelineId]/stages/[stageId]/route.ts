import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { pipelineStageConfigurationSchema } from '@/features/crm/schemas/pipeline-configuration';
import { authenticatedCrmContext, crmContextError } from '../../../../_shared';

type RouteContext = { params: Promise<{ organizationId: string; pipelineId: string; stageId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { organizationId, pipelineId, stageId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:pipeline_configure')
      || !UUID.test(pipelineId) || !UUID.test(stageId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }
  let json: unknown;
  try { json = await request.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = pipelineStageConfigurationSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json(
    { error: 'Invalid pipeline stage.', issues: parsed.error.flatten() }, { status: 400 });
  const { data, error } = await context.supabase.rpc('configure_crm_pipeline_stage', {
    p_organization: context.organizationId, p_pipeline: pipelineId, p_stage: stageId,
    p_label: parsed.data.label, p_category: parsed.data.category,
    p_position: parsed.data.position, p_hidden: parsed.data.hidden,
    p_pipeline_name: parsed.data.pipelineName ?? null,
  });
  if (error) {
    if (error.code === '42501') return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    if (error.code === '23505') return NextResponse.json({ error: 'That stage position is already in use.' }, { status: 409 });
    if (error.code === '23514') return NextResponse.json({ error: 'That pipeline change is not allowed.' }, { status: 422 });
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  return NextResponse.json({ data: result }, { status: result.created === true ? 201 : 200 });
}
