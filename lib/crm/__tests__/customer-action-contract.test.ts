import {
  C0_ACCEPTANCE_CONSENT_TEXT,
  C0_ACCEPTANCE_CONSENT_VERSION,
  C0_ACTION_TOKEN_BYTES,
  C0_ACTION_TOKEN_HMAC_KEY_VERSION,
  C0_ACTION_TOKEN_LIFETIME_DAYS,
  C0_ACTION_TOKEN_MAX_LIFETIME_SECONDS,
  C0_RESPONSE_HEADERS,
  C0_SESSION_COOKIE_NAME,
  C0_SESSION_COOKIE_OPTIONS,
  createCustomerActionToken,
  customerActionTokenDigestSchema,
  customerActionTokenSchema,
  databaseTokenReferenceSchema,
  digestCustomerActionToken,
  safeCustomerActionLogSchema,
} from '../customer-action-contract';

const SECRET = '0123456789abcdef0123456789abcdef';
const UUID = '11111111-1111-4111-8111-111111111111';

describe('R3-5 C0 customer action boundary', () => {
  it('freezes non-signature consent copy and a stable version', () => {
    expect(C0_ACCEPTANCE_CONSENT_VERSION).toBe('veltex-c0-acceptance-v1');
    expect(C0_ACCEPTANCE_CONSENT_TEXT).toContain('Accept proposal');
    expect(C0_ACCEPTANCE_CONSENT_TEXT).toContain('selected service packages');
    expect(C0_ACCEPTANCE_CONSENT_TEXT).toContain('not an electronic-signature process');
    expect(C0_ACCEPTANCE_CONSENT_TEXT).not.toMatch(/legally binding|signed contract|guaranteed/i);
  });

  it('creates exactly 32 random bytes encoded as unpadded base64url', () => {
    const first = createCustomerActionToken();
    const second = createCustomerActionToken();
    expect(C0_ACTION_TOKEN_BYTES).toBe(32);
    expect(first).not.toBe(second);
    expect(customerActionTokenSchema.parse(first)).toBe(first);
    expect(first).toHaveLength(43);
    expect(first).not.toMatch(/[+/=]/);
  });

  it('uses a versioned keyed digest and never accepts raw token fields at the database boundary', () => {
    const rawToken = createCustomerActionToken();
    const digest = digestCustomerActionToken(rawToken, SECRET);
    expect(customerActionTokenDigestSchema.parse(digest)).toBe(digest);
    expect(databaseTokenReferenceSchema.parse({
      tokenDigest: digest,
      keyVersion: C0_ACTION_TOKEN_HMAC_KEY_VERSION,
    })).toEqual({ tokenDigest: digest, keyVersion: 1 });
    expect(() => databaseTokenReferenceSchema.parse({
      tokenDigest: digest,
      keyVersion: 1,
      rawToken,
    })).toThrow();
    expect(() => digestCustomerActionToken(rawToken, 'too-short')).toThrow();
  });

  it('rejects raw secrets and browser telemetry from structured logs', () => {
    expect(safeCustomerActionLogSchema.parse({
      event: 'exchange_result',
      outcome: 'denied',
      requestId: UUID,
    })).toEqual({ event: 'exchange_result', outcome: 'denied', requestId: UUID });
    for (const forbidden of ['rawToken', 'cookie', 'authorization', 'ipAddress', 'userAgent', 'email']) {
      expect(() => safeCustomerActionLogSchema.parse({
        event: 'exchange_attempt',
        outcome: 'denied',
        requestId: UUID,
        [forbidden]: 'secret',
      })).toThrow();
    }
  });

  it('freezes private response and short-lived cookie controls', () => {
    expect(C0_RESPONSE_HEADERS).toEqual(expect.objectContaining({
      'Cache-Control': 'no-store, max-age=0',
      'Referrer-Policy': 'no-referrer',
    }));
    expect(C0_SESSION_COOKIE_NAME).toMatch(/^__Host-/);
    expect(C0_SESSION_COOKIE_OPTIONS).toEqual(expect.objectContaining({
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 900,
    }));
  });

  it('offers only shorter expiries under the seven-day maximum', () => {
    expect(C0_ACTION_TOKEN_LIFETIME_DAYS).toEqual([1, 3, 7]);
    expect(C0_ACTION_TOKEN_MAX_LIFETIME_SECONDS).toBe(604800);
    expect(Math.max(...C0_ACTION_TOKEN_LIFETIME_DAYS)).toBe(7);
  });
});

