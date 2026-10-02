import { NextRequest } from 'next/server';

const createClient = jest.fn();
jest.mock('@/lib/supabase/server', () => ({ createClient }));

const ORG = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const PIPELINE = '33333333-3333-4333-8333-333333333333';
const STAGE = '44444444-4444-4444-8444-444444444444';
function client(role: string, data: unknown = [{ stage_id: STAGE, created: false }], error: unknown = null) {
  const query: Record<string, jest.Mock> = {};
  for (const method of ['select', 'eq']) query[method] = jest.fn().mockReturnValue(query);
  query.maybeSingle = jest.fn().mockResolvedValue({ data: { role }, error: null });
  const rpc = jest.fn().mockResolvedValue({ data, error });
  createClient.mockResolvedValue({ auth: { getUser: jest.fn().mockResolvedValue({
    data: { user: { id: USER } }, error: null,
  }) }, from: jest.fn().mockReturnValue(query), rpc });
  return rpc;
}
function request(body: unknown) {
  return new NextRequest('http://local/pipeline-stage', {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}
const context = { params: Promise.resolve({ organizationId: ORG, pipelineId: PIPELINE, stageId: STAGE }) };

describe('R3-1 pipeline configuration route', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lets a manager apply an absolute retry-safe stage configuration', async () => {
    const rpc = client('owner');
    const { PUT } = await import('../pipelines/[pipelineId]/stages/[stageId]/route');
    const response = await PUT(request({ label: 'Site visit', category: 'walkthrough', position: 35,
      hidden: false, pipelineName: 'Commercial sales' }), context);
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('configure_crm_pipeline_stage', {
      p_organization: ORG, p_pipeline: PIPELINE, p_stage: STAGE, p_label: 'Site visit',
      p_category: 'walkthrough', p_position: 35, p_hidden: false,
      p_pipeline_name: 'Commercial sales',
    });
  });

  it.each(['estimator', 'viewer'])('denies %s before RPC invocation', async (role) => {
    const rpc = client(role);
    const { PUT } = await import('../pipelines/[pipelineId]/stages/[stageId]/route');
    expect((await PUT(request({ label: 'Lead', category: 'new', position: 10 }), context)).status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('rejects hiding a required terminal category', async () => {
    const rpc = client('admin');
    const { PUT } = await import('../pipelines/[pipelineId]/stages/[stageId]/route');
    expect((await PUT(request({ label: 'Won', category: 'won', position: 70, hidden: true }), context)).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([['42501', 404], ['23505', 409], ['23514', 422], ['XX000', 503]])(
    'maps %s safely to %s', async (code, status) => {
      client('admin', null, { code, message: 'private database detail' });
      const { PUT } = await import('../pipelines/[pipelineId]/stages/[stageId]/route');
      const response = await PUT(request({ label: 'Lead', category: 'new', position: 10 }), context);
      expect(response.status).toBe(status);
      expect(JSON.stringify(await response.json())).not.toContain('private database detail');
    },
  );
});
