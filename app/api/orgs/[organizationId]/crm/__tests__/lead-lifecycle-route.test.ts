import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const LEAD = '33333333-3333-4333-8333-333333333333';
const TARGET = '44444444-4444-4444-8444-444444444444';
const REASON = '55555555-5555-4555-8555-555555555555';

function client(role: string, data: unknown = [{ lead_id: LEAD, action: 'contacted', replayed: false }], error: unknown = null) {
  const query: any = {};
  for (const method of ['select', 'eq']) query[method] = jest.fn().mockReturnValue(query);
  query.maybeSingle = jest.fn().mockResolvedValue({ data: { role }, error: null });
  const rpc = jest.fn().mockResolvedValue({ data, error });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: USER } }, error: null }) },
    from: jest.fn().mockReturnValue(query), rpc,
  });
  return rpc;
}

const context = { params: Promise.resolve({ organizationId: ORG, leadId: LEAD }) };
function request(body: unknown, key = 'lead-command-0001') {
  return new NextRequest('http://local/lifecycle', {
    method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key },
    body: JSON.stringify(body),
  });
}

describe('R3-1 lead lifecycle route', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['contacted', { action: 'contacted' }, { p_action: 'contacted', p_note: null }],
    ['junk', { action: 'junk', note: 'Automated solicitation' }, { p_action: 'junk', p_note: 'Automated solicitation' }],
    ['merged', { action: 'merged', mergedIntoLeadId: TARGET }, { p_action: 'merged', p_merged_into_lead: TARGET }],
    ['disqualified', { action: 'disqualified', lossReasonId: REASON }, { p_action: 'disqualified', p_disqualification_reason: REASON }],
  ])('sends the %s command with scoped evidence', async (_label, body, expected) => {
    const rpc = client('estimator');
    const { POST } = await import('../leads/[leadId]/lifecycle/route');
    const response = await POST(request(body), context);
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('command_crm_lead', expect.objectContaining({
      p_organization: ORG, p_lead: LEAD, p_request_key: 'lead-command-0001', ...expected,
    }));
  });

  it('rejects junk without an operator reason before the RPC', async () => {
    const rpc = client('owner');
    const { POST } = await import('../leads/[leadId]/lifecycle/route');
    expect((await POST(request({ action: 'junk', note: '' }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('denies viewers without exposing the lead', async () => {
    const rpc = client('viewer');
    const { POST } = await import('../leads/[leadId]/lifecycle/route');
    expect((await POST(request({ action: 'contacted' }), context)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
});
