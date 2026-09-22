import { NextRequest } from 'next/server';
import { POST } from '../preview/route';
import { GET as getProfile, PUT as saveProfile } from '../profile/route';
import { defaultJob } from '@/features/service-catalog/catalog';
import { recordFunnelEvents } from '@/lib/analytics/funnel-server';
let user: { id: string } | null = { id: 'owner' };
let usage = true, failed = false, entitled = true, owner = true;
const eq = jest.fn(); const upsert = jest.fn();
jest.mock('@/features/auth/services/get-user', () => ({ getUser: async () => ({ user }) }));
jest.mock('@/lib/templates/design-entitlement', () => ({ userCanAccessTemplate: async () => entitled }));
jest.mock('@/lib/analytics/funnel-server', () => ({ recordFunnelEvents: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => ({
  rpc: () => ({ single: async () => ({ data: { can_create_proposal: usage }, error: failed ? {} : null }) }),
  from: () => { const chain = { select: () => chain, eq: (...args: unknown[]) => { eq(...args); return chain; }, single: async () => ({ data: owner ? { id: 'owned' } : null }), maybeSingle: async () => ({ data: null, error: failed ? {} : null }), upsert }; return chain; },
}) }));
const input = () => ({ job: { ...defaultJob('airbnb_turnover'), access: 'Confirmed' }, client: { client_name: 'Private customer', client_email: 'private@example.com', contact_phone: '555', service_location: 'Private address', facility_size: 1200, service_frequency: 'one-time' } });
const req = (body: unknown, method = 'POST') => new NextRequest('http://localhost/api/service-catalog/preview', { method, body: JSON.stringify(body) });
beforeEach(() => { user = { id: 'owner' }; usage = true; failed = false; entitled = true; owner = true; jest.clearAllMocks(); upsert.mockResolvedValue({ error: null }); });
it('requires authentication on preview and profile reads/writes', async () => {
  user = null; expect((await POST(req(input()))).status).toBe(401);
  expect((await getProfile()).status).toBe(401); expect((await saveProfile(req({}))).status).toBe(401);
});
it('fails closed on usage errors and exhausted new-proposal allowance', async () => {
  failed = true; expect((await POST(req(input()))).status).toBe(503);
  failed = false; usage = false; expect((await POST(req(input()))).status).toBe(403);
});
it('validates hazard, unknown version and segment before analytics', async () => {
  for (const patch of [{ regulatedHazards: true }, { catalogVersion: 'future' }, { segment: 'commercial' }]) {
    const body = input(); expect((await POST(req({ ...body, job: { ...body.job, ...patch } }))).status).toBe(422);
  }
  expect(recordFunnelEvents).not.toHaveBeenCalled();
});
it('enforces template entitlement', async () => {
  entitled = false;
  expect((await POST(req({ ...input(), templateId: '11111111-1111-4111-8111-111111111111' }))).status).toBe(403);
});
it('allows owner regeneration at quota but never another owner', async () => {
  usage = false;
  const body = { ...input(), proposalId: '11111111-1111-4111-8111-111111111111' };
  expect((await POST(req(body))).status).toBe(200);
  expect(eq).toHaveBeenCalledWith('user_id', 'owner');
  owner = false; expect((await POST(req(body))).status).toBe(404);
});
it('emits only non-PII taxonomy after deterministic generation', async () => {
  const result = await POST(req(input())); expect(result.status).toBe(200);
  const proposal = await result.json(); expect(proposal.service_specific_data.catalogJob.jobType).toBe('airbnb_turnover');
  expect(recordFunnelEvents).toHaveBeenCalledWith([expect.objectContaining({ properties: expect.objectContaining({ business_segment: 'short_term_rental', job_type: 'airbnb_turnover' }) })]);
  expect(JSON.stringify(jest.mocked(recordFunnelEvents).mock.calls)).not.toContain('Private');
});
it('profile writes are scoped to session owner and reject invalid service/market pairs', async () => {
  expect((await saveProfile(req({ markets: ['commercial'], services: ['airbnb_turnover'], costs: defaultJob().costs, equipment: [] }))).status).toBe(422);
  expect(upsert).not.toHaveBeenCalled();
  expect((await saveProfile(req({ markets: ['short_term_rental'], services: ['airbnb_turnover'], costs: defaultJob().costs, equipment: [] }))).status).toBe(200);
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner' }));
});
it('demo previews do not emit activation events; regeneration has a distinct name', async () => {
  const body = input(); body.job = { ...body.job, demo: true } as typeof body.job;
  expect((await POST(req(body))).status).toBe(200);
  expect(recordFunnelEvents).not.toHaveBeenCalled();
  expect((await POST(req({ ...input(), proposalId: '11111111-1111-4111-8111-111111111111' }))).status).toBe(200);
  expect(recordFunnelEvents).toHaveBeenCalledWith([expect.objectContaining({ eventName: 'proposal_regenerated' })]);
});
