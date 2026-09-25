import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }
    const { 
      tracking_id, 
      element_type, 
      element_text, 
      element_id
    } = body;

    if (!tracking_id || !element_type) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc('record_tracking_click', {
      token: tracking_id,
      clicked_element_type: element_type.substring(0, 100),
      clicked_element_text: element_text?.substring(0, 255) || null,
      clicked_element_id: element_id?.substring(0, 100) || null,
    });

    if (error || !data) {
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
