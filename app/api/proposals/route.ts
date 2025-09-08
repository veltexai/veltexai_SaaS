import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import {
  proposalSchema,
  validateProposalWithServiceData,
} from '@/lib/validations/proposal';
import { Database } from '@/types/database';

type Proposal = Database['public']['Tables']['proposals']['Row'];
type ProposalInsert = Database['public']['Tables']['proposals']['Insert'];

// GET /api/proposals - Get all proposals for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: proposals, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching proposals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch proposals' },
        { status: 500 }
      );
    }

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error('Error in GET /api/proposals:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get user from server-side auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.json();
    const validatedData = validateProposalWithServiceData(formData);

    const { data: proposalData, error: insertError } = await supabase
      .from('proposals')
      .insert({
        user_id: user.id,
        title: validatedData.title,
        service_type: validatedData.service_type,
        client_name: validatedData.global_inputs.client_name,
        client_email: validatedData.global_inputs.client_email,
        client_company: validatedData.global_inputs.client_company,
        contact_phone: validatedData.global_inputs.contact_phone,
        service_location: validatedData.global_inputs.service_location,
        facility_size: validatedData.global_inputs.facility_size,
        service_frequency: validatedData.global_inputs.service_frequency,
        service_specific_data: validatedData.service_specific_data,
        global_inputs: validatedData.global_inputs,
        pricing_enabled: validatedData.pricing_enabled,
        pricing_data: validatedData.pricing_data,
        generated_content: validatedData.generated_content,
        status: validatedData.status || 'draft',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({ data: proposalData });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
}
