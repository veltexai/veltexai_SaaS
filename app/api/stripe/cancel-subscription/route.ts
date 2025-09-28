import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/auth/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cancelAtPeriodEnd } = await request.json();

    // Get current subscription from database
    const supabase = await createClient();
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
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

    // Update Stripe subscription
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    // Type-safe access to current_period_end
    const periodEnd =
      'current_period_end' in stripeSubscription
        ? (stripeSubscription.current_period_end as number)
        : null;

    // Update database
    if (cancelAtPeriodEnd) {
      if (!periodEnd) {
        return NextResponse.json(
          { error: 'Unable to determine subscription period end' },
          { status: 400 }
        );
      }

      await supabase
        .from('subscriptions')
        .update({
          canceled_at: new Date(periodEnd * 1000).toISOString(),
        })
        .eq('id', subscription.id);
    } else {
      // Remove canceled_at if uncanceling
      await supabase
        .from('subscriptions')
        .update({
          canceled_at: null,
        })
        .eq('id', subscription.id);
    }

    return NextResponse.json({
      success: true,
      cancelAtPeriodEnd,
      periodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    });
  } catch (error) {
    console.error('Error updating subscription cancellation:', error);
    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}
