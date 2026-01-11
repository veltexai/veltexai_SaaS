import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/auth/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    // const user = await getUser();
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { cancelAtPeriodEnd } = await request.json();

    // Get current subscription from database
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Retrieve the full subscription object from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    // Check current states
    const isStripeCancelled = stripeSubscription.cancel_at_period_end;
    const isDatabaseCancelled = !!subscription.canceled_at;

    // If trying to cancel but already cancelled in both places
    if (cancelAtPeriodEnd && isStripeCancelled && isDatabaseCancelled) {
      return NextResponse.json(
        { error: 'Subscription is already scheduled for cancellation' },
        { status: 400 }
      );
    }

    // If trying to reactivate but not cancelled in either place
    if (!cancelAtPeriodEnd && !isStripeCancelled && !isDatabaseCancelled) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    // Update Stripe subscription only if needed
    let updatedSubscription = stripeSubscription;

    if (isStripeCancelled !== cancelAtPeriodEnd) {
      updatedSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: cancelAtPeriodEnd,
        }
      );
    }

    // Use the subscription's current_period_end (works for both active and trialing)
    // For trialing subscriptions, this will be the trial end date
    const subWithPeriod = stripeSubscription as unknown as { current_period_end: number };
    const periodEnd = subWithPeriod.current_period_end || 
      stripeSubscription.cancel_at || 
      stripeSubscription.billing_cycle_anchor;

    // Validate periodEnd before using it
    if (!periodEnd || typeof periodEnd !== 'number') {
      console.error('Invalid period end:', periodEnd);
      return NextResponse.json(
        { error: 'Unable to determine subscription period end' },
        { status: 400 }
      );
    }

    // Update database to match the desired state
    if (cancelAtPeriodEnd) {
      await supabase
        .from('subscriptions')
        .update({
          canceled_at: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      // Update user profile to reflect cancellation
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } else {
      // Remove canceled_at if reactivating subscription
      await supabase
        .from('subscriptions')
        .update({
          canceled_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      // Update user profile
      await supabase
        .from('profiles')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd,
      periodEnd: new Date(periodEnd * 1000).toISOString(),
      message: cancelAtPeriodEnd
        ? 'Subscription will be cancelled at the end of the current billing period'
        : 'Subscription has been reactivated',
    });
  } catch (error) {
    console.error('Error updating subscription cancellation:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
