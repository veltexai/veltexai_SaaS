import { NextRequest } from 'next/server';
import { POST as generate } from '../generate/route';
import { POST as create } from '../route';
import { PUT as update } from '../[id]/route';
import { userCanAccessTemplate } from '@/lib/templates/design-entitlement';
import { getQuickProposalDefaults } from '@/features/proposals/quick/schemas/quick-proposal';
import { buildQuickProposalGenerateRequest, buildQuickProposalPayload } from '@/features/proposals/quick/lib/build-quick-proposal-payload';
import { getScopeTemplate } from '@/features/proposals/quick/constants/scope-templates';

const completion = jest.fn();
const insert = jest.fn();
const templateId = '11111111-1111-4111-8111-111111111111';
let settingsAvailable = true;
jest.mock('openai', () => ({ __esModule: true, default: jest.fn(() => ({ chat: { completions: { create: (...args: unknown[]) => completion(...args) } } })) }));
jest.mock('@/lib/auth/auth-helpers', () => ({ getUser: async () => ({ id: 'user' }) }));
jest.mock('@/features/auth/services/get-user', () => ({ getUser: async () => ({ user: { id: 'user' } }) }));
jest.mock('@/lib/templates/design-entitlement', () => ({ userCanAccessTemplate: jest.fn(), DESIGN_NOT_ENTITLED_MESSAGE: 'Design not entitled' }));
jest.mock('@/lib/stripe/stripe', () => ({ stripe: {} }));
jest.mock('@/lib/email/service', () => ({ EmailService: {} }));
jest.mock('@/lib/analytics/server', () => ({ captureServerEvent: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: () => ({ single: async () => ({ data: { can_create_proposal: true } }) }),
    from: (table: string) => {
      const data = table === 'profiles' ? { company_name: 'QA Company' }
        : table === 'proposal_templates' ? { name: 'Executive Premium' }
        : settingsAvailable ? [{ labor_rate: 35, overhead_percentage: 15, margin_percentage: 25,
          service_type_rates: { residential: 0.15 }, production_rates: { residential: 1000 },
          frequency_multipliers: { 'one-time': 1, weekly: 0.9 } }] : [];
      const chain = { select: () => chain, eq: () => chain, order: () => chain,
        limit: async () => ({ data }), single: async () => ({ data }), insert };
      return chain;
    },
  }),
}));

const request = (body: unknown, method = 'POST') => new NextRequest('http://localhost/api/proposals', { method, body: JSON.stringify(body) });
function values(frequency: 'one-time' | 'weekly' = 'one-time') {
  return { ...getQuickProposalDefaults({ demoType: 'residential', template: getScopeTemplate('residential_deep_clean')! }), clientEmail: 'qa@example.com', clientPhone: '(555) 123-4567', serviceFrequency: frequency };
}
beforeEach(() => {
  jest.clearAllMocks(); settingsAvailable = true;
  jest.mocked(userCanAccessTemplate).mockResolvedValue(true);
  completion.mockResolvedValue({ choices: [{ message: { content: '## Service Quote & Pricing\n```veliz_pricing_table\n{"summary":{"total":"$999999.00"}}\n```' } }] });
});

it.each(['one-time', 'weekly'] as const)('returns the exact %s quote used by the generated pricing block', async frequency => {
  const built = buildQuickProposalGenerateRequest(values(frequency), templateId);
  if (!built.success) throw new Error(built.error);
  const result = await generate(request(built.payload));
  expect(result.status).toBe(200);
  const body = await result.json();
  const block = JSON.parse(body.content.match(/```veliz_pricing_table\s*([\s\S]*?)```/)[1]);
  expect(Number(block.summary.total.replace('$', ''))).toBe(body.pricing_data.price_range.low);
  expect(body.pricing_data.price_range.low).toBe(body.pricing_data.price_range.high);
  expect(body.pricing_data.hours_estimate.min).toBeGreaterThan(0);
  expect(body.content).not.toContain('999999');
});
it('fails without pricing settings instead of saving a zero/placeholder quote', async () => {
  settingsAvailable = false;
  const built = buildQuickProposalGenerateRequest(values(), templateId);
  if (!built.success) throw new Error(built.error);
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  try { expect((await generate(request(built.payload))).status).toBe(500); }
  finally { log.mockRestore(); }
  expect(completion).not.toHaveBeenCalled();
});
it('rejects incomplete AI pricing output', async () => {
  completion.mockResolvedValue({ choices: [{ message: { content: 'Incomplete quote' } }] });
  const built = buildQuickProposalGenerateRequest(values(), templateId);
  if (!built.success) throw new Error(built.error);
  expect((await generate(request(built.payload))).status).toBe(502);
});
it('enforces locked designs on Generate, Create, and Update before generation or writes', async () => {
  jest.mocked(userCanAccessTemplate).mockResolvedValue(false);
  const gen = buildQuickProposalGenerateRequest(values(), templateId);
  const save = buildQuickProposalPayload(values(), 'Content', templateId);
  if (!gen.success || !save.success) throw new Error('Invalid test inputs');
  expect((await generate(request(gen.payload))).status).toBe(403);
  expect((await create(request(save.payload))).status).toBe(403);
  expect((await update(request({ template_id: templateId }, 'PUT'), { params: Promise.resolve({ id: 'saved' }) })).status).toBe(403);
  expect(completion).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
});
