import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers'

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user and check admin role
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all billing history with user email
    const { data: billingHistory, error } = await supabase
      .from('billing_history')
      .select(`
        *,
        profiles!inner(
          email
        )
      `)
      .order('invoice_date', { ascending: false })
      .limit(100) // Limit to last 100 records for performance

    if (error) {
      console.error('Error fetching billing history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch billing history' },
        { status: 500 }
      )
    }

    // Transform data to include user_email
    const transformedBillingHistory = billingHistory?.map(record => ({
      ...record,
      user_email: record.profiles?.email
    })) || []

    return NextResponse.json(transformedBillingHistory)
  } catch (error) {
    console.error('Error in admin billing history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}