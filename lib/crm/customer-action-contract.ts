import { createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';

export const C0_ACCEPTANCE_CONSENT_VERSION = 'veltex-c0-acceptance-v1' as const;

export const C0_ACCEPTANCE_CONSENT_TEXT =
  'I have reviewed this proposal version and the selected service packages. By selecting Accept proposal, I confirm my acceptance of those selected packages. I understand that Veltex records the name and email I enter, the proposal version, selected packages, and acceptance time. This is not an electronic-signature process.' as const;

export const C0_ACTION_TOKEN_HMAC_KEY_VERSION = 1 as const;
export const C0_ACTION_TOKEN_HMAC_SECRET_NAME =
  'VELTEX_C0_ACTION_TOKEN_HMAC_KEY_V1' as const;
export const C0_ACTION_TOKEN_BYTES = 32 as const;
export const C0_ACTION_TOKEN_LIFETIME_DAYS = [1, 3, 7] as const;
export const C0_ACTION_TOKEN_MAX_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
export const C0_SESSION_COOKIE_NAME = '__Host-veltex_c0_session' as const;
export const C0_SESSION_MAX_AGE_SECONDS = 15 * 60;
export const C0_SESSION_TOKEN_BYTES = 32 as const;

export const customerActionPurposeSchema = z.enum([
  'review_proposal',
  'respond_proposal',
  'accept_proposal',
]);

export const customerActionTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, 'Invalid customer action token');

export const customerActionTokenDigestSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'Invalid customer action token digest');

export const databaseTokenReferenceSchema = z.object({
  tokenDigest: customerActionTokenDigestSchema,
  keyVersion: z.literal(C0_ACTION_TOKEN_HMAC_KEY_VERSION),
}).strict();

export const safeCustomerActionLogSchema = z.object({
  event: z.enum([
    'exchange_attempt',
    'exchange_result',
    'response_attempt',
    'response_result',
    'acceptance_attempt',
    'acceptance_result',
  ]),
  outcome: z.enum(['allowed', 'denied', 'rate_limited', 'error']),
  requestId: z.string().uuid(),
  tokenRecordId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  proposalVersionId: z.string().uuid().optional(),
}).strict();

export const C0_RESPONSE_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
});

export const C0_SESSION_COOKIE_OPTIONS = Object.freeze({
  httpOnly: true,
  secure: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: C0_SESSION_MAX_AGE_SECONDS,
});

export function createCustomerActionToken(): string {
  return randomBytes(C0_ACTION_TOKEN_BYTES).toString('base64url');
}

export function createCustomerActionSession(): string {
  return randomBytes(C0_SESSION_TOKEN_BYTES).toString('base64url');
}

export function digestCustomerActionToken(rawToken: string, secret: string): string {
  const parsedToken = customerActionTokenSchema.parse(rawToken);
  return digestCustomerActionValue(parsedToken, secret, 'token');
}

export function digestCustomerActionValue(
  value: string,
  secret: string,
  domain: 'token' | 'approver-email' | 'session' | 'network-bucket',
): string {
  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Customer action token HMAC secret must be at least 32 bytes');
  }
  return createHmac('sha256', secret)
    .update(`veltex-c0:${domain}:`, 'utf8')
    .update(value, 'utf8')
    .digest('hex');
}
