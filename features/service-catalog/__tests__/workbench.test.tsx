/** @jest-environment jsdom */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CatalogWorkbench } from '../components/workbench';
import { composeCatalogProposal } from '../proposal';
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
  expect(await screen.findByRole('alert')).toHaveTextContent('reason');
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
  fireEvent.click(screen.getByLabelText('Hazardous or regulated materials present (stops this estimate)'));
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
