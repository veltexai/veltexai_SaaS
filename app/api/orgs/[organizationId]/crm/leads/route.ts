import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { quickAddLeadSchema } from '@/features/crm/schemas/lead';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../_shared';

type RouteContext = { params: Promise<{ organizationId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { organizationId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:create')) {
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
  const parsed = quickAddLeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid lead.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: existingByKey, error: keyError } = await context.supabase
    .from('crm_leads')
    .select('id,status,created_at')
    .eq('organization_id', context.organizationId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (keyError) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  if (existingByKey) {
    return NextResponse.json({ data: existingByKey, replayed: true }, { status: 200 });
  }

  const { data: duplicates, error: duplicateError } = await context.supabase.rpc(
    'find_crm_duplicate_candidates',
    {
      target_organization: context.organizationId,
      candidate_email: parsed.data.email ?? null,
      candidate_phone: parsed.data.phone ?? null,
    },
  );
  if (duplicateError || !Array.isArray(duplicates)) {
    return NextResponse.json({ error: 'CRM is unavailable. Please try again.' }, { status: 503 });
  }
  if (duplicates.length > 0 && !parsed.data.duplicateDecision) {
    return NextResponse.json(
      {
        error: 'A possible existing contact or lead needs review.',
        duplicateCandidates: duplicates,
      },
      { status: 409 },
    );
  }

  const dedupeHint = duplicates.length === 0
    ? {}
    : {
        decision: parsed.data.duplicateDecision,
        linked_entity_id: parsed.data.linkedEntityId ?? null,
        candidates: duplicates,
      };
  const { data: lead, error: insertError } = await context.supabase
    .from('crm_leads')
    .insert({
      organization_id: context.organizationId,
      status: 'new',
      intake_method: 'manual',
      idempotency_key: idempotencyKey,
      customer_name: parsed.data.customerName ?? null,
      contact_name: parsed.data.contactName ?? null,
      email: parsed.data.email?.toLowerCase() ?? null,
      phone: parsed.data.phone ?? null,
      property_name: parsed.data.propertyName ?? null,
      service_location: parsed.data.serviceLocation ?? null,
      assigned_to_user_id: parsed.data.assignedToUserId ?? context.user.id,
      dedupe_hint: dedupeHint,
      source: 'manual',
      created_by: context.user.id,
      updated_by: context.user.id,
    })
    .select('id,status,created_at')
    .single();
  if (insertError || !lead) {
    if (insertError?.code === '23505') {
      const { data: replay } = await context.supabase
        .from('crm_leads')
        .select('id,status,created_at')
        .eq('organization_id', context.organizationId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (replay) return NextResponse.json({ data: replay, replayed: true });
    }
    return NextResponse.json({ error: 'Unable to create lead.' }, { status: 422 });
  }

  return NextResponse.json({ data: lead, replayed: false }, { status: 201 });
}

