import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}
function client(role: string | null, data?: unknown, error?: unknown) {
  const membership = query({ data: role ? { role } : null, error: null });
  const rpc = jest.fn().mockResolvedValue({ data: data ?? null, error: error ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER_ID } }, error: null }) },
    from: jest.fn().mockReturnValue(membership), rpc,
  });
  return { rpc };
}
function request(key = 'reactivate-0001') {
  return new NextRequest('http://local/reactivate', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify({ name: 'North Campus renewal' }),
  });
}
const context = { params: Promise.resolve({ organizationId: ORG_ID, opportunityId: OPPORTUNITY_ID }) };

describe('R3-1 reactivation route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a linked cycle through the explicit organization RPC', async () => {
    const state = client('estimator', [{ opportunity_id: '55555555-5555-4555-8555-555555555555', replayed: false }]);
    const { POST } = await import('../opportunities/[opportunityId]/reactivate/route');
    expect((await POST(request(), context)).status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('reactivate_crm_opportunity', {
      p_organization: ORG_ID, p_opportunity: OPPORTUNITY_ID,
      p_request_key: 'reactivate-0001', p_name: 'North Campus renewal',
    });
  });

  it('denies viewers before the RPC and bounds the derived package key', async () => {
    const state = client('viewer');
    const { POST } = await import('../opportunities/[opportunityId]/reactivate/route');
    expect((await POST(request(), context)).status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
    client('owner');
    expect((await POST(request('x'.repeat(141)), context)).status).toBe(400);
  });

  it.each([['42501', 404], ['23514', 422], ['XX000', 503]])(
    'maps %s safely to %s', async (code, status) => {
      client('owner', null, { code, message: 'private detail' });
      const { POST } = await import('../opportunities/[opportunityId]/reactivate/route');
      const response = await POST(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );
});
