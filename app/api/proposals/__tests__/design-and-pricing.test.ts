import { NextRequest } from 'next/server';
import { POST as generate } from '../generate/route';
import { POST as create } from '../route';
import { GET as reopen, PUT as update } from '../[id]/route';
import { userCanAccessTemplate } from '@/lib/templates/design-entitlement';
import { getQuickProposalDefaults } from '@/features/proposals/quick/schemas/quick-proposal';
import { buildQuickProposalGenerateRequest, buildQuickProposalPayload, buildQuickProposalSavePayload } from '@/features/proposals/quick/lib/build-quick-proposal-payload';
import { getScopeTemplate } from '@/features/proposals/quick/constants/scope-templates';
import { PricingEngine } from '@/features/proposals/services/pricing-engine';
import type { Database } from '@/types/database';
import type { ServiceFrequency } from '@/features/proposals/schemas/proposal';

type PricingSettings = Database['public']['Tables']['pricing_settings']['Row'];
type QuoteSettings = Pick<PricingSettings, 'labor_rate' | 'overhead_percentage' | 'margin_percentage' | 'service_type_rates' | 'production_rates' | 'frequency_multipliers'>;

const completion = jest.fn();
const insert = jest.fn();
const templateId = '11111111-1111-4111-8111-111111111111';
let originalOpenAiApiKey: string | undefined;
let settingsAvailable = true;
let settings: QuoteSettings;
let savedProposal: Record<string, unknown> | null = null;
jest.mock('openai', () => ({ __esModule: true, default: jest.fn(() => ({ chat: { completions: { create: (...args: unknown[]) => completion(...args) } } })) }));
jest.mock('@/lib/auth/auth-helpers', () => ({ getUser: async () => ({ id: 'user' }) }));
jest.mock('@/features/auth/services/get-user', () => ({ getUser: async () => ({ user: { id: 'user' } }) }));
jest.mock('@/lib/templates/design-entitlement', () => ({ userCanAccessTemplate: jest.fn(), DESIGN_NOT_ENTITLED_MESSAGE: 'Design not entitled' }));
jest.mock('@/lib/stripe/stripe', () => ({ stripe: {} }));
jest.mock('@/lib/email/service', () => ({ EmailService: {} }));
jest.mock('@/lib/analytics/server', () => ({ captureServerEvent: jest.fn() }));
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: () => ({ data: true, single: async () => ({ data: { can_create_proposal: true, current_usage: 1 } }) }),
    from: (table: string) => {
      const data = table === 'profiles' ? { company_name: 'QA Company' }
        : table === 'proposal_templates' ? { name: 'Executive Premium' }
        : table === 'proposals' ? savedProposal
        : settingsAvailable ? [settings] : [];
      const chain = { select: () => chain, eq: () => chain, order: () => chain,
        limit: async () => ({ data }), single: async () => ({ data }), insert };
      return chain;
    },
  }),
}));

const request = (body: unknown, method = 'POST') => new NextRequest('http://localhost/api/proposals', { method, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) });
function values(frequency: 'one-time' | 'weekly' = 'one-time') {
  return { ...getQuickProposalDefaults({ demoType: 'residential', template: getScopeTemplate('residential_deep_clean')! }), clientEmail: 'qa@example.com', clientPhone: '(555) 123-4567', serviceFrequency: frequency };
}
beforeEach(() => {
  originalOpenAiApiKey = process.env.OPENAI_API_KEY;
  // The route checks configuration even though the OpenAI client is mocked.
  process.env.OPENAI_API_KEY = 'unit-test-placeholder';
  jest.clearAllMocks(); settingsAvailable = true;
  settings = { labor_rate: 35, overhead_percentage: 15, margin_percentage: 25,
    service_type_rates: { residential: 0.15 }, production_rates: { residential: 1000 },
    frequency_multipliers: { 'one-time': 1, weekly: 0.9 } };
  savedProposal = null;
  insert.mockImplementation((row: Record<string, unknown>) => {
    savedProposal = JSON.parse(JSON.stringify({ ...row, id: 'saved' }));
    return { select: () => ({ single: async () => ({ data: savedProposal }) }) };
  });
  jest.mocked(userCanAccessTemplate).mockResolvedValue(true);
  completion.mockResolvedValue({ choices: [{ message: { content: '## Service Quote & Pricing\n```veliz_pricing_table\n{"summary":{"total":"$999999.00"}}\n```' } }] });
});

