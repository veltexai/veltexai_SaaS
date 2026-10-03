import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { stageTransitionSchema } from '@/features/crm/schemas/stage-transition';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../../../_shared';

type RouteContext = {
  params: Promise<{ organizationId: string; opportunityId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId, opportunityId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:stage_move_assigned')) {
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
  const parsed = stageTransitionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid stage transition.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(opportunityId)) {
    return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
  }

  const { data, error } = await context.supabase.rpc('move_crm_opportunity_stage', {
    target_organization: context.organizationId,
    target_opportunity: opportunityId,
    target_stage: parsed.data.stageId,
    request_key: idempotencyKey,
    selected_loss_reason: parsed.data.lossReasonId ?? null,
    selected_manual_win_reason: parsed.data.manualWinReason ?? null,
    selected_next_action_due_at: parsed.data.nextActionDueAt ?? null,
  });
  if (error) {
    if (error.code === '42501') {
      return NextResponse.json({ error: 'CRM workspace not found.' }, { status: 404 });
    }
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'The opportunity does not meet the requirements for that stage.' },
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
