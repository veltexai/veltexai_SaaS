import { NextRequest } from 'next/server';

const rpc = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ rpc }),
}));

const SECRET = '0123456789abcdef0123456789abcdef';
const TOKEN = 'A'.repeat(43);
const COOKIE = '__Host-veltex_c0_session';

describe('R3-5 C0.2 public proposal-room routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VELTEX_C0_ACTION_TOKEN_HMAC_KEY_V1 = SECRET;
  });

  afterAll(() => { delete process.env.VELTEX_C0_ACTION_TOKEN_HMAC_KEY_V1; });

  it('exchanges only a token digest and returns a hardened opaque session cookie', async () => {
    rpc.mockResolvedValue({ data: [{ version_number: 3, allowed_actions: ['question'] }], error: null });
    const { POST } = await import('../session/route');
    const response = await POST(new NextRequest('https://preview.example/proposal-room/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('exchange_crm_customer_action_token_internal',
      expect.objectContaining({
        p_token_hmac_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        p_session_hmac_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(TOKEN);
    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${COOKIE}=`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('uses a session digest to read only the customer-safe projection', async () => {
    rpc.mockResolvedValue({ data: [{ version_number: 3, packages: [] }], error: null });
    const { GET } = await import('../route');
    const response = await GET(new NextRequest('https://preview.example/api/public/proposal-room', {
      headers: { cookie: `${COOKIE}=${TOKEN}` },
    }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('read_crm_customer_proposal_room_internal', {
      p_session_hmac_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(TOKEN);
  });

  it('appends a bounded response with idempotency and no raw session at the database boundary', async () => {
    rpc.mockResolvedValue({ data: [{ response_id: '11111111-1111-4111-8111-111111111111', replayed: false }], error: null });
    const { POST } = await import('../responses/route');
    const response = await POST(new NextRequest('https://preview.example/api/public/proposal-room/responses', {
      method: 'POST',
      headers: { cookie: `${COOKIE}=${TOKEN}`, 'content-type': 'application/json',
        'idempotency-key': 'response-0001' },
      body: JSON.stringify({ kind: 'question', message: 'Does this include supplies?' }),
    }));
    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('command_crm_customer_proposal_response_internal',
      expect.objectContaining({
        p_response_kind: 'question', p_request_key: 'response-0001',
        p_session_hmac_sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }));
    expect(JSON.stringify(rpc.mock.calls)).not.toContain(TOKEN);
  });

  it('returns one uniform response for malformed, missing and rejected credentials', async () => {
    const { POST } = await import('../session/route');
    const malformed = await POST(new NextRequest('https://preview.example/api/public/proposal-room/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'short' }),
    }));
    rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    const rejected = await POST(new NextRequest('https://preview.example/api/public/proposal-room/session', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: TOKEN }),
    }));
    expect(malformed.status).toBe(404);
    expect(rejected.status).toBe(404);
    expect(await malformed.json()).toEqual(await rejected.json());
  });
});
