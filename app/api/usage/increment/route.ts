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

    // Use the database function for consistent trial/subscription handling
    // This handles 7-day trial period and subscription period correctly
    const { data: result, error: rpcError } = await supabase
      .rpc('increment_user_usage', { user_uuid: user.id })

    if (rpcError) {
      console.error('Error calling increment_user_usage RPC:', rpcError)
      
      // Fallback to manual increment for proposal type
      if (type === 'proposal') {
        // Get user profile to determine the correct period
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, trial_end_at, created_at')
          .eq('id', user.id)
          .single()

        // Get active subscription
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('current_period_start, current_period_end')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        let periodStart: Date
        let periodEnd: Date

        if (subscription) {
          // Use subscription period
          periodStart = new Date(subscription.current_period_start)
          periodEnd = new Date(subscription.current_period_end)
        } else if (profile?.subscription_status === 'trial') {
          // Use trial period (7 days from account creation)
          periodStart = new Date(profile.created_at)
          periodEnd = profile.trial_end_at 
            ? new Date(profile.trial_end_at)
            : new Date(new Date(profile.created_at).getTime() + 7 * 24 * 60 * 60 * 1000)
        } else {
          // Fallback to current month
          const now = new Date()
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        }

        // Check if usage record exists for this period
        const { data: existingUsage } = await supabase
          .from('usage')
          .select('*')
          .eq('user_id', user.id)
          .eq('period_start', periodStart.toISOString())
          .eq('period_end', periodEnd.toISOString())
          .single()

        if (existingUsage) {
          // Update existing usage record
          const { data: updatedUsage, error: updateError } = await supabase
            .from('usage')
            .update({
              proposal_count: existingUsage.proposal_count + 1,
              updated_at: new Date().toISOString()
            })
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
          // Create new usage record for this period
          const { data: newUsage, error: insertError } = await supabase
            .from('usage')
            .insert({
              user_id: user.id,
              period_start: periodStart.toISOString(),
              period_end: periodEnd.toISOString(),
              proposal_count: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
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
      }
      throw rpcError
    }

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Error incrementing usage:', error)
    return NextResponse.json(
      { error: 'Failed to increment usage' },
      { status: 500 }
    )
  }
}
