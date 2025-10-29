import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tracking_id, 
      element_type, 
      element_text, 
      element_id, 
      element_class 
    } = body;

    if (!tracking_id || !element_type) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert click tracking record
    const { error } = await supabase
      .from('proposal_click_tracking')
      .insert({
        tracking_id,
        element_type,
        element_text: element_text?.substring(0, 255) || null, // Limit text length
        element_id: element_id?.substring(0, 100) || null,
        element_class: element_class?.substring(0, 255) || null,
        clicked_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error inserting click tracking:', error);
      return NextResponse.json(
        { error: 'Failed to track click' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Click tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}