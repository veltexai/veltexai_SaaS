import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { proposalFormSchema } from '@/lib/validations/proposal';

export async function POST(request: NextRequest) {
  try {
    const { user } = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Check if user can create proposals
    const { data: canCreate, error: checkError } = await supabase
      .rpc('can_user_create_proposal', { user_uuid: user.id })
      .single();

    if (checkError || !canCreate) {
      return NextResponse.json(
        {
          error:
            'You have reached your proposal limit. Please upgrade your plan.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = proposalFormSchema.parse(body);

    // Transform the data to match database schema
    const proposalData = {
      user_id: user.id,
      title: validatedData.title,
      service_type: validatedData.service_type,
      // Extract fields from global_inputs to match database columns
      client_name: validatedData.global_inputs.client_name,
      client_email: validatedData.global_inputs.client_email,
      client_company: validatedData.global_inputs.client_company,
      contact_phone: validatedData.global_inputs.contact_phone,
      service_location: validatedData.global_inputs.service_location,
      facility_size: validatedData.global_inputs.facility_size,
      service_frequency: validatedData.global_inputs.service_frequency,
      regional_location: validatedData.global_inputs.regional_location,
      // Keep nested data as JSON
      global_inputs: validatedData.global_inputs,
      service_specific_data: validatedData.service_specific_data,
      pricing_enabled: validatedData.pricing_enabled,
      pricing_data: validatedData.pricing_data,
      generated_content: validatedData.generated_content,
      status: validatedData.status,
      // Include enhanced fields
      facility_details: validatedData.facility_details,
      traffic_analysis: validatedData.traffic_analysis,
      service_scope: validatedData.service_scope,
      special_requirements: validatedData.special_requirements,
      ai_tone: validatedData.ai_tone,
    };

    // Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();

    if (proposalError) {
      console.error('Error creating proposal:', proposalError);
      return NextResponse.json(
        { error: 'Failed to create proposal' },
        { status: 500 }
      );
    }

    // Increment user's proposal usage
    const { error: usageError } = await supabase.rpc('increment_user_usage', {
      user_uuid: user.id,
    });

    if (usageError) {
      console.error('Error incrementing usage:', usageError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error in proposal creation:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}
