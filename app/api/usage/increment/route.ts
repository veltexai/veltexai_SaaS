import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers'

export async function POST(req: NextRequest) {
  try {
    const { type = 'proposal' } = await req.json()
    
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get current month period
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Check if usage record exists for current month
    const { data: existingUsage } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('period_start', periodStart.toISOString())
      .lte('period_start', periodEnd.toISOString())
      .single()

    if (existingUsage) {
      // Update existing usage record
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (type === 'proposal') {
        updateData.proposals_count = existingUsage.proposals_count + 1
      }
      
      const { data: updatedUsage, error: updateError } = await supabase
        .from('usage')
        .update(updateData)
        .eq('id', existingUsage.id)
        .select()
        .single()

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({
        success: true,
        usage: updatedUsage
      })
    } else {
      // Create new usage record for current month
      const newUsageData: any = {
        user_id: user.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        proposals_count: type === 'proposal' ? 1 : 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { data: newUsage, error: insertError } = await supabase
        .from('usage')
        .insert(newUsageData)
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      return NextResponse.json({
        success: true,
        usage: newUsage
      })
    }
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    )
  }
}