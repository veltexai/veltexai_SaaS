import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { buildAuthPathWithRedirect } from '@/features/auth/utils/redirect'
import { ATTRIBUTION_MAX_AGE_SECONDS, FIRST_TOUCH_COOKIE, LAST_TOUCH_COOKIE, attributionFromUrl, serializeAttribution } from '@/lib/analytics/attribution'

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
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) => {
            void cookieOptions
            request.cookies.set(name, value)
          })
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

  // Proposal creation routes require auth and remaining proposal capacity
  const isQuickProposalRoute = request.nextUrl.pathname.startsWith(
    '/dashboard/proposals/quick',
  )
  const isNewProposalRoute = request.nextUrl.pathname.startsWith(
    '/dashboard/proposals/new',
  )

  if (isQuickProposalRoute || isNewProposalRoute) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Quick route preserves demo context through signup; the advanced
      // builder keeps its existing login redirect.
      if (isQuickProposalRoute) {
        const redirectUrl = new URL(
          buildAuthPathWithRedirect({
            pathname: '/auth/signup',
            redirectTo: `${request.nextUrl.pathname}${request.nextUrl.search}`,
            params: { from: 'demo' },
          }),
          request.url,
        )
        return withAttribution(request, NextResponse.redirect(redirectUrl))
      }
      return withAttribution(request, NextResponse.redirect(new URL('/auth/login', request.url)))
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
      return withAttribution(request, NextResponse.redirect(redirectUrl))
    }
  }

  return withAttribution(request, supabaseResponse)
}

function withAttribution(request: NextRequest, response: NextResponse) {
  const attribution = attributionFromUrl(request.nextUrl, request.headers.get('referer') ?? '')
  if (!attribution) return response
  const value = serializeAttribution(attribution)
  const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: ATTRIBUTION_MAX_AGE_SECONDS }
  if (!request.cookies.has(FIRST_TOUCH_COOKIE)) response.cookies.set(FIRST_TOUCH_COOKIE, value, options)
  response.cookies.set(LAST_TOUCH_COOKIE, value, options)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
