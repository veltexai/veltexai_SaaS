import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers'

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's billing history
    const { data: billingHistory, error } = await supabase
      .from('billing_history')
      .select('*')
      .eq('user_id', user.id)
      .order('invoice_date', { ascending: false })
      .limit(10) // Get last 10 invoices

    if (error) {
      console.error('Error fetching billing history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch billing history' },
        { status: 500 }
      )
    }

    return NextResponse.json(billingHistory || [])
  } catch (error) {
    console.error('Error in billing history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}