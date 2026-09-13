/** @jest-environment jsdom */
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuickProposalFlow } from '../components/quick-proposal-flow';
import { getScopeTemplate } from '../constants/scope-templates';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
jest.mock('@/features/proposals/hooks/use-user-tier', () => ({ useUserTier: () => ({ tier: 'professional', isLoading: false }) }));
jest.mock('../components/design-template-picker', () => ({ DesignTemplatePicker: () => <div>Design picker</div> }));
jest.mock('@/lib/analytics', () => ({ ANALYTICS_EVENTS: {}, captureEvent: jest.fn() }));
jest.mock('@/lib/monitoring', () => ({ captureProposalFailure: jest.fn() }));

const quote = {
  price_range: { low: 415.19, high: 415.19 }, hours_estimate: { min: 2, max: 2 },
  assumptions: { labor_rate: 35, overhead_percentage: 15, margin_percentage: 25, production_rate: { min: 800, max: 800 } },
};
const fetchMock = jest.fn();
const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data });
beforeEach(() => { jest.clearAllMocks(); fetchMock.mockReset(); global.fetch = fetchMock; });
function openReview(demoType: 'residential' | 'commercial' = 'residential', frequency?: string) {
  render(<QuickProposalFlow demoType={demoType} userId="user" template={getScopeTemplate(demoType === 'commercial' ? 'commercial_office' : 'residential_deep_clean')!} usedFallback={false} designTemplateId="11111111-1111-4111-8111-111111111111" />);
  fireEvent.change(screen.getByPlaceholderText('client@example.com'), { target: { value: 'qa@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('Required before save'), { target: { value: '(555) 123-4567' } });
  if (frequency) fireEvent.change(screen.getByRole('combobox', { name: 'Service frequency*' }), { target: { value: frequency } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}
it('saves the exact structured quote and one-time context returned by generation', async () => {
  fetchMock.mockResolvedValueOnce(response({ content: '## Service Quote & Pricing\nQuote', pricing_data: quote }))
    .mockResolvedValueOnce(response({ id: 'saved' }));
  openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Save Proposal' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/proposals/saved'));
  const saved = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(saved.pricing_data).toEqual(quote);
  expect(saved.global_inputs.service_frequency).toBe('one-time');
  expect(saved.service_specific_data.scope_template_id).toBe('residential_deep_clean');
});
it('sends the Quick marker and retains the corrected commercial monthly quote on save', async () => {
  const monthlyQuote = { ...quote, price_range: { low: 4490.64, high: 4490.64 } };
  const content = '## Service Quote & Pricing\n```veliz_pricing_table\n{"rows":[{"service":"Standard Janitorial Service","frequency":"5x weekly","pricePerMonth":"$4,490.64"}],"summary":{"total":"$4,490.64"}}\n```';
  fetchMock.mockResolvedValueOnce(response({ content, pricing_data: monthlyQuote }))
    .mockResolvedValueOnce(response({ id: 'saved' }));
  openReview('commercial');
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
  expect(await screen.findByDisplayValue(/veliz_pricing_table/)).toHaveValue(content);
  fireEvent.click(await screen.findByRole('button', { name: 'Save Proposal' }));
  await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/proposals/saved'));
  const generated = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(generated).toMatchObject({ proposal_flow: 'quick', service_type: 'commercial', facility_size: 12000, service_frequency: '5x-week' });
  const saved = JSON.parse(fetchMock.mock.calls[1][1].body);
  expect(saved).not.toHaveProperty('proposal_flow');
  expect(saved.pricing_data).toEqual(monthlyQuote);
  expect(saved.generated_content).toBe(content);
  expect(saved.global_inputs.service_frequency).toBe('5x-week');
});
it('cannot save an in-flight quote after its inputs changed', async () => {
  let finish!: (value: ReturnType<typeof response>) => void;
  fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
  fireEvent.change(screen.getByPlaceholderText('Access notes, supply assumptions, exclusions, or follow-up questions'), { target: { value: 'New scope notes' } });
  await act(async () => finish(response({ content: 'Quote', pricing_data: quote })));
  expect(screen.getByRole('button', { name: 'Save Proposal' })).toBeDisabled();
  expect(screen.getByText(/must generate again before saving/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it('does not accept a generation response without structured pricing', async () => {
  fetchMock.mockResolvedValue(response({ content: 'Quote' }));
  openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
  await screen.findByText(/We could not generate the proposal preview/);
  expect(screen.queryByRole('button', { name: 'Save Proposal' })).not.toBeInTheDocument();
});

it('does not save manually edited pricing that disagrees with the structured quote', async () => {
  const content = '## Service Quote & Pricing\n```veliz_pricing_table\n{"summary":{"total":"$415.19"}}\n```';
  fetchMock.mockResolvedValue(response({ content, pricing_data: quote }));
  openReview();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
  await screen.findByRole('button', { name: 'Save Proposal' });
  fireEvent.change(screen.getByDisplayValue(/veliz_pricing_table/), { target: { value: content.replace('$415.19', '$1.00') } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Proposal' }));
  expect(screen.getByText(/The pricing section was edited/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it.each([['4x-week', 3956.04], ['6x-week', 4918.32]] as const)(
  'selects %s in Commercial Quick and saves the returned snapshot unchanged', async (frequency, expected) => {
    const monthlyQuote = { ...quote, price_range: { low: expected, high: expected } };
    fetchMock.mockResolvedValueOnce(response({ content: '## Service Quote & Pricing\nQuote', pricing_data: monthlyQuote }))
      .mockResolvedValueOnce(response({ id: 'saved' }));
    openReview('commercial', frequency);
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Generate Proposal' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save Proposal' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/proposals/saved'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).service_frequency).toBe(frequency);
    const saved = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(saved.global_inputs.service_frequency).toBe(frequency);
    expect(saved.pricing_data).toEqual(monthlyQuote);
  },
);

it('does not offer 4x or 6x weekly for Residential Quick', () => {
  render(<QuickProposalFlow demoType="residential" userId="user" template={getScopeTemplate('residential_recurring')!}
    usedFallback={false} />);
  expect(screen.queryByRole('option', { name: '4x per week' })).not.toBeInTheDocument();
  expect(screen.queryByRole('option', { name: '6x per week' })).not.toBeInTheDocument();
});
