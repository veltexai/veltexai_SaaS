/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CrmBoard } from '@/features/crm/components/crm-board';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const fetchMock = jest.fn();

describe('R3-1 CRM board', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('renders an accessible board from the explicit active organization', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {
          organization_id: ORG_ID,
          viewer_price_redacted: false,
          pipelines: [{
            id: 'pipeline-1', name: 'Commercial facility', is_default: true,
            stages: [{ id: 'stage-1', label: 'Lead', category: 'new', position: 10, hidden: false }],
          }],
          opportunities: [{
            id: 'opportunity-1', name: 'North Campus', pipeline_id: 'pipeline-1',
            stage_id: 'stage-1', category: 'new', value_amount_minor: 125000,
            value_basis: 'monthly', currency: 'USD',
          }],
        } }),
      });
    render(<CrmBoard />);
    expect(await screen.findByRole('heading', { name: 'Sales pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lead' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'North Campus' })).toBeInTheDocument();
    expect(screen.getByText(/\$1,250\.00 · monthly/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/orgs/${ORG_ID}/crm/opportunities`, { cache: 'no-store' });
  });

  it('exposes labelled quick-add controls and respects a viewer-redacted payload', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {
          organization_id: ORG_ID,
          viewer_price_redacted: true,
          pipelines: [{
            id: 'pipeline-1', name: 'Residential and turnover', is_default: true,
            stages: [{ id: 'stage-1', label: 'Inquiry', category: 'new', position: 10, hidden: false }],
          }],
          opportunities: [{ id: 'opportunity-1', name: 'Turnover', pipeline_id: 'pipeline-1', stage_id: 'stage-1', category: 'new' }],
        } }),
      });
    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    expect(screen.getByText('Pricing is hidden for read-only viewers.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quick-add lead' }));
    expect(screen.getByLabelText('Contact name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Phone')).toHaveAttribute('type', 'tel');
    expect(screen.getByRole('button', { name: 'Add lead' })).toBeInTheDocument();
  });

  it('announces load failures and offers a retry', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false });
    render(<CrmBoard />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to load your active organization.'));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('requires an explicit duplicate decision and reuses the original command key', async () => {
    const commandKey = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(commandKey);
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: ORG_ID }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: {
        organization_id: ORG_ID, viewer_price_redacted: false,
        pipelines: [{ id: 'pipeline-1', name: 'Commercial', is_default: true, stages: [] }],
        opportunities: [],
      } }) })
      .mockResolvedValueOnce({
        ok: false, status: 409, json: async () => ({ duplicateCandidates: [{
          entity_type: 'contact', entity_id: 'candidate-1', matched_on: 'email',
        }] }),
      })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: { id: 'lead-1' } }) });

    render(<CrmBoard />);
    await screen.findByRole('heading', { name: 'Sales pipeline' });
    fireEvent.click(screen.getByRole('button', { name: 'Quick-add lead' }));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add lead' }));
    expect(await screen.findByRole('heading', { name: 'Review possible duplicate' })).toBeInTheDocument();
    expect(screen.getByText('Matching contact by email')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Link existing' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[2][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].headers['idempotency-key']).toBe(commandKey);
    expect(fetchMock.mock.calls[3][1].body).toContain('"duplicateDecision":"link_existing"');
  });
});
