import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { crmRoleHasPermission } from '@/features/crm/domain';
import { customerActionIssueSchema } from '@/features/crm/schemas/customer-action';
import {
  C0_ACTION_TOKEN_HMAC_KEY_VERSION,
  C0_ACTION_TOKEN_HMAC_SECRET_NAME,
  createCustomerActionToken,
  digestCustomerActionToken,
  digestCustomerActionValue,
  C0_RESPONSE_HEADERS,
} from '@/lib/crm/customer-action-contract';
import { createServiceClient } from '@/lib/supabase/server';
import {
  authenticatedCrmContext,
  crmContextError,
  requireIdempotencyKey,
} from '../../../_shared';

type Context = { params: Promise<{ organizationId: string; versionId: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOT_FOUND = 'CRM workspace not found.';
const UNAVAILABLE = 'Customer action links are unavailable. Please try again.';

function privateJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...C0_RESPONSE_HEADERS, ...init?.headers },
  });
}

function requestDigest(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function GET(_request: NextRequest, { params }: Context) {
  const { organizationId, versionId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(versionId)) {
    return privateJson({ error: NOT_FOUND }, { status: 404 });
  }
  const { data, error } = await context.supabase.rpc(
    'read_crm_customer_action_token_status' as never,
    { p_organization: context.organizationId, p_proposal_version: versionId } as never,
  ) as any;
  if (error) return privateJson({ error: UNAVAILABLE }, { status: 503 });
  return privateJson({ data: data ?? [] });
}

export async function POST(request: NextRequest, { params }: Context) {
  const { organizationId, versionId } = await params;
  const context = await authenticatedCrmContext(organizationId);
  if (context.kind !== 'ok') return crmContextError(context.kind);
  if (!crmRoleHasPermission(context.role, 'crm:edit_assigned') || !UUID.test(versionId)) {
    return privateJson({ error: NOT_FOUND }, { status: 404 });
  }
  const key = requireIdempotencyKey(request);
  if (!key) {
    return privateJson({ error: 'A valid Idempotency-Key header is required.' }, { status: 400 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return privateJson({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsed = customerActionIssueSchema.safeParse(body);
  if (!parsed.success) {
    return privateJson({ error: 'Invalid customer action link request.' }, { status: 400 });
  }
  if (parsed.data.designatedApproverEmail && !['owner', 'admin'].includes(context.role)) {
    return privateJson({ error: NOT_FOUND }, { status: 404 });
  }
  const secret = process.env[C0_ACTION_TOKEN_HMAC_SECRET_NAME];
  if (!secret) return privateJson({ error: UNAVAILABLE }, { status: 503 });
  try {
    const rawToken = createCustomerActionToken();
    const tokenDigest = digestCustomerActionToken(rawToken, secret);
    const designatedDigest = parsed.data.designatedApproverEmail
      ? digestCustomerActionValue(
        parsed.data.designatedApproverEmail.trim().toLowerCase(), secret, 'approver-email',
      )
      : null;
    const normalizedRequest = {
      versionId,
      purpose: parsed.data.purpose,
      expiresInDays: parsed.data.expiresInDays,
      designatedApproverEmailDigest: designatedDigest,
    };
    const serviceClient = createServiceClient() as any;
    const { data, error } = await serviceClient.rpc(
      'command_crm_issue_customer_action_token_internal',
      {
        p_actor: context.user.id,
        p_organization: context.organizationId,
        p_proposal_version: versionId,
        p_purpose: parsed.data.purpose,
        p_token_hmac_sha256: tokenDigest,
        p_key_version: C0_ACTION_TOKEN_HMAC_KEY_VERSION,
        p_designated_approver_email_hmac_sha256: designatedDigest,
        p_expires_in_days: parsed.data.expiresInDays,
        p_request_key: key,
        p_request_sha256: requestDigest(normalizedRequest),
      },
    );
    if (error?.code === '42501') return privateJson({ error: NOT_FOUND }, { status: 404 });
    if (error?.code === '23505') {
      return privateJson({ error: 'That request key was already used differently.' }, { status: 409 });
    }
    if (error) return privateJson({ error: UNAVAILABLE }, { status: 503 });
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) return privateJson({ error: NOT_FOUND }, { status: 404 });
    return privateJson({
      data: {
        ...result,
        fragmentToken: result.raw_token_recoverable === true ? rawToken : null,
      },
      replayed: result.replayed === true,
    }, { status: result.replayed ? 200 : 201 });
  } catch {
    return privateJson({ error: UNAVAILABLE }, { status: 503 });
  }
}