afterEach(() => {
  if (originalOpenAiApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalOpenAiApiKey;
  }
});

it('returns 503 without calling OpenAI when the API key is missing', async () => {
  delete process.env.OPENAI_API_KEY;
  const built = buildQuickProposalGenerateRequest(values(), templateId);
  if (!built.success) throw new Error(built.error);
  const result = await generate(request(built.payload));
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual({ error: 'OpenAI API key not configured' });
  expect(completion).not.toHaveBeenCalled();
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

describe('Quick commercial monthly pricing basis', () => {
  beforeEach(() => {
    // Seed/fallback settings that reproduced the production $46,339.13 quote.
    settings = { labor_rate: 22, overhead_percentage: 12, margin_percentage: 20,
      service_type_rates: { commercial: 0.15 }, production_rates: {}, frequency_multipliers: null };
  });

  function commercialValues(size = 12000, frequency: ServiceFrequency = '5x-week') {
    return { ...getQuickProposalDefaults({ demoType: 'commercial', template: getScopeTemplate('commercial_office')! }),
      clientEmail: 'qa@example.com', clientPhone: '(555) 123-4567', squareFootage: size, serviceFrequency: frequency };
  }

  function commercialRequest(size = 12000, frequency: ServiceFrequency = '5x-week') {
    const built = buildQuickProposalGenerateRequest(commercialValues(size, frequency), templateId);
    if (!built.success) throw new Error(built.error);
    return built.payload;
  }

  function pricingTable(content: string): { rows: { pricePerMonth: string; frequency: string }[]; summary: { total: string; subtotal: string; tax: string } } {
    const match = content.match(/```veliz_pricing_table\s*([\s\S]*?)```/);
    if (!match) throw new Error('Missing pricing table');
    return JSON.parse(match[1]);
  }

  it.each([[12000, 2138.40, '$2,138.40'], [9000, 1603.80, '$1,603.80']] as const)(
    'commercial $/sq-ft is a monthly recurring basis and must never be multiplied by monthly visit count (%i sq ft)',
    async (size, expected, formatted) => {
      const result = await generate(request(commercialRequest(size)));
      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.pricing_data.price_range).toEqual({ low: expected, high: expected });
      const table = pricingTable(body.content);
      expect(table.rows).toEqual([{ service: 'Standard Janitorial Service', frequency: '5x weekly', pricePerMonth: formatted }]);
      expect(table.summary).toEqual({ subtotal: formatted, tax: '$0.00', total: formatted });
      expect(body.content).not.toContain('999999');
      // Monetary billing basis does not change the existing labor-hour estimate.
      expect(body.pricing_data.hours_estimate.min).toBeCloseTo(Math.ceil(size / 600) * 21.67);
    },
  );

  it.each([
    ['1x-month', 2376], ['bi-weekly', 2257.20], ['weekly', 2138.40],
    ['2x-week', 2138.40], ['3x-week', 2138.40], ['5x-week', 2138.40], ['daily', 2138.40],
  ] as const)('preserves existing frequency adjustments for %s', async (frequency, expected) => {
    const result = await generate(request(commercialRequest(12000, frequency)));
    expect(result.status).toBe(200);
    expect((await result.json()).pricing_data.price_range).toEqual({ low: expected, high: expected });
  });

  it('preserves the engine input and its non-unit multiplier plus the route discount', async () => {
    settings.frequency_multipliers = { 'one-time': 1.1, weekly: 0.8 };
    const calculate = jest.spyOn(PricingEngine.prototype, 'calculatePricing');
    try {
      const result = await generate(request(commercialRequest()));
      expect(calculate).toHaveBeenCalledWith(expect.objectContaining({ serviceFrequency: 'one-time' }));
      // 1800 × 1.1 × 1.32 × 0.8, with no monthly visits expansion.
      expect((await result.json()).pricing_data.price_range.low).toBe(2090.88);
    } finally { calculate.mockRestore(); }
  });

  it('keeps Advanced fallback pricing unchanged even with the same scope template', async () => {
    const { proposal_flow, ...advanced } = commercialRequest();
    expect(proposal_flow).toBe('quick');
    const result = await generate(request(advanced));
    const body = await result.json();
    expect(body.pricing_data.price_range.low).toBe(46339.13);
    expect(pricingTable(body.content).summary.total).toBe('$46339.13');
  });

  it.each([
    ['commercial', 'one-time', 12000, 2376],
    ['residential', 'one-time', 1500, 316.80],
    ['residential', 'weekly', 1500, 1234.57],
  ] as const)('keeps %s %s pricing unchanged', async (serviceType, frequency, size, expected) => {
    const payload = { ...commercialRequest(size, frequency), service_type: serviceType };
    const result = await generate(request(payload));
    expect((await result.json()).pricing_data.price_range.low).toBe(expected);
  });

  it.each(['quick', 'advanced'] as const)('preserves supplied %s pricing without repricing or discounting', async flow => {
    const snapshot = { price_range: { low: 3000, high: 3200 }, hours_estimate: { min: 12, max: 18 },
      assumptions: { labor_rate: 22, overhead_percentage: 12, margin_percentage: 20, production_rate: { min: 600, max: 600 } } };
    const result = await generate(request({ ...commercialRequest(), proposal_flow: flow, pricing_data: snapshot }));
    const body = await result.json();
    expect(body.pricing_data).toEqual(snapshot);
    expect(pricingTable(body.content).summary.total).toBe(flow === 'quick' ? '$3,100.00' : '$3100.00');
  });

  it('keeps add-on monthly normalization and separate base pricing intact', async () => {
    const selected_addons = [
      { label: 'Monthly', frequency: 'monthly', qty: 1, rate: 100 },
      { label: 'Quarterly', frequency: 'quarterly', subtotal: 300 },
      { label: 'Annual', frequency: 'annual', subtotal: 1200 },
      { label: 'One-time', frequency: 'one_time', subtotal: 1200 },
      { label: 'Supplied monthly amount', frequency: 'annual', subtotal: 1200, monthly_amount: 25 },
    ];
    const result = await generate(request({ ...commercialRequest(), selected_addons }));
    const body = await result.json();
    expect(body.pricing_data.price_range.low).toBe(2138.40);
    const table = pricingTable(body.content);
    expect(table.rows.map(row => row.pricePerMonth)).toEqual(['$2,138.40', '$100.00', '$100.00', '$100.00', '$100.00', '$25.00']);
    expect(table.summary.total).toBe('$2,563.40');
  });

  it('keeps one-time residential add-ons payable in full', async () => {
    const result = await generate(request({ ...commercialRequest(1500, 'one-time'), service_type: 'residential',
      selected_addons: [{ label: 'One-time', frequency: 'one_time', subtotal: 1200 }] }));
    const body = await result.json();
    expect(body.pricing_data.price_range.low).toBe(316.80);
    expect(pricingTable(body.content).rows[1].pricePerMonth).toBe('$1200.00');
    expect(pricingTable(body.content).summary.total).toBe('$1516.80');
  });

  it('uses the discounted monthly total to derive per-visit scope prices', async () => {
    const payload = commercialRequest();
    // No design selects the Basic structure, which includes scope money.
    delete payload.template_id;
    const result = await generate(request(payload));
    expect(result.status).toBe(200);
    const prompt = completion.mock.calls[0][0].messages[1].content as string;
    expect(prompt).toContain('"costPerVisit":"$98.68"');
    expect(prompt).toContain('"monthlyCost":"$2,138.40"');
    expect(prompt).toContain('$2,138.40 monthly cost.');
  });

  it('retains the corrected quote through generate, create, and reopen', async () => {
    const generated = await generate(request(commercialRequest()));
    const body = await generated.json();
    const built = buildQuickProposalSavePayload(commercialValues(), body.content, templateId, body.pricing_data);
    if (!built.success) throw new Error(built.error);
    expect(built.payload).not.toHaveProperty('proposal_flow');
    const created = await create(request(built.payload));
    expect(created.status).toBe(200);
    expect((await created.json()).id).toBe('saved');
    expect(insert).toHaveBeenCalledTimes(1);
    const reopened = await reopen(request({}, 'GET'), { params: Promise.resolve({ id: 'saved' }) });
    const { proposal } = await reopened.json();
    expect(proposal.pricing_data.price_range).toEqual({ low: 2138.40, high: 2138.40 });
    expect(proposal.generated_content).toBe(body.content);
    expect(pricingTable(proposal.generated_content).summary.total).toBe('$2,138.40');
    expect(proposal.service_frequency).toBe('5x-week');
  });
});
