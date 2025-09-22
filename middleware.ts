import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

interface UsageInfo {
  can_create_proposal: boolean;
  is_trial: boolean;
  remaining_proposals: number;
  current_usage: number;
  proposal_limit: number;
  subscription_plan: string;
  subscription_status: string;
  trial_end_at: string | null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  // Check if accessing proposal creation routes
  if (request.nextUrl.pathname.startsWith('/dashboard/proposals/new')) {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Check if user can create proposals
    const { data: usageInfo, error } = await supabase
      .rpc('get_user_usage_info', { user_uuid: user.id })
      .single()

    const usageData = usageInfo as UsageInfo;

    if (error || !usageData?.can_create_proposal) {
      // Redirect to billing page with error message
      const redirectUrl = new URL('/dashboard/billing', request.url)
      redirectUrl.searchParams.set('error', 'subscription_required')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}