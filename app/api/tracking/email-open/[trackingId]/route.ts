import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  try {
    const supabase = await createClient();
    const { trackingId } = await params;

    // Get user agent and IP address for tracking
    const userAgent = request.headers.get('user-agent') || null;
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || null;

    // Find the tracking record
    const { data: tracking, error: trackingError } = await supabase
      .from('proposal_tracking')
      .select('*')
      .eq('tracking_id', trackingId)
      .single();

    if (trackingError || !tracking) {
      console.log('Tracking record not found for ID:', trackingId);
      // Return a 1x1 transparent pixel even if tracking fails
      return new NextResponse(
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        ),
        {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Update tracking record with email open information
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('proposal_tracking')
      .update({
        opened: true,
        opened_at: tracking.opened_at || now, // Only set if not already opened
        user_agent: userAgent,
        ip_address: ipAddress,
        updated_at: now,
      })
      .eq('id', tracking.id);

    if (updateError) {
      console.error('Error updating tracking record:', updateError);
    } else {
      console.log('Email open tracked for:', trackingId);
    }

    // Return a 1x1 transparent pixel
    return new NextResponse(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );

  } catch (error) {
    console.error('Email tracking error:', error);
    
    // Return a 1x1 transparent pixel even on error
    return new NextResponse(
      Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}