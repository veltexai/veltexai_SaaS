import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSuccess(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailure(invoice);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Get user from subscription metadata or customer email
  const userId = subscription.metadata?.userId;
  let user;

  if (userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();
    user = data;
  } else {
    // Fallback: get customer email from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    const email = (customer as Stripe.Customer).email;

    if (!email) {
      console.error('No email found for customer:', customerId);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    user = data;
  }

  if (!user) {
    console.error('No user found for trial ending:', subscription.id);
    return;
  }

  // Update user profile to indicate trial is ending soon
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'trial_ending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating trial status:', error);
  }

  // Optional: Send notification email or trigger other actions
  console.log(`Trial ending for user ${user.email} in 3 days`);
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  console.log('🔥 Webhook received for subscription:', subscription.id);
  console.log('🔥 Price ID:', subscription.items.data[0]?.price.id);
  console.log('🔥 Customer ID:', subscription.customer);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  // Get customer from metadata or by customer ID
  const userId = subscription.metadata?.userId;
  let user;

  if (userId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();
    user = data;
  } else {
    // Fallback: get customer email from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    const email = (customer as Stripe.Customer).email;

    if (!email) {
      console.error('No email found for customer:', customerId);
      return;
    }

    // Find user by email
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    user = data;
  }

  if (!user) {
    console.error('No user found for subscription:', subscription.id);
    return;
  }

  // Determine plan based on price ID from database
  const { data: planData, error: planError } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('stripe_price_id_monthly', priceId)
    .single();

  console.log('🚀 ~ handleSubscriptionChange ~ planData:', planData);
  console.log('🚀 ~ handleSubscriptionChange ~ planError:', planError);
  let plan = planData?.name || 'starter';

  const subscriptionStatus = subscription.status as
    | 'active'
    | 'canceled'
    | 'past_due'
    | 'unpaid';

  // Update or create subscription
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscriptionStatus,
      plan: plan as 'starter' | 'professional' | 'enterprise',
      current_period_start:
        (subscription as any).current_period_start &&
        typeof (subscription as any).current_period_start === 'number'
          ? new Date(
              (subscription as any).current_period_start * 1000
            ).toISOString()
          : new Date().toISOString(),
      current_period_end:
        (subscription as any).current_period_end &&
        typeof (subscription as any).current_period_end === 'number'
          ? new Date(
              (subscription as any).current_period_end * 1000
            ).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return;
  }

  // Update user profile with subscription info
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_plan: plan,
      subscription_status: subscriptionStatus,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription
) {
  // Update subscription status
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (subscriptionError) {
    console.error('Error canceling subscription:', subscriptionError);
    return;
  }

  // Get user ID from subscription
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (subscriptionData) {
    // Update user profile to reflect cancellation
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionData.user_id);

    if (profileError) {
      console.error('Error updating profile on cancellation:', profileError);
    }
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  console.log('🚀 ~ handlePaymentSuccess ~ invoice:', invoice);
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  console.log('💰 Processing payment success:', {
    invoiceId: invoice.id,
    customerId,
    subscriptionId,
    amount: invoice.amount_paid,
  });

  if (!subscriptionId) {
    console.error('No subscription ID found for invoice:', invoice.id);
    return;
  }

  // Record successful payment
  let { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  console.log('🚀 ~ handlePaymentSuccess ~ subscription:', subscription);

  // If subscription not found, try to find user by customer_id
  if (subError && subError.code === 'PGRST116') {
    console.log(
      'Subscription not found in DB yet, looking up user by customer_id'
    );

    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileError) {
      console.error('Error finding user by customer_id:', profileError);
      return;
    }

    if (userProfile) {
      subscription = { user_id: userProfile.id };
    }
  } else if (subError) {
    console.error('Error finding subscription:', subError);
    return;
  }

  if (subscription) {
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: subscription.user_id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: 'paid',
        invoice_date: new Date(invoice.created * 1000).toISOString(),
      });

    if (billingError) {
      console.error('Error inserting billing history:', billingError);
    } else {
      console.log('✅ Billing history created for user:', subscription.user_id);
    }
  } else {
    console.error(
      'No subscription found for stripe_subscription_id:',
      subscriptionId
    );
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  console.log('❌ Processing payment failure:', {
    invoiceId: invoice.id,
    subscriptionId,
    amount: invoice.amount_due,
  });

  if (!subscriptionId) {
    console.error('No subscription ID found for failed invoice:', invoice.id);
    return;
  }

  // Record failed payment
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subError) {
    console.error('Error finding subscription for failed payment:', subError);
    return;
  }

  if (subscription) {
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: subscription.user_id,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due / 100, // Convert from cents
        currency: invoice.currency,
        status: 'failed',
        invoice_date: new Date(invoice.created * 1000).toISOString(),
      });

    if (billingError) {
      console.error('Error inserting failed billing history:', billingError);
    }
  }
}
