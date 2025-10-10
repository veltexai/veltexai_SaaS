import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
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

    // Get user profile for company info
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

    // Parse request body for export options
    const body = await request.json();
    const { 
      template = 'professional', 
      includeCompanyInfo = true,
      includeServiceReferences = true 
    } = body;

    // Prepare company info from profile
    const companyInfo =
      includeCompanyInfo && profile
        ? {
            name: profile.company_name || profile.full_name || 'Your Company',
            email: user.email || undefined,
            phone: profile.phone || undefined,
            website: profile.website || undefined,
            logo: profile.logo_url || undefined,
            address: profile.company_background || undefined,
          }
        : undefined;

    console.log('Company info:', companyInfo);
    console.log('Company profile:', companyProfile);
    console.log('Profile logo_url:', profile?.logo_url);

    // Generate PDF with enhanced options
    const pdfBytes = await exportProposalToPDF(proposal, {
      companyInfo,
      companyProfile,
      template,
      includeServiceReferences,
    });

    // Convert Uint8Array to buffer for storage
    const buffer = Buffer.from(pdfBytes);

    // Save export record to database
    const { error: exportError } = await supabase.from('pdf_exports').insert({
      proposal_id: proposal.id,
      user_id: user.id,
      file_size: buffer.length,
      template_used: template,
      exported_at: new Date().toISOString(),
    });

    if (exportError) {
      console.error('Failed to save export record:', exportError);
      // Continue anyway - don't fail the export
    }

    // Return the PDF as a response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${proposal.title.replace(
          /[^a-zA-Z0-9]/g,
          '_'
        )}_proposal.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}
