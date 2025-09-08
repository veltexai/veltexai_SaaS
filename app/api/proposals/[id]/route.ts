import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import { proposalSchema } from '@/lib/validations/proposal'
import { Database } from '@/types/database'

type Proposal = Database['public']['Tables']['proposals']['Row']
type ProposalUpdate = Database['public']['Tables']['proposals']['Update']

// GET /api/proposals/[id] - Get a specific proposal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { data: proposal, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }
      console.error('Error fetching proposal:', error)
      return NextResponse.json(
        { error: 'Failed to fetch proposal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Error in GET /api/proposals/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/proposals/[id] - Update a specific proposal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = proposalSchema.partial().safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      )
    }

    const updateData = validationResult.data

    const supabase = await createClient()
    
    // First check if the proposal exists and belongs to the user
    const { data: existingProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }
      console.error('Error checking proposal:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check proposal' },
        { status: 500 }
      )
    }

    // Update the proposal
    const proposalUpdate: ProposalUpdate = {
      ...updateData,
      updated_at: new Date().toISOString()
    }

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update(proposalUpdate)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating proposal:', error)
      return NextResponse.json(
        { error: 'Failed to update proposal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ proposal })
  } catch (error) {
    console.error('Error in PUT /api/proposals/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/proposals/[id] - Delete a specific proposal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // First check if the proposal exists and belongs to the user
    const { data: existingProposal, error: fetchError } = await supabase
      .from('proposals')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Proposal not found' },
          { status: 404 }
        )
      }
      console.error('Error checking proposal:', fetchError)
      return NextResponse.json(
        { error: 'Failed to check proposal' },
        { status: 500 }
      )
    }

    // Delete the proposal
    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting proposal:', error)
      return NextResponse.json(
        { error: 'Failed to delete proposal' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Proposal deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/proposals/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}