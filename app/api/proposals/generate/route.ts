import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  serviceTypeSchema,
  serviceFrequencySchema,
} from '@/lib/validations/proposal';
import { AITone } from '@/types/database';

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
      // Enhanced facility data
      facility_details,
      traffic_analysis,
      service_scope,
      special_requirements,
      // AI enhancement fields
      ai_tone = 'professional',
      is_regenerate = false,
      // Template data
      template_id,
    } = body;

    // Validate required fields
    if (!service_type || !client_name) {
      return NextResponse.json(
        { error: 'Missing required fields: service_type, client_name' },
        { status: 400 }
      );
    }

    // Fetch template data if template_id is provided
    let templateData = null;
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from('proposal_templates')
        .select('*')
        .eq('id', template_id)
        .eq('is_active', true)
        .single();

      if (!templateError && template) {
        templateData = template;
      }
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

    // Get tone instructions
    const getToneInstructions = (tone: AITone) => {
      const toneInstructions = {
        professional: 'Use a professional, business-focused tone. Be formal but approachable, emphasizing expertise and reliability.',
        friendly: 'Use a warm, friendly tone that builds rapport. Be personable while maintaining professionalism.',
        formal: 'Use a very formal, structured tone. Be precise, detailed, and follow traditional business communication standards.',
        casual: 'Use a relaxed, conversational tone. Be approachable and easy to understand while remaining professional.',
        technical: 'Use a detail-oriented, technical tone. Include specific methodologies, processes, and technical expertise.',
      };
      return toneInstructions[tone] || toneInstructions.professional;
    };

    // Helper function to format enhanced facility data
    const formatEnhancedData = () => {
      let enhancedInfo = '';

      // Facility Details
      if (facility_details && Object.keys(facility_details).length > 0) {
        enhancedInfo += '\n--- FACILITY DETAILS ---\n';
        if (facility_details.building_age) {
          enhancedInfo += `Building Age: ${facility_details.building_age} years\n`;
        }
        if (facility_details.building_type) {
          enhancedInfo += `Building Type: ${facility_details.building_type}\n`;
        }
        if (facility_details.accessibility_requirements?.length > 0) {
          enhancedInfo += `Accessibility Requirements: ${facility_details.accessibility_requirements.join(
            ', '
          )}\n`;
        }
        if (facility_details.special_areas?.length > 0) {
          enhancedInfo += `Special Areas: ${facility_details.special_areas.join(
            ', '
          )}\n`;
        }
        if (facility_details.equipment_present?.length > 0) {
          enhancedInfo += `Equipment Present: ${facility_details.equipment_present.join(
            ', '
          )}\n`;
        }
        if (facility_details.environmental_concerns?.length > 0) {
          enhancedInfo += `Environmental Concerns: ${facility_details.environmental_concerns.join(
            ', '
          )}\n`;
        }
      }

      // Traffic Analysis
      if (traffic_analysis && Object.keys(traffic_analysis).length > 0) {
        enhancedInfo += '\n--- TRAFFIC ANALYSIS ---\n';
        if (traffic_analysis.staff_count) {
          enhancedInfo += `Staff Count: ${traffic_analysis.staff_count}\n`;
        }
        if (traffic_analysis.visitor_frequency) {
          enhancedInfo += `Visitor Frequency: ${traffic_analysis.visitor_frequency}\n`;
        }
        if (traffic_analysis.traffic_level) {
          enhancedInfo += `Traffic Level: ${traffic_analysis.traffic_level}\n`;
        }
        if (traffic_analysis.peak_hours?.length > 0) {
          enhancedInfo += `Peak Hours: ${traffic_analysis.peak_hours.join(
            ', '
          )}\n`;
        }
        if (traffic_analysis.special_events) {
          enhancedInfo += `Special Events: Yes\n`;
        }
      }

      // Service Scope
      if (service_scope && Object.keys(service_scope).length > 0) {
        enhancedInfo += '\n--- SERVICE SCOPE ---\n';
        if (service_scope.areas_included?.length > 0) {
          enhancedInfo += `Areas Included: ${service_scope.areas_included.join(
            ', '
          )}\n`;
        }
        if (service_scope.areas_excluded?.length > 0) {
          enhancedInfo += `Areas Excluded: ${service_scope.areas_excluded.join(
            ', '
          )}\n`;
        }
        if (service_scope.special_services?.length > 0) {
          enhancedInfo += `Special Services: ${service_scope.special_services.join(
            ', '
          )}\n`;
        }
      }

      // Special Requirements
      if (
        special_requirements &&
        Object.keys(special_requirements).length > 0
      ) {
        enhancedInfo += '\n--- SPECIAL REQUIREMENTS ---\n';
        if (special_requirements.security_clearance) {
          enhancedInfo += `Security Clearance: Required\n`;
        }
        if (special_requirements.after_hours_access) {
          enhancedInfo += `After Hours Access: Required\n`;
        }
        if (special_requirements.special_equipment?.length > 0) {
          enhancedInfo += `Special Equipment: ${special_requirements.special_equipment.join(
            ', '
          )}\n`;
        }
        if (special_requirements.certifications_required?.length > 0) {
          enhancedInfo += `Certifications Required: ${special_requirements.certifications_required.join(
            ', '
          )}\n`;
        }
        if (special_requirements.insurance_requirements?.length > 0) {
          enhancedInfo += `Insurance Requirements: ${special_requirements.insurance_requirements.join(
            ', '
          )}\n`;
        }
      }

      return enhancedInfo;
    };

    // Create the prompt for OpenAI
    const prompt = `
You are a proposal writing assistant. Create a polished, persuasive business proposal in markdown format based on the details below. 
The proposal should feel personalized, professional, and structured for business clients.

--- TONE INSTRUCTIONS ---
${getToneInstructions(ai_tone)}

${templateData ? `--- TEMPLATE GUIDANCE ---
Template: ${templateData.display_name}
Description: ${templateData.description}
${templateData.template_data?.category ? `Category: ${templateData.template_data.category}` : ''}
${templateData.template_data?.content ? `Template Content Guidelines: ${templateData.template_data.content}` : ''}

Please use this template as a structural and content guide while customizing it with the specific client and project details provided below.
` : ''}

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

${formatEnhancedData()}

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

${getToneInstructions(ai_tone)} Use clear markdown formatting (headings, subheadings, bullet points) to ensure readability.
Focus on the specific ${getServiceTypeLabel(
      service_type
    )} service and tailor the content accordingly.

${is_regenerate ? '--- REGENERATION REQUEST ---\nThis is a regeneration request. Please create a fresh, alternative version with different phrasing and structure while maintaining the same core information and tone.\n' : ''}

--- PRICING INFO ---
${
  pricing_data
    ? `
Price Range: $${pricing_data.price_range?.low} - $${pricing_data.price_range?.high}
Estimated Hours: ${pricing_data.hours_estimate?.min}-${pricing_data.hours_estimate?.max} hours
`
    : 'Pricing to be determined'
}

--- VELTEX AI ATTRIBUTION ---
Please include a subtle footer note: "This proposal was generated with assistance from Veltex AI to ensure professional quality and consistency."

`;
    console.log('🚀 ~ POST ~ prompt:', prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional business proposal writer for Veltex Services. Create compelling, well-structured proposals that help win clients. ${getToneInstructions(ai_tone)} Focus on value proposition and clear deliverables. Always include the Veltex AI attribution as requested.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: is_regenerate ? 0.8 : 0.7, // Higher temperature for regeneration to get more variation
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
      tone: ai_tone,
      is_regenerate,
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
