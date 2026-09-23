/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CatalogWorkbench } from '../components/workbench';
import { composeCatalogProposal } from '../proposal';
jest.mock('@/lib/analytics/client', () => ({ captureEvent: jest.fn() }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }) }));
jest.mock('../components/catalog-document', () => ({ CatalogDocument: ({ content }: { content: string }) => <div>{content}</div> }));
beforeEach(() => { global.fetch = jest.fn(async (_url, init) => ({ ok: true, json: async () => composeCatalogProposal(JSON.parse(init?.body as string)) } as Response)); });
it('shows turnover questions only for turnover and resets on changing market', () => {
  render(<CatalogWorkbench demo />);
  expect(screen.queryByLabelText('Laundry loads')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Market'), { target: { value: 'short_term_rental' } });
  expect(screen.getByLabelText('Laundry loads')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Market'), { target: { value: 'residential' } });
  expect(screen.queryByLabelText('Laundry loads')).not.toBeInTheDocument();
});
it('requires an override reason and preserves inputs after validation failure', async () => {
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByLabelText('Override suggested price'));
  fireEvent.click(screen.getByText('Prepare / regenerate draft'));
  expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('reason');
  expect(global.fetch).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Client name')).toHaveValue('Sample customer');
});
it('removes save eligibility when assumptions change after preview', async () => {
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByText('Prepare / regenerate draft'));
  await screen.findByText('Save proposal');
  fireEvent.change(screen.getByLabelText('Hourly wage ($)'), { target: { value: '30' } });
  expect(screen.queryByText('Save proposal')).not.toBeInTheDocument();
});
it('blocks hazardous jobs and never calls generation', async () => {
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByLabelText('Hoarding, mold, bodily fluids, sharps, pests or regulated materials present (stops this estimate)'));
  expect(screen.getByText('Prepare / regenerate draft')).toBeDisabled();
  expect(global.fetch).not.toHaveBeenCalled();
});
it('retains inputs on network failure and permits retry', async () => {
  jest.mocked(global.fetch).mockRejectedValueOnce(new Error('Offline'));
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByText('Prepare / regenerate draft'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
  await waitFor(() => expect(screen.getByText('Prepare / regenerate draft')).toBeEnabled());
  expect(screen.getByLabelText('Client email')).toHaveValue('sample@example.com');
});
it.each(['recurring_standard', 'standard', 'first_deep', 'move_in_out', 'airbnb_turnover'] as const)('non-demo %s shows a first-load price', async initialJobType => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ profile: null }) } as Response));
  render(<CatalogWorkbench initialJobType={initialJobType} />);
  expect(screen.getByText(/Suggested price: \$/)).toBeInTheDocument();
  expect(screen.getByLabelText('Internal access notes (never shown to customer)')).toHaveValue('');
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
});
it('keeps transient validation visible and preserves property inputs when switching services', () => {
  render(<CatalogWorkbench demo />);
  fireEvent.change(screen.getByLabelText('Cleanable square feet'), { target: { value: '' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Review your inputs');
  fireEvent.change(screen.getByLabelText('Cleanable square feet'), { target: { value: '2400' } });
  fireEvent.change(screen.getByLabelText('Job type'), { target: { value: 'first_deep' } });
  expect(screen.getByLabelText('Cleanable square feet')).toHaveValue(2400);
});
it('sample draft cannot be saved', async () => {
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByText('Prepare / regenerate draft'));
  expect(await screen.findByText('Save proposal')).toBeDisabled();
});
it('emits taxonomy-only first-value analytics without customer or entry notes', async () => {
  const { captureEvent } = await import('@/lib/analytics/client');
  jest.mocked(captureEvent).mockClear();
  render(<CatalogWorkbench demo />);
  expect(captureEvent).toHaveBeenCalledWith('catalog_estimate_visible', expect.objectContaining({ demo: true, job_type: 'recurring_standard' }));
  expect(JSON.stringify(jest.mocked(captureEvent).mock.calls)).not.toMatch(/Sample customer|sample@example|lockbox/);
});
it.each([403, 422])('keeps a readable %s error next to preparation and retains inputs', async status => {
  global.fetch = jest.fn(async () => ({ ok: false, status, json: async () => ({ error: status === 403 ? 'Proposal limit reached. Review your plan.' : 'Review the service location.' }) } as Response));
  render(<CatalogWorkbench demo />);
  fireEvent.click(screen.getByText('Prepare / regenerate draft'));
  expect(await screen.findByRole('alert')).toHaveTextContent(status === 403 ? 'Proposal limit reached' : 'Review the service location');
  expect(screen.getByLabelText('Client name')).toHaveValue('Sample customer');
});

it('ordinary names and prose preserve the visible price; codes produce advisory only', () => {
 render(<CatalogWorkbench demo />);
 for (const value of ['Keystone Cleaning', 'Pinnacle Maids', 'Door to Door Cleaning']) {
   fireEvent.change(screen.getByLabelText('Cleaning company name / signature'), { target: { value } });
   expect(screen.getByText(/Suggested price: \$/)).toBeInTheDocument();
 }
 fireEvent.change(screen.getByLabelText('Customer-facing scope notes and agreed terms'), { target: { value: 'sweeping and mopping interior doors' } });
 expect(screen.getByText(/Suggested price: \$/)).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('Customer-facing scope notes and agreed terms'), { target: { value: 'Garage opener 7391' } });
 expect(screen.getByText(/Possible entry code in customer-facing text/)).toBeInTheDocument();
 expect(screen.getByText(/Suggested price: \$/)).toBeInTheDocument();
});
it('seeds the signature from the company profile even without cost defaults', async () => {
 global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ profile: null, companyName: 'Keystone Cleaning' }) } as Response));
 render(<CatalogWorkbench />);
 await waitFor(() => expect(screen.getByLabelText('Cleaning company name / signature')).toHaveValue('Keystone Cleaning'));
 expect(screen.getByText(/Suggested price: \$/)).toBeInTheDocument();
});

it('ongoing hours overrides leave the separately modeled initial-clean amount visible', () => {
 render(<CatalogWorkbench demo />);
 fireEvent.change(screen.getByLabelText('Override person-hours (optional)'), { target: { value: '3' } });
 expect(screen.getByText(/Initial detailed clean: \$310.00 once/)).toBeInTheDocument();
 expect(screen.getByText(/Suggested price: \$205.00/)).toBeInTheDocument();
});
