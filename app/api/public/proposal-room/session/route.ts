import { NextRequest, NextResponse } from 'next/server';
import { customerActionExchangeSchema } from '@/features/crm/schemas/customer-action';
import {
  C0_ACTION_TOKEN_HMAC_KEY_VERSION,
  C0_ACTION_TOKEN_HMAC_SECRET_NAME,
  C0_RESPONSE_HEADERS,
  C0_SESSION_COOKIE_NAME,
  C0_SESSION_COOKIE_OPTIONS,
  createCustomerActionSession,
  digestCustomerActionToken,
  digestCustomerActionValue,
} from '@/lib/crm/customer-action-contract';
import { createServiceClient } from '@/lib/supabase/server';

const UNAVAILABLE = 'This proposal room is unavailable. Request a new link from the sender.';

function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: C0_RESPONSE_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return reply({ error: UNAVAILABLE }, 404); }
  const parsed = customerActionExchangeSchema.safeParse(body);
  const secret = process.env[C0_ACTION_TOKEN_HMAC_SECRET_NAME];
  if (!parsed.success || !secret) return reply({ error: UNAVAILABLE }, 404);

  try {
    const rawSession = createCustomerActionSession();
    const { data, error } = await (createServiceClient() as any).rpc(
      'exchange_crm_customer_action_token_internal', {
        p_token_hmac_sha256: digestCustomerActionToken(parsed.data.token, secret),
        p_key_version: C0_ACTION_TOKEN_HMAC_KEY_VERSION,
        p_session_hmac_sha256: digestCustomerActionValue(rawSession, secret, 'session'),
      },
    );
    const result = Array.isArray(data) ? data[0] : data;
    if (error || !result) return reply({ error: UNAVAILABLE }, 404);
    const response = reply({ data: result }, 200);
    response.cookies.set(C0_SESSION_COOKIE_NAME, rawSession, C0_SESSION_COOKIE_OPTIONS);
    return response;
  } catch {
    return reply({ error: UNAVAILABLE }, 404);
  }
}
