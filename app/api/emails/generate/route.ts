import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getUser } from '@/lib/auth/auth-helpers';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { AITone } from '@/types/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const emailGenerationSchema = z.object({
  email_type: z.enum(['proposal_send', 'follow_up', 'thank_you', 'reminder', 'custom']),
  proposal_title: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  client_company: z.string().optional(),
  service_type: z.string().optional(),
  ai_tone: z.enum(['professional', 'friendly', 'formal', 'casual', 'technical']).default('professional'),
  custom_context: z.string().optional(),
  include_proposal_details: z.boolean().default(true),
  is_regenerate: z.boolean().default(false),
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
    const validatedData = emailGenerationSchema.parse(body);

    const {
      email_type,
      proposal_title,
      client_name,
      client_company,
      service_type,
      ai_tone,
      custom_context,
      include_proposal_details,
      is_regenerate,
    } = validatedData;

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

    // Get email type specific instructions
    const getEmailTypeInstructions = (type: string) => {
      const typeInstructions = {
        proposal_send: 'Create a professional email to accompany a proposal. Focus on introducing the proposal, highlighting key benefits, and encouraging review.',
        follow_up: 'Create a follow-up email to check on proposal status. Be polite, show continued interest, and offer to answer questions.',
        thank_you: 'Create a thank you email after proposal acceptance or meeting. Express gratitude and outline next steps.',
        reminder: 'Create a gentle reminder email about a pending proposal. Be respectful of their time while encouraging action.',
        custom: 'Create a custom email based on the provided context. Follow the tone and purpose specified.',
      };
      return typeInstructions[type as keyof typeof typeInstructions] || typeInstructions.proposal_send;
    };

    // Create the prompt for OpenAI
    const prompt = `
You are an email writing assistant for Veltex Services, a professional cleaning company. Create a well-structured, persuasive business email based on the details below.

--- TONE INSTRUCTIONS ---
${getToneInstructions(ai_tone)}

--- EMAIL TYPE ---
${getEmailTypeInstructions(email_type)}

--- CLIENT INFO ---
Client: ${client_name}${client_company ? ` from ${client_company}` : ''}
${proposal_title ? `Proposal: ${proposal_title}` : ''}
${service_type ? `Service Type: ${service_type}` : ''}

--- COMPANY INFO ---
Company: ${profile.company_name || 'Veltex Services'}
Contact Person: ${profile.full_name || 'Your Name'}
Email: ${user.email}
Phone: ${profile.phone || 'Your Phone'}
Website: ${profile.website || 'Your Website'}

${custom_context ? `--- CUSTOM CONTEXT ---\n${custom_context}\n` : ''}

--- EMAIL REQUIREMENTS ---
1. Professional subject line (return as "subject")
2. Proper greeting using client name
3. Clear, concise body that serves the email type purpose
4. ${include_proposal_details ? 'Include relevant proposal details and benefits' : 'Keep proposal details minimal'}
5. Professional closing with contact information
6. Call-to-action appropriate for the email type

--- TONE APPLICATION ---
${getToneInstructions(ai_tone)}

${is_regenerate ? '--- REGENERATION REQUEST ---\nThis is a regeneration request. Please create a fresh, alternative version with different phrasing and structure while maintaining the same core information and tone.\n' : ''}

--- OUTPUT FORMAT ---
Return the response as a JSON object with the following structure:
{
  "subject": "Email subject line",
  "body": "Email body content with proper formatting"
}

The email body should be formatted with line breaks for readability but without HTML tags.
`;

    console.log('🚀 ~ POST ~ email generation prompt:', prompt);

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a professional email writer for Veltex Services. Create compelling, well-structured business emails that help build client relationships and drive business results. ${getToneInstructions(ai_tone)} Always return valid JSON format as specified.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: is_regenerate ? 0.8 : 0.7, // Higher temperature for regeneration
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Failed to generate email content' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let emailContent;
    try {
      emailContent = JSON.parse(generatedContent);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse AI response as JSON:', parseError);
      return NextResponse.json(
        { 
          subject: `Re: ${proposal_title || 'Your Service Request'}`,
          body: generatedContent,
          tone: ai_tone,
          email_type,
          is_regenerate,
        }
      );
    }

    return NextResponse.json({
      ...emailContent,
      tone: ai_tone,
      email_type,
      is_regenerate,
    });
  } catch (error) {
    console.error('Error generating email:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

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