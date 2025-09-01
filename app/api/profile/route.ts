import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const profileUpdateSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  company_name: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^[+]?[1-9]\d{1,14}$/)
    .optional(),
  website: z.string().url().optional().or(z.literal('')).or(z.null()),
  logo_url: z.string().optional().or(z.literal('')).or(z.null()),
  company_background: z.string().min(50).max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = profileUpdateSchema.parse(body);

    // Clean the updates object
    const cleanedUpdates = { ...validatedData };

    // Convert empty strings to null for optional fields
    if (cleanedUpdates.website === '') {
      cleanedUpdates.website = null;
    }
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
    const { data, error } = await supabase
      .from('profiles')
      .update(cleanedUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);

      // Handle specific constraint violations
      if (error.code === '23514') {
        if (error.message.includes('check_website_format')) {
          return NextResponse.json(
            { error: 'Website must start with http:// or https://' },
            { status: 400 }
          );
        }
        if (error.message.includes('check_phone_format')) {
          return NextResponse.json(
            { error: 'Please enter a valid phone number' },
            { status: 400 }
          );
        }
        if (error.message.includes('check_company_background_length')) {
          return NextResponse.json(
            { error: 'Company background must be between 50-500 characters' },
            { status: 400 }
          );
        }
      }

      return NextResponse.json(
        { error: error.message || 'Failed to update profile' },
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

    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
