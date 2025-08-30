import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth/auth-helpers';

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

    const body = await request.json();
    const {
      client_name,
      client_company,
      contact_phone,
      service_location,
      title,
      project_description,
      budget_range,
      timeline,
      services_offered,
      service_frequency,
      square_footage,
      desired_start_date,
      special_requirements,
    } = body;

    // Create the prompt for OpenAI
    const prompt = `
You are a proposal writing assistant. Create a polished, persuasive business proposal in PDF-ready format based on the details below. 
The proposal should feel personalized, professional, and structured for business clients.

--- CLIENT INFO ---
Client: ${client_name}${client_company ? ` from ${client_company}` : ''}
Contact: ${contact_phone}
Service Location: ${service_location}
${title ? `Project Title: ${title}` : ''}
Project Description: ${project_description}
${budget_range ? `Budget Range: ${budget_range}` : ''}
${timeline ? `Timeline: ${timeline}` : ''}
${services_offered ? `Services to be provided: ${services_offered}` : ''}
${service_frequency ? `Service Frequency: ${service_frequency}` : ''}
${square_footage ? `Square Footage: ${square_footage}` : ''}
${desired_start_date ? `Desired Start Date: ${desired_start_date}` : ''}
${special_requirements ? `Special Requirements: ${special_requirements}` : ''}

--- COMPANY INFO ---
Company: ${user.user_metadata.company_name}
Contact Person: ${user.user_metadata.full_name}
Email: ${user.email}
Phone: ${user.phone}
Website: [Your Website]
Logo: [Insert logo in final PDF]
Company Background: [Brief background of your company, values, expertise]

--- REQUIRED STRUCTURE ---
1. Cover Page (with logo, company info, client info, proposal title)
2. Executive Summary (high-level overview of client needs + our solution)
3. Project Understanding (show empathy and clarity of client’s situation)
4. Proposed Solution (detailed services tailored to client requirements)
5. Timeline & Deliverables
6. Investment & Terms (clear pricing/budget alignment)
7. Why Choose Us (your company’s strengths, trust factors, experience)
8. Next Steps (call-to-action, signature area)

Tone: Professional, confident, persuasive, but not overly salesy. Use clear formatting (headings, subheadings, bullet points) to ensure readability.
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
