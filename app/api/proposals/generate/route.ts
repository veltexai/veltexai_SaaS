import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUser } from '@/lib/auth/auth-helpers'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      client_name,
      project_description,
      budget_range,
      timeline,
      company_name,
      services_offered
    } = body

    if (!client_name || !project_description) {
      return NextResponse.json(
        { error: 'Client name and project description are required' },
        { status: 400 }
      )
    }

    // Create the prompt for OpenAI
    const prompt = `
Create a professional business proposal for the following project:

Client: ${client_name}${company_name ? ` from ${company_name}` : ''}
Project Description: ${project_description}
${budget_range ? `Budget Range: ${budget_range}` : ''}
${timeline ? `Timeline: ${timeline}` : ''}
${services_offered ? `Services to be provided: ${services_offered}` : ''}

Please generate a comprehensive proposal that includes:
1. Executive Summary
2. Project Understanding
3. Proposed Solution
4. Timeline and Deliverables
5. Investment and Terms
6. Why Choose Us
7. Next Steps

Make it professional, persuasive, and tailored to the client's needs. Use a confident but not overly salesy tone.
`

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a professional business proposal writer. Create compelling, well-structured proposals that help win clients. Focus on value proposition and clear deliverables.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    })

    const generatedContent = completion.choices[0]?.message?.content

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      content: generatedContent
    })

  } catch (error) {
    console.error('Error generating proposal:', error)
    
    if (error instanceof Error && error.message.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}