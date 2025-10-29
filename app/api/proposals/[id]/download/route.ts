import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateProposalPDF } from '@/lib/pdf/generator';
import { headers } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const trackingId = searchParams.get('tracking');

    const supabase = await createClient();
    const headersList = await headers();

    // Fetch proposal data
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select(`
        *,
        company_profiles (
          company_name,
          logo_url,
          primary_color,
          secondary_color
        )
      `)
      .eq('id', id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json(
        { error: 'Proposal not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdfBuffer = await generateProposalPDF(proposal);

    // Track download if tracking ID is provided
    if (trackingId) {
      const forwarded = headersList.get('x-forwarded-for');
      const ip = forwarded ? forwarded.split(',')[0] : headersList.get('x-real-ip') || 'unknown';

      // Get current tracking record to increment download_count
      const { data: currentTracking } = await supabase
        .from('proposal_tracking')
        .select('download_count')
        .eq('tracking_id', trackingId)
        .single();

      // Update tracking record
      const { error: trackingError } = await supabase
        .from('proposal_tracking')
        .update({
          downloaded: true,
          downloaded_at: new Date().toISOString(),
          download_count: (currentTracking?.download_count || 0) + 1,
        })
        .eq('tracking_id', trackingId);

      if (trackingError) {
        console.error('Error updating download tracking:', trackingError);
      }

      // Insert download record
      const { error: downloadError } = await supabase
        .from('proposal_downloads')
        .insert({
          proposal_id: id,
          tracking_id: trackingId,
          ip_address: ip,
          user_agent: headersList.get('user-agent'),
          downloaded_at: new Date().toISOString(),
        });

      if (downloadError) {
        console.error('Error inserting download record:', downloadError);
      }

      // Get current proposal to increment download_count
      const { data: currentProposal } = await supabase
        .from('proposals')
        .select('download_count')
        .eq('id', id)
        .single();

      // Update proposal download count
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          download_count: (currentProposal?.download_count || 0) + 1,
        })
        .eq('id', id);

      if (proposalError) {
        console.error('Error updating proposal download count:', proposalError);
      }
    }

    // Return PDF
    const filename = `${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}