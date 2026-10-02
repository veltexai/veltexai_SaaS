import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));
const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const OPPORTUNITY = '33333333-3333-4333-8333-333333333333';
function client(role: string, data: unknown = [{ opportunity_id: OPPORTUNITY, updated_at: '2026-10-01T20:00:00Z' }], error: unknown = null) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq']) query[method] = jest.fn().mockReturnValue(query);
  query.maybeSingle = jest.fn().mockResolvedValue({ data: { role }, error: null });
  const rpc = jest.fn().mockResolvedValue({ data, error });
  createClient.mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) }, from: jest.fn().mockReturnValue(query), rpc });
  return rpc;
}
const context = { params: Promise.resolve({ organizationId: ORG, opportunityId: OPPORTUNITY }) };
function request(body: Record<string, unknown> = {}) {
  return new NextRequest('http://local/opportunity', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
    expectedUpdatedAt: '2026-10-01T19:00:00Z', name: 'North Campus', serviceFamily: 'janitorial',
    valueAmountMinor: 120000, valueBasis: 'monthly', currency: 'USD', ...body,
  }) });
}

describe('R3-1 opportunity detail route', () => {
  beforeEach(() => jest.clearAllMocks());
  it('binds absolute details and optimistic concurrency to the scoped RPC', async () => {
    const rpc = client('estimator');
    const { PATCH } = await import('../opportunities/[opportunityId]/route');
    expect((await PATCH(request(), context)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('update_crm_opportunity_details', expect.objectContaining({
      p_organization: ORG, p_opportunity: OPPORTUNITY,
      p_expected_updated_at: '2026-10-01T19:00:00Z', p_value_amount_minor: 120000,
    }));
  });
  it('denies viewers before RPC invocation', async () => {
    const rpc = client('viewer');
    const { PATCH } = await import('../opportunities/[opportunityId]/route');
    expect((await PATCH(request(), context)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('requires the pricing triple together', async () => {
    const rpc = client('owner');
    const { PATCH } = await import('../opportunities/[opportunityId]/route');
    expect((await PATCH(request({ valueBasis: null, currency: null }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([['42501', 404], ['40001', 409], ['23514', 422], ['XX000', 503]])(
    'maps %s safely to %s', async (code, status) => {
      client('admin', null, { code, message: 'private detail' });
      const { PATCH } = await import('../opportunities/[opportunityId]/route');
      const response = await PATCH(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    });
});
