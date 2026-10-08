/** @jest-environment jsdom */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProposalRoomPage from '../page';

const fetchMock = jest.fn();
const firstAssociation = '11111111-1111-4111-8111-111111111111';
const secondAssociation = '22222222-2222-4222-8222-222222222222';
const room = {
  organization: { displayName: 'Veltex Cleaning' }, proposalVersionId: 'version-1', versionNumber: 4,
  renderedContent: 'Immutable proposal content', fullOfferedTotalMinor: 32500, currency: 'USD',
  allowedActions: ['question', 'change_requested', 'declined'],
  consent: { version: 'veltex-c0-acceptance-v1', text: 'I accept the selected packages.' },
  acceptanceEnabled: true, receipt: null, expiresAt: '2026-10-09T12:00:00Z',
  packages: [
    { associationId: firstAssociation, displayPosition: 1, title: 'Kitchen service',
      scope: ['Kitchen'], amountMinor: 18500, currency: 'USD', pricingBasis: 'per_visit' },
    { associationId: secondAssociation, displayPosition: 2, title: 'Bathroom service',
      scope: ['Bathrooms'], amountMinor: 14000, currency: 'USD', pricingBasis: 'one_time' },
  ],
};

describe('R3-5 C0.4 customer acceptance surface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
    Object.defineProperty(global.crypto, 'randomUUID', { configurable: true,
      value: jest.fn(() => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') });
    window.sessionStorage.clear();
  });

  it('requires explicit package selection, entered identity, consent and final review', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: room }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        receiptId: 'receipt-1', proposalVersionId: 'version-1', acceptedAt: '2026-10-08T01:00:00Z',
        selectedAssociationIds: [firstAssociation, secondAssociation], selectedSubtotalMinor: 32500,
        fullOfferedTotalMinor: 32500, currency: 'USD', receiptSha256: 'a'.repeat(64), replayed: false,
      } }) });
    render(<ProposalRoomPage />);
    expect(await screen.findByRole('heading', { name: 'Proposal review' })).toBeInTheDocument();
    const review = screen.getByRole('button', { name: 'Review acceptance' });
    expect(review).toBeDisabled();
    const selections = screen.getAllByRole('checkbox');
    expect(selections).toHaveLength(3);
    selections.forEach((item) => expect(item).not.toBeChecked());
    fireEvent.click(screen.getByRole('checkbox', { name: /Bathroom service/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Kitchen service/ }));
    fireEvent.change(screen.getByLabelText('Name you enter'), { target: { value: 'Taylor Customer' } });
    fireEvent.change(screen.getByLabelText('Email you enter'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the selected packages.' }));
    expect(review).toBeEnabled();
    fireEvent.click(review);
    expect(screen.getByRole('heading', { name: 'Final review' })).toBeInTheDocument();
    expect(screen.getByText(/2 selected packages for \$325\.00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected packages' }));
    expect(await screen.findByRole('article', { name: 'Proposal acceptance receipt' }))
      .toBeInTheDocument();
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/public/proposal-room/acceptance',
      expect.objectContaining({ method: 'POST', headers: expect.objectContaining({
        'idempotency-key': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }) }));
    const payload = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(payload).toEqual({ selectedAssociationIds: [firstAssociation, secondAssociation],
      signerEnteredName: 'Taylor Customer', signerEnteredEmail: 'taylor@example.com' });
    expect(screen.getByText(/not an electronic signature/)).toBeInTheDocument();
  });

  it('preserves the draft and reuses the same request key after an uncertain failure', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: room }) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'unavailable' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: {
        receiptId: 'receipt-1', proposalVersionId: 'version-1', acceptedAt: '2026-10-08T01:00:00Z',
        selectedAssociationIds: [firstAssociation], selectedSubtotalMinor: 18500,
        fullOfferedTotalMinor: 32500, currency: 'USD', receiptSha256: 'b'.repeat(64), replayed: true,
      } }) });
    render(<ProposalRoomPage />);
    await screen.findByRole('heading', { name: 'Proposal review' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Kitchen service/ }));
    fireEvent.change(screen.getByLabelText('Name you enter'), { target: { value: 'Taylor Customer' } });
    fireEvent.change(screen.getByLabelText('Email you enter'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the selected packages.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review acceptance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected packages' }));
    expect(await screen.findByText(/Your selections are still here/)).toBeInTheDocument();
    expect(screen.getByText(/1 selected package for \$185\.00/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected packages' }));
    await screen.findByRole('article', { name: 'Proposal acceptance receipt' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][1].headers['idempotency-key'])
      .toBe(fetchMock.mock.calls[2][1].headers['idempotency-key']);
  });

  it('uses a new request key when the normalized acceptance payload changes', async () => {
    const randomUUID = jest.fn()
      .mockReturnValueOnce('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      .mockReturnValueOnce('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    Object.defineProperty(global.crypto, 'randomUUID', { configurable: true, value: randomUUID });
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: room }) })
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: 'unavailable' }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ data: {
        receiptId: 'receipt-2', proposalVersionId: 'version-1', acceptedAt: '2026-10-08T01:00:00Z',
        selectedAssociationIds: [firstAssociation], selectedSubtotalMinor: 18500,
        fullOfferedTotalMinor: 32500, currency: 'USD', receiptSha256: 'd'.repeat(64), replayed: false,
      } }) });
    render(<ProposalRoomPage />);
    await screen.findByRole('heading', { name: 'Proposal review' });
    fireEvent.click(screen.getByRole('checkbox', { name: /Kitchen service/ }));
    fireEvent.change(screen.getByLabelText('Name you enter'), { target: { value: 'Taylor Customer' } });
    fireEvent.change(screen.getByLabelText('Email you enter'), { target: { value: 'taylor@example.com' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the selected packages.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review acceptance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected packages' }));
    await screen.findByText(/Your selections are still here/);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.change(screen.getByLabelText('Name you enter'), { target: { value: 'Taylor Changed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review acceptance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Accept selected packages' }));
    await screen.findByRole('article', { name: 'Proposal acceptance receipt' });
    expect(fetchMock.mock.calls[1][1].headers['idempotency-key'])
      .toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(fetchMock.mock.calls[2][1].headers['idempotency-key'])
      .toBe('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  });
});
