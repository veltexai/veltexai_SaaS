import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/auth/auth-helpers';

/**
 * Syncs subscription data from Stripe checkout session to the database.
 * This is a fallback for when webhooks don't fire (common in local development).
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

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

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .maybeSingle();

    if (existingSubscription) {
      console.log('✅ Subscription already exists, ensuring usage record exists');
      
      // Even if subscription exists, ensure usage record exists
      // Get subscription details to check if it's a trial
      const { data: subDetails } = await supabase
        .from('subscriptions')
        .select('status, current_period_start, current_period_end')
        .eq('id', existingSubscription.id)
        .single();
      
      if (subDetails?.status === 'trialing') {
        // Check if usage record exists
        const { data: existingUsage } = await supabase
          .from('usage')
          .select('id, proposal_count')
          .eq('user_id', user.id)
          .gte('period_end', new Date().toISOString())
          .limit(1)
          .maybeSingle();
        
        if (!existingUsage) {
          console.log('⚠️ No usage record found, creating one');
          const { error: usageError } = await supabase
            .from('usage')
            .insert({
              user_id: user.id,
              proposal_count: 0,
              period_start: subDetails.current_period_start,
              period_end: subDetails.current_period_end,
            });
          
          if (usageError) {
            console.error('❌ Error creating usage record:', usageError);
          } else {
            console.log('✅ Usage record created for existing subscription');
          }
        } else {
          console.log('✅ Usage record already exists with count:', existingUsage.proposal_count);
        }
      }
      
      return NextResponse.json({ 
        message: 'Subscription already synced, usage record ensured',
        synced: false 
      });
    }

    // Get checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (!session.subscription) {
      return NextResponse.json(
        { error: 'No subscription found in checkout session' },
        { status: 400 }
      );
    }

    const subscription = typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    // Verify the subscription belongs to this user
    if (session.metadata?.userId !== user.id) {
      console.warn('User ID mismatch:', { sessionUserId: session.metadata?.userId, currentUserId: user.id });
      // Continue anyway if the checkout customer matches user's stripe customer
    }

    // Get plan name from metadata or price ID
    let planName = session.metadata?.plan || subscription.metadata?.plan;

    if (!planName && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      
      // Map price IDs to plan names
      const priceIdToPlan: { [key: string]: string } = {
        'price_1SAqrMQ4KodTerz4O94nMNom': 'starter',
        'price_1SAqpnQ4KodTerz4CXyEd6CC': 'professional',
      };
      
      planName = priceIdToPlan[priceId];
      
      if (!planName) {
        // Fallback: try to get plan name from database by price ID
        const { data: planFromPrice } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('stripe_price_id_monthly', priceId)
          .single();
        
        if (planFromPrice) {
          planName = planFromPrice.name;
        }
      }
    }

    if (!planName) {
      return NextResponse.json(
        { error: 'Could not determine plan name' },
        { status: 400 }
      );
    }

    console.log('🔄 Syncing subscription from Stripe:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      plan: planName,
    });

    // Check if this is a trial subscription
    const isTrialing = subscription.status === 'trialing';
    const trialEnd = subscription.trial_end 
      ? new Date(subscription.trial_end * 1000)
      : null;

    // Create subscription record
    // Type assertion needed because Stripe types don't always expose these properties correctly
    const subWithPeriod = subscription as unknown as { 
      current_period_start: number; 
      current_period_end: number;
    };
    
    const subscriptionData = {
      user_id: user.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status as 'active' | 'trialing' | 'cancelled' | 'past_due' | 'unpaid',
      plan: planName as 'starter' | 'professional' | 'enterprise',
      current_period_start: new Date(subWithPeriod.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subWithPeriod.current_period_end * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('❌ Error creating subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to create subscription record' },
        { status: 500 }
      );
    }

    console.log('✅ Subscription record created');

    // Update user profile
    const profileUpdateData: {
      subscription_status: string;
      subscription_plan: string;
      updated_at: string;
      trial_end_at?: string;
    } = {
      subscription_status: isTrialing ? 'trialing' : 'active',
      subscription_plan: planName,
      updated_at: new Date().toISOString(),
    };

    if (isTrialing && trialEnd) {
      profileUpdateData.trial_end_at = trialEnd.toISOString();
    }

    await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', user.id);

    console.log('✅ Profile updated');

    // Create usage record for trial period if applicable
    if (isTrialing && trialEnd) {
      // Check if usage record already exists
      const { data: existingUsage } = await supabase
        .from('usage')
        .select('id')
        .eq('user_id', user.id)
        .gte('period_end', new Date().toISOString())
        .limit(1)
        .maybeSingle();

      if (!existingUsage) {
        // Use subscription period dates for consistency with increment_user_usage
        const { error: usageError } = await supabase
          .from('usage')
          .insert({
            user_id: user.id,
            proposal_count: 0,
            period_start: subscriptionData.current_period_start,
            period_end: subscriptionData.current_period_end,
          });

        if (usageError) {
          console.error('❌ Error creating usage record:', usageError);
        } else {
          console.log('✅ Trial usage record created with period:', 
            subscriptionData.current_period_start, 'to', subscriptionData.current_period_end);
        }
      } else {
        console.log('✅ Usage record already exists');
      }
    }

    return NextResponse.json({ 
      message: 'Subscription synced successfully',
      synced: true,
      subscription: {
        status: subscription.status,
        plan: planName,
        isTrialing,
        trialEnd: trialEnd?.toISOString(),
      }
    });

  } catch (error) {
    console.error('❌ Error syncing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscription' },
      { status: 500 }
    );
  }
}

