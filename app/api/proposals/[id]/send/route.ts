import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/service';
import { generateProposalPDFWithPlaywright } from '@/lib/pdf/playwright-generator';
import { Database } from '@/types/database';
import { z } from 'zod';

export const maxDuration = 60; // Allow up to 60 seconds for PDF generation
export const runtime = 'nodejs';

const sendProposalSchema = z.object({
  delivery_method: z.enum(['pdf_only', 'online_only', 'both']),
  recipient_email: z.string().email(),
  cc_emails: z.array(z.string().email()).optional(),
  subject: z.string().min(1),
  message: z.string().min(1),
  include_company_branding: z.boolean().default(true),
  send_copy_to_self: z.boolean().default(false),
  track_opens: z.boolean().default(true),
  track_downloads: z.boolean().default(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get the authenticated user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = sendProposalSchema.parse(body);

    // Get user profile for sender info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Get company profile for enhanced company data
    const { data: companyProfile } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Generate tracking ID
    const trackingId = `track_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    let pdfBuffer: Buffer | undefined;
    let proposalViewUrl: string | undefined;

    // Generate PDF if needed
    if (
      validatedData.delivery_method === 'pdf_only' ||
      validatedData.delivery_method === 'both'
    ) {
      try {
        pdfBuffer = await generateProposalPDFWithPlaywright(proposal.id);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        return NextResponse.json(
          { error: 'Failed to generate PDF attachment' },
          { status: 500 }
        );
      }
    }

    // Generate view URL if needed
    if (
      validatedData.delivery_method === 'online_only' ||
      validatedData.delivery_method === 'both'
    ) {
      proposalViewUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/view/${proposal.id}?track=${trackingId}`;
    }

    // Create proposal tracking record
    const { data: trackingRecord, error: trackingError } = await supabase
      .from('proposal_tracking')
      .insert({
        proposal_id: proposal.id,
        tracking_id: trackingId,
        recipient_email: validatedData.recipient_email,
        cc_emails: validatedData.cc_emails || [],
        subject: validatedData.subject,
        message: validatedData.message,
        delivery_method: validatedData.delivery_method,
        include_branding: validatedData.include_company_branding,
        track_opens: validatedData.track_opens,
        track_downloads: validatedData.track_downloads,
      })
      .select()
      .single();

    if (trackingError) {
      console.error('Error creating tracking record:', trackingError);
      // Continue without tracking if this fails
    }

    // Prepare email data
    const companyName = companyProfile?.company_name || 'Veltex AI';
    const senderName = profile?.full_name || user.email || 'Team';
    const baseUrl = "https://veltexai.com";
    const logoUrl = companyProfile?.logo_url || `${baseUrl}/images/IMG_3800.png`;

    const emailData = {
      clientName: proposal.client_name || 'Valued Client',
      clientEmail: validatedData.recipient_email,
      ccEmails: validatedData.cc_emails || [],
      subject: validatedData.subject,
      message: validatedData.message,
      proposalTitle: proposal.title || 'Service Proposal',
      companyName,
      logoUrl,
      senderName,
      proposalViewUrl,
      hasAttachment: !!pdfBuffer,
      trackingId,
      sendCopyToSelf: validatedData.send_copy_to_self,
      senderEmail: user.email || 'noreply@veltexservices.com',
    };

    // Send the email
    const emailSent = await EmailService.sendEnhancedProposalEmail(
      emailData,
      pdfBuffer
    );

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send proposal email' },
        { status: 500 }
      );
    }

    // Update proposal status to 'sent'
    const { error: updateError } = await supabase
      .from('proposals')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposal.id);

    if (updateError) {
      console.error('Error updating proposal status:', updateError);
      // Don't fail the request since email was sent successfully
    }

    // Log the send event
    await supabase.from('proposal_events').insert({
      proposal_id: proposal.id,
      event_type: 'sent',
      event_data: {
        delivery_method: validatedData.delivery_method,
        recipient_email: validatedData.recipient_email,
        tracking_id: trackingId,
        has_attachment: !!pdfBuffer,
        has_view_link: !!proposalViewUrl,
      },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Proposal sent successfully',
      trackingId,
      deliveryMethod: validatedData.delivery_method,
      emailSent: true,
      statusUpdated: !updateError,
      viewUrl: proposalViewUrl,
    });
  } catch (error) {
    console.error('Error sending proposal:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
