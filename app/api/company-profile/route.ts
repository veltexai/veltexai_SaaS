import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema for company profile updates
const companyProfileSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(255),
  contact_info: z.object({
    primary_contact: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    billing_contact: z.string().optional(),
    emergency_contact: z.string().optional(),
  }).optional(),
  logo_url: z.string().url().optional().or(z.literal('')).or(z.null()),
  company_background: z.string().optional(),
  service_references: z.array(z.object({
    client_name: z.string().optional(),
    service_type: z.string().optional(),
    duration: z.string().optional(),
    contact_info: z.string().optional(),
    testimonial: z.string().optional(),
  })).optional(),
});

// GET /api/company-profile - Get user's company profile
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { data: companyProfile, error } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching company profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company profile' },
        { status: 500 }
      );
    }

    // If no company profile exists, return null
    if (!companyProfile) {
      return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: companyProfile });
  } catch (error) {
    console.error('Unexpected error in GET /api/company-profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// POST /api/company-profile - Create company profile
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = companyProfileSchema.parse(body);

    const supabase = await createClient();

    // Check if company profile already exists
    const { data: existingProfile } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Company profile already exists. Use PATCH to update.' },
        { status: 409 }
      );
    }

    // Create new company profile
    const { data, error } = await supabase
      .from('company_profiles')
      .insert({
        user_id: user.id,
        ...validatedData,
        contact_info: validatedData.contact_info || {},
        service_references: validatedData.service_references || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating company profile:', error);
      return NextResponse.json(
        { error: 'Failed to create company profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error in POST /api/company-profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// PATCH /api/company-profile - Update company profile
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = companyProfileSchema.partial().parse(body);

    // Clean the updates object
    const cleanedUpdates = { ...validatedData };

    // Convert empty strings to null for optional fields
    if (cleanedUpdates.logo_url === '') {
      cleanedUpdates.logo_url = null;
    }

    // Remove undefined values
    Object.keys(cleanedUpdates).forEach((key) => {
      if (cleanedUpdates[key as keyof typeof cleanedUpdates] === undefined) {
        delete cleanedUpdates[key as keyof typeof cleanedUpdates];
      }
    });

    const supabase = await createClient();

    // Check if company profile exists
    const { data: existingProfile } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existingProfile) {
      // Create new profile if it doesn't exist
      const { data, error } = await supabase
        .from('company_profiles')
        .insert({
          user_id: user.id,
          company_name: cleanedUpdates.company_name || 'My Company',
          ...cleanedUpdates,
          contact_info: cleanedUpdates.contact_info || {},
          service_references: cleanedUpdates.service_references || [],
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating company profile:', error);
        return NextResponse.json(
          { error: 'Failed to create company profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 201 });
    }

    // Update existing profile
    const { data, error } = await supabase
      .from('company_profiles')
      .update({
        ...cleanedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating company profile:', error);
      return NextResponse.json(
        { error: 'Failed to update company profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid data provided', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Unexpected error in PATCH /api/company-profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// DELETE /api/company-profile - Delete company profile
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('company_profiles')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting company profile:', error);
      return NextResponse.json(
        { error: 'Failed to delete company profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/company-profile:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}