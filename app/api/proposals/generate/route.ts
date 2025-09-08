import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  serviceTypeSchema,
  serviceFrequencySchema,
} from '@/lib/validations/proposal';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch complete profile data
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      client_name,
      client_company,
      contact_phone,
      service_location,
      title,
      service_type,
      service_frequency,
      facility_size,
      service_specific_data,
      pricing_data,
    } = body;

    // Validate required fields
    if (!service_type || !client_name) {
      return NextResponse.json(
        { error: 'Missing required fields: service_type, client_name' },
        { status: 400 }
      );
    }

    // Create globalInputs object for the prompt
    const globalInputs = {
      clientName: client_name,
      clientCompany: client_company,
      clientEmail: '', // Not sent from frontend
      clientPhone: contact_phone,
      serviceLocation: service_location,
      facilitySize: facility_size,
      serviceFrequency: service_frequency,
    };

    // Get service type label
    const getServiceTypeLabel = (type: string) => {
      const labels = {
        residential: 'Residential Cleaning',
        commercial: 'Commercial Cleaning',
        carpet: 'Carpet Cleaning',
        window: 'Window Cleaning',
        floor: 'Floor Care',
      };
      return labels[type as keyof typeof labels] || type;
    };

    // Create the prompt for OpenAI
    const prompt = `
You are a proposal writing assistant. Create a polished, persuasive business proposal in markdown format based on the details below. 
The proposal should feel personalized, professional, and structured for business clients.

--- SERVICE TYPE ---
Service Type: ${getServiceTypeLabel(service_type)}

--- CLIENT INFO ---
Client: ${globalInputs.clientName || 'Valued Client'}${
      globalInputs.clientCompany ? ` from ${globalInputs.clientCompany}` : ''
    }
Phone: ${globalInputs.clientPhone || ''}
Service Location: ${globalInputs.serviceLocation || ''}
${title ? `Project Title: ${title}` : ''}
Facility Size: ${
      globalInputs.facilitySize ? `${globalInputs.facilitySize} sq ft` : ''
    }
Service Frequency: ${globalInputs.serviceFrequency || ''}

--- SERVICE-SPECIFIC DETAILS ---
${Object.entries(service_specific_data || {})
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

--- COMPANY INFO ---
Company: ${profile.company_name || 'Your Company'}
Contact Person: ${profile.full_name || 'Your Name'}
Email: ${user.email}
Phone: ${profile.phone || 'Your Phone'}
Website: ${profile.website || 'Your Website'}
Logo: ${profile.logo_url ? '[Logo available]' : '[No logo uploaded]'}
Company Background: ${
      profile.company_background ||
      'Brief background of your company, values, expertise'
    }

--- REQUIRED STRUCTURE ---
1. Executive Summary (high-level overview of client needs + our solution)
2. Project Understanding (show empathy and clarity of client's situation)
3. Proposed Solution (detailed services tailored to client requirements and service type)
4. Service Details (specific to the ${getServiceTypeLabel(
      service_type
    )} service)
5. Timeline & Schedule
6. Investment & Terms
7. Why Choose Us (your company's strengths, trust factors, experience)
8. Next Steps (call-to-action)

Tone: Professional, confident, persuasive, but not overly salesy. Use clear markdown formatting (headings, subheadings, bullet points) to ensure readability.
Focus on the specific ${getServiceTypeLabel(
      service_type
    )} service and tailor the content accordingly.

--- PRICING INFO ---
${
  pricing_data
    ? `
Price Range: $${pricing_data.price_range?.low} - $${pricing_data.price_range?.high}
Estimated Hours: ${pricing_data.hours_estimate?.min}-${pricing_data.hours_estimate?.max} hours
`
    : 'Pricing to be determined'
}

`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional business proposal writer. Create compelling, well-structured proposals that help win clients. Focus on value proposition and clear deliverables.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: generatedContent,
    });
  } catch (error) {
    console.error('Error generating proposal:', error);

    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
