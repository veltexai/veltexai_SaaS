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

    // Get all subscriptions with user email
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles!inner(
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching subscriptions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      )
    }

    // Transform data to include user_email
    const transformedSubscriptions = subscriptions?.map(sub => ({
      ...sub,
      user_email: sub.profiles?.email
    })) || []

    return NextResponse.json(transformedSubscriptions)
  } catch (error) {
    console.error('Error in admin subscriptions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}