import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers';

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/60594e16-e3ba-4f71-894d-2513a20042f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout-session/route.ts:7',message:'Request received',data:{plan},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Get authenticated user
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch subscription plan from database
    const { data: selectedPlan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', plan)
      .single();

    if (planError || !selectedPlan) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/60594e16-e3ba-4f71-894d-2513a20042f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout-session/route.ts:34',message:'Plan fetched from DB',data:{planName:selectedPlan.name,stripePriceIdMonthly:selectedPlan.stripe_price_id_monthly,planId:selectedPlan.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    // Check if plan has a valid Stripe price ID
    if (!selectedPlan.stripe_price_id_monthly) {
      return NextResponse.json(
        { error: 'Plan not configured for billing' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user already has a Stripe customer ID
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile.full_name,
        metadata: {
          userId: user.id,
        },
      });

      customerId = customer.id;

      // Update profile with Stripe customer ID
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Check if user is eligible for trial (new users who haven't had a subscription before)
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const isEligibleForTrial = !existingSubscription;

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/60594e16-e3ba-4f71-894d-2513a20042f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout-session/route.ts:95',message:'Before Stripe checkout create',data:{customerId,isEligibleForTrial,priceIdBeingUsed:selectedPlan.stripe_price_id_monthly,stripeKeyPrefix:process.env.STRIPE_SECRET_KEY?.substring(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion

    // Create checkout session with 7-day free trial for eligible users
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPlan.stripe_price_id_monthly,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&trial_started=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
        },
        // 7-day free trial - only for new users
        ...(isEligibleForTrial && { trial_period_days: 7 }),
      },
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/60594e16-e3ba-4f71-894d-2513a20042f1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'create-checkout-session/route.ts:catch',message:'Error caught',data:{errorMessage:(error as Error).message,errorType:(error as Error).name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
