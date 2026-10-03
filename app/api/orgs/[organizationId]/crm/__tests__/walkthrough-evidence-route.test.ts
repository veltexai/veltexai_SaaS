import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const OPPORTUNITY_ID = '44444444-4444-4444-8444-444444444444';
const WALKTHROUGH_ID = '66666666-6666-4666-8666-666666666666';

function query(result: unknown) {
  const value: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'eq', 'maybeSingle']) value[method] = jest.fn().mockReturnValue(value);
  value.maybeSingle.mockResolvedValue(result);
  value.then = jest.fn((resolve) => Promise.resolve(result).then(resolve));
  return value;
}
function client(options: { user?: { id: string } | null; role?: string | null; data?: unknown; error?: unknown }) {
  const membership = query({ data: options.role ? { role: options.role } : null, error: null });
  const from = jest.fn().mockReturnValue(membership);
  const rpc = jest.fn().mockResolvedValue({ data: options.data ?? null, error: options.error ?? null });
  createClient.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: options.user === undefined
      ? { id: USER_ID } : options.user }, error: null }) },
    from, rpc,
  });
  return { from, rpc };
}
function request(payload: unknown = {
  expectedUpdatedAt: '2026-10-03T08:00:00.000Z',
  notes: 'Observed cleanable hard floors and two restrooms.',
  markComplete: true,
}, key = 'evidence-command-1') {
  return new NextRequest('http://local/evidence', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
    body: JSON.stringify(payload),
  });
}
const context = { params: Promise.resolve({ organizationId: ORG_ID,
  opportunityId: OPPORTUNITY_ID, walkthroughId: WALKTHROUGH_ID }) };

describe('R3-2 walkthrough evidence route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('authenticates first and hides the route from viewers', async () => {
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/evidence/route');
    let state = client({ user: null });
    expect((await POST(request(), context)).status).toBe(401);
    expect(state.from).not.toHaveBeenCalled();
    state = client({ role: 'viewer' });
    expect((await POST(request(), context)).status).toBe(404);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it('validates bounded notes, timestamp, and retry key before the RPC', async () => {
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/evidence/route');
    let state = client({ role: 'estimator' });
    expect((await POST(request({ expectedUpdatedAt: 'bad', notes: '', markComplete: false }), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
    state = client({ role: 'estimator' });
    expect((await POST(request(undefined, ''), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
    state = client({ role: 'admin' });
    expect((await POST(request({ expectedUpdatedAt: '2026-10-03T08:00:00.000Z',
      notes: ' '.repeat(5), markComplete: false }), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
    state = client({ role: 'admin' });
    expect((await POST(request({ expectedUpdatedAt: '2026-10-03T08:00:00.000Z',
      notes: 'x'.repeat(5001), markComplete: false }), context)).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it.each(['x', 'x'.repeat(5000), 'Unicode observation: café — 清掃']) (
    'accepts a valid bounded note payload (%#)', async (notes) => {
      const state = client({ role: 'admin', data: [{ walkthrough_id: WALKTHROUGH_ID,
        evidence_notes: notes, evidence_completed_at: null,
        updated_at: '2026-10-03T09:00:00.000Z', replayed: false }] });
      const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/evidence/route');
      expect((await POST(request({ expectedUpdatedAt: '2026-10-03T08:00:00.000Z',
        notes, markComplete: false }), context)).status).toBe(200);
      expect(state.rpc).toHaveBeenCalledTimes(1);
    },
  );

  it('binds the URL opportunity and walkthrough to one caller-bound RPC', async () => {
    const state = client({ role: 'estimator', data: [{ walkthrough_id: WALKTHROUGH_ID,
      evidence_notes: 'Observed cleanable hard floors and two restrooms.',
      evidence_completed_at: '2026-10-03T09:00:00.000Z',
      updated_at: '2026-10-03T09:00:00.000Z', replayed: false }] });
    const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/evidence/route');
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith('command_crm_walkthrough_evidence', {
      p_organization: ORG_ID, p_opportunity: OPPORTUNITY_ID, p_walkthrough: WALKTHROUGH_ID,
      p_request_key: 'evidence-command-1', p_expected_updated_at: '2026-10-03T08:00:00.000Z',
      p_evidence_notes: 'Observed cleanable hard floors and two restrooms.', p_mark_complete: true,
    });
  });

  it.each([['42501', 404], ['40001', 409], ['23514', 422], ['XX000', 503]])(
    'maps %s to safe status %s', async (code, status) => {
      client({ role: 'admin', error: { code, message: 'private detail' } });
      const { POST } = await import('../opportunities/[opportunityId]/walkthroughs/[walkthroughId]/evidence/route');
      const response = await POST(request(), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private detail');
    },
  );
});
