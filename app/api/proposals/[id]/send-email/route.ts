import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/service';
import { exportProposalToPDF } from '@/lib/pdf-export';
import { Database } from '@/types/database';

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

    // Check if proposal has client email
    if (!proposal.client_email) {
      return NextResponse.json(
        { error: 'Client email is required to send proposal' },
        { status: 400 }
      );
    }

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

    // Parse request body for options
    const body = await request.json();
    const { includeAttachment = true, includeViewLink = false } = body;

    let pdfBuffer: Buffer | undefined;
    
    // Generate PDF if attachment is requested
    if (includeAttachment) {
      try {
        const pdfUint8Array = await exportProposalToPDF(proposal, {
          companyProfile: companyProfile,
          template: 'modern',
          includeServiceDetails: true,
          includePricingBreakdown: true,
          includeServiceReferences: true,
        });
        pdfBuffer = Buffer.from(pdfUint8Array);
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        return NextResponse.json(
          { error: 'Failed to generate PDF attachment' },
          { status: 500 }
        );
      }
    }

    // Prepare email data
    const companyName = companyProfile?.company_name || 'Veltex Services';
    const senderName = profile?.full_name || user.email || 'Team';
    
    const emailData = {
      clientName: proposal.client_name || 'Valued Client',
      clientEmail: proposal.client_email,
      proposalTitle: proposal.title || 'Service Proposal',
      companyName,
      senderName,
      proposalViewUrl: includeViewLink ? `${process.env.NEXT_PUBLIC_SITE_URL}/proposals/${proposal.id}` : undefined,
      hasAttachment: includeAttachment,
    };

    // Send the email
    const emailSent = await EmailService.sendProposalEmail(emailData, pdfBuffer);

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
        updated_at: new Date().toISOString()
      })
      .eq('id', proposal.id);

    if (updateError) {
      console.error('Error updating proposal status:', updateError);
      // Don't fail the request since email was sent successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Proposal email sent successfully',
      emailSent: true,
      statusUpdated: !updateError,
    });

  } catch (error) {
    console.error('Error sending proposal email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}