jest.mock('nodemailer', () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));
jest.mock('resend', () => ({ Resend: jest.fn() }));

import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email/service';

const mockSendMail = jest.fn();
const mockCreateTransport = nodemailer.createTransport as jest.Mock;
const mockCreateClient = createClient as jest.Mock;
const mockSingle = jest.fn();

describe('enhanced proposal email transport', () => {
  const previousResendKey = process.env.RESEND_API_KEY;
  const previousSenderAddress = process.env.EMAIL_SENDER_ADDRESS;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_SENDER_ADDRESS;
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
    mockCreateClient.mockReturnValue({
      from: () => ({
        select: () => ({ order: () => ({ limit: () => ({ single: mockSingle }) }) }),
      }),
    });
    mockSingle.mockResolvedValue({
      data: {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 465,
        smtp_username: 'sender@example.com',
        smtp_password: 'secret-not-logged',
        smtp_from_email: 'sender@example.com',
        smtp_from_name: 'Preview Cleaning Co',
        enable_email_notifications: true,
      },
      error: null,
    });
    mockSendMail.mockResolvedValue({ messageId: 'smtp-message' });
  });

  afterAll(() => {
    if (previousResendKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousResendKey;
    if (previousSenderAddress === undefined) delete process.env.EMAIL_SENDER_ADDRESS;
    else process.env.EMAIL_SENDER_ADDRESS = previousSenderAddress;
  });

  it('falls back to configured SMTP and preserves the PDF plus tracking header', async () => {
    const sent = await EmailService.sendEnhancedProposalEmail(
      {
        clientName: 'Release One Residential QA',
        clientEmail: 'recipient@example.com',
        subject: 'Proposal',
        message: 'Please review.',
        proposalTitle: 'Recurring Home Cleaning',
        companyName: 'Preview Cleaning Co',
        senderName: 'Owner',
        senderEmail: 'sender@example.com',
        proposalViewUrl: 'https://example.com/view/token',
        hasAttachment: true,
        trackingId: 'tracking-token',
      },
      Buffer.from('pdf'),
    );

    expect(sent).toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true,
    }));
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'recipient@example.com',
      headers: { 'X-Proposal-Tracking-ID': 'tracking-token' },
      attachments: [expect.objectContaining({
        filename: 'recurring_home_cleaning_proposal.pdf',
        contentType: 'application/pdf',
      })],
    }));
  });
});
