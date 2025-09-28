import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { EmailService } from '@/lib/email/service';

// Types
interface UserProfile {
  id: string;
  email: string;
}

interface SubscriptionPlan {
  name: string;
  price_monthly: number;
}

interface ExistingSubscription {
  id: string;
  plan: string;
  stripe_subscription_id: string;
}

interface BillingHistoryRecord {
  user_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  action: 'payment' | 'upgrade' | 'downgrade';
  status: 'paid' | 'failed' | 'pending';
  previous_plan?: string;
  new_plan?: string;
  invoice_url?: string | null;
  invoice_date: string;
  created_at: string;
}

type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'unpaid'
  | 'trial_ending';
type PlanType = 'starter' | 'professional' | 'enterprise';

// Initialize Supabase client
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

async function handleTrialWillEnd(
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;
  let user: UserProfile | null = null;

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
      subscription_status: 'trial_ending' as SubscriptionStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error updating trial status:', error);
  }

  console.log(`Trial ending for user ${user.email} in 3 days`);
}

async function handleSubscriptionChange(
  subscription: Stripe.Subscription
): Promise<void> {
  console.log('🔥 Webhook received for subscription:', subscription.id);
  console.log('🔥 Price ID:', subscription.items.data[0]?.price.id);
  console.log('🔥 Customer ID:', subscription.customer);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.error('No price ID found for subscription:', subscription.id);
    return;
  }

  // Get user from metadata or by customer email
  const user = await getUserFromSubscription(subscription);
  if (!user) {
    console.error('No user found for subscription:', subscription.id);
    return;
  }

  // Get existing subscription to detect plan changes
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id, plan, stripe_subscription_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  // Determine plan based on price ID from database
  const { data: planData, error: planError } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('stripe_price_id_monthly', priceId)
    .single();

  if (planError || !planData) {
    console.error('Plan not found for price ID:', priceId, planError);
    return;
  }

  const newPlan = planData.name as PlanType;
  const subscriptionStatus = subscription.status as SubscriptionStatus;

  console.log('🚀 Plan detected:', newPlan);

  // Check if this is a plan change (upgrade/downgrade)
  const isPlanChange =
    existingSubscription && existingSubscription.plan !== newPlan;
  const isNewSubscription = !existingSubscription;

  // Handle billing history ONLY for plan changes (not new subscriptions)
  if (isPlanChange) {
    await handlePlanChangeBilling(
      subscription,
      user,
      existingSubscription,
      newPlan
    );
  }

  // Prepare subscription data with correct property names
  const subscriptionData = {
    status: subscriptionStatus,
    plan: newPlan,
    current_period_start: (subscription as any).current_period_start
      ? new Date((subscription as any).current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    current_period_end: (subscription as any).current_period_end
      ? new Date((subscription as any).current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Update or create subscription
  let subscriptionError;

  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('stripe_subscription_id', subscription.id);

    subscriptionError = error;
  } else {
    // Create new subscription
    const { error } = await supabase.from('subscriptions').insert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      ...subscriptionData,
      created_at: new Date().toISOString(),
    });

    subscriptionError = error;
  }

  if (subscriptionError) {
    console.error('Error updating subscription:', subscriptionError);
    return;
  }

  // Update user profile with subscription info
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_plan: newPlan,
      subscription_status: subscriptionStatus,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    return;
  }

  // Send email notification
  console.log('📧 About to send subscription email notification...');
  await sendSubscriptionEmail(
    user,
    newPlan,
    isPlanChange,
    isNewSubscription,
    existingSubscription?.plan
  );

  console.log(
    `✅ Subscription ${
      isPlanChange ? 'updated' : isNewSubscription ? 'created' : 'processed'
    } successfully for user ${user.id}`
  );
}

async function sendSubscriptionEmail(
  user: UserProfile,
  newPlan: string,
  isPlanChange: boolean | null,
  isNewSubscription: boolean,
  previousPlan?: string
): Promise<void> {
  try {
    console.log('📧 Starting email send process for:', user.email);
    console.log('📧 Email data:', {
      newPlan,
      isPlanChange,
      isNewSubscription,
      previousPlan,
    });

    // Extract user name from email (fallback if no name field)
    const userName = user.email.split('@')[0];

    const emailData = {
      userEmail: user.email,
      userName,
      planName: newPlan,
      isNewSubscription,
      isUpgrade:
        isPlanChange && previousPlan
          ? await isUpgrade(previousPlan, newPlan)
          : false,
      isDowngrade:
        isPlanChange && previousPlan
          ? await isDowngrade(previousPlan, newPlan)
          : false,
      previousPlan,
    };

    console.log(
      '📧 Calling EmailService.sendSubscriptionEmail with:',
      emailData
    );
    const success = await EmailService.sendSubscriptionEmail(emailData);

    if (success) {
      console.log(`✅ Email sent successfully to ${user.email}`);
    } else {
      console.log(`⚠️ Email sending failed for ${user.email}`);
    }
  } catch (error) {
    console.error('❌ Error sending subscription email:', error);
  }
}

async function isUpgrade(
  previousPlan: string,
  newPlan: string
): Promise<boolean> {
  const [previousPlanResult, newPlanResult] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('name', previousPlan)
      .single(),
    supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('name', newPlan)
      .single(),
  ]);

  const previousPrice = previousPlanResult.data?.price_monthly || 0;
  const newPrice = newPlanResult.data?.price_monthly || 0;

  return newPrice > previousPrice;
}

async function isDowngrade(
  previousPlan: string,
  newPlan: string
): Promise<boolean> {
  const [previousPlanResult, newPlanResult] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('name', previousPlan)
      .single(),
    supabase
      .from('subscription_plans')
      .select('price_monthly')
      .eq('name', newPlan)
      .single(),
  ]);

  const previousPrice = previousPlanResult.data?.price_monthly || 0;
  const newPrice = newPlanResult.data?.price_monthly || 0;

  return newPrice < previousPrice;
}

async function getUserFromSubscription(
  subscription: Stripe.Subscription
): Promise<UserProfile | null> {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata?.userId;
  let user: UserProfile | null = null;

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
      return null;
    }

    // Find user by email
    const { data } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();
    user = data;
  }

  return user;
}

async function handlePlanChangeBilling(
  subscription: Stripe.Subscription,
  user: UserProfile,
  existingSubscription: ExistingSubscription,
  newPlan: string
): Promise<void> {
  try {
    console.log(
      `🔄 Plan change detected: ${existingSubscription.plan} → ${newPlan}`
    );

    // Get plan details for billing history
    const [previousPlanResult, newPlanResult] = await Promise.all([
      supabase
        .from('subscription_plans')
        .select('price_monthly')
        .eq('name', existingSubscription.plan)
        .single(),
      supabase
        .from('subscription_plans')
        .select('price_monthly')
        .eq('name', newPlan)
        .single(),
    ]);

    const previousPlanData = previousPlanResult.data;
    const newPlanData = newPlanResult.data;

    // Get the most recent invoices for the subscription
    const invoices = await stripe.invoices.list({
      subscription: subscription.id,
      limit: 10,
      expand: ['data.lines'],
    });

    console.log(`📄 Found ${invoices.data.length} invoices for subscription`);

    // DEBUG: Log each invoice details
    invoices.data.forEach((invoice, index) => {
      console.log(`📋 Invoice ${index + 1}:`, {
        id: invoice.id,
        amount_paid: invoice.amount_paid,
        status: invoice.status,
        billing_reason: invoice.billing_reason,
        lines: invoice.lines.data.map((line) => ({
          amount: line.amount,
          proration: (line as any).proration,
          description: line.description,
        })),
      });
    });

    // Determine if upgrade or downgrade
    const isUpgradeChange =
      newPlanData &&
      previousPlanData &&
      newPlanData.price_monthly > previousPlanData.price_monthly;

    // Look for the correct invoice with multiple strategies
    let planChangeInvoice: Stripe.Invoice | null = null;
    let billingAmount = 0;

    // Strategy 1: Look for proration invoice
    planChangeInvoice =
      invoices.data.find((invoice) => {
        const hasProration = invoice.lines.data.some(
          (line) => (line as any).proration === true
        );
        console.log(`🔍 Invoice ${invoice.id} has proration: ${hasProration}`);
        return (
          hasProration &&
          (invoice.status === 'paid' || invoice.status === 'open')
        );
      }) || null;

    if (planChangeInvoice) {
      console.log(
        '🚀 ~ planChangeInvoice.amount_paid:',
        planChangeInvoice.amount_paid
      );
      billingAmount = planChangeInvoice.amount_paid;
      console.log(
        `✅ Found proration invoice: ${planChangeInvoice.id} with amount $${
          billingAmount / 100
        }`
      );
    } else {
      // Strategy 2: Look for subscription_update billing reason
      planChangeInvoice =
        invoices.data.find(
          (invoice) =>
            invoice.billing_reason === 'subscription_update' &&
            (invoice.status === 'paid' || invoice.status === 'open')
        ) || null;

      if (planChangeInvoice) {
        billingAmount = planChangeInvoice.amount_paid;
        console.log(
          `✅ Found subscription_update invoice: ${
            planChangeInvoice.id
          } with amount $${billingAmount / 100}`
        );
      } else {
        // Strategy 3: Look for most recent paid invoice
        planChangeInvoice =
          invoices.data.find(
            (invoice) => invoice.status === 'paid' && invoice.amount_paid > 0
          ) || null;

        if (planChangeInvoice) {
          billingAmount = planChangeInvoice.amount_paid;
          console.log(
            `⚠️ Using fallback invoice: ${planChangeInvoice.id} with amount $${
              billingAmount / 100
            }`
          );
        }
      }
    }

    console.log(
      `💰 ${isUpgradeChange ? 'Upgrade' : 'Downgrade'} final amount: $${
        billingAmount / 100
      } (Invoice: ${planChangeInvoice?.id})`
    );

    // Add billing history record for the plan change
    const billingRecord: Omit<BillingHistoryRecord, 'subscription_id'> & {
      subscription_id: string;
    } = {
      user_id: user.id,
      subscription_id: existingSubscription.id,
      action: isUpgradeChange ? 'upgrade' : 'downgrade',
      previous_plan: existingSubscription.plan,
      new_plan: newPlan,
      amount: billingAmount,
      currency: 'usd',
      status: planChangeInvoice?.status === 'paid' ? 'paid' : 'pending',
      stripe_invoice_id: planChangeInvoice?.id || null,
      invoice_url: planChangeInvoice?.hosted_invoice_url || null,
      invoice_date: planChangeInvoice?.created
        ? new Date(planChangeInvoice.created * 1000).toISOString()
        : new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: billingError } = await supabase
      .from('billing_history')
      .insert(billingRecord);

    if (billingError) {
      console.error('Error inserting billing history:', billingError);
    } else {
      console.log(
        `💰 ${isUpgradeChange ? 'Upgrade' : 'Downgrade'} recorded: $${
          billingAmount / 100
        }`
      );
    }
  } catch (error) {
    console.error('Error processing plan change billing:', error);
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription
): Promise<void> {
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
        subscription_status: 'canceled' as SubscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionData.user_id);

    if (profileError) {
      console.error('Error updating profile on cancellation:', profileError);
    }
  }

  console.log(`✅ Subscription canceled for: ${subscription.id}`);
}

async function handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
  console.log('🚀 ~ handlePaymentSuccess ~ invoice:', invoice);
  console.log('🚀 ~ handlePaymentSuccess ~ invoice.lines:', invoice.lines.data);
  console.log('💰 Processing payment success:', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    subscriptionId: invoice.parent?.subscription_details?.subscription,
    amount: invoice.amount_paid,
  });

  // Use the correct subscription ID access pattern
  const subscriptionId = invoice.parent?.subscription_details
    ?.subscription as string;

  if (!subscriptionId) {
    console.error('No subscription ID found for invoice:', invoice.id);
    return;
  }

  // Skip proration invoices (handled by subscription change)
  const hasProration = invoice.lines.data.some(
    (line) => (line as any).proration === true
  );

  if (hasProration) {
    console.log(
      '⏭️ Skipping proration invoice (handled by subscription change):',
      invoice.id
    );
    return;
  }

  // Skip invoices that are part of subscription changes (upgrades/downgrades)
  if (
    invoice.billing_reason === 'subscription_update' ||
    invoice.billing_reason === 'manual'
  ) {
    console.log(
      '⏭️ Skipping subscription update/manual invoice (handled by subscription change):',
      invoice.id
    );
    return;
  }

  // Additional check: if invoice has subscription items that indicate a plan change
  const hasSubscriptionItems = invoice.lines.data.some(
    (line) => (line as any).type === 'subscription'
  );

  // For subscription items, check if this is an immediate charge (not a regular billing cycle)
  if (hasSubscriptionItems) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      // If the invoice was created very close to when the subscription was last updated,
      // it's likely an immediate charge for a plan change
      const subscriptionLastUpdated = subscription.created;
      const invoiceCreated = invoice.created;
      const timeDifference = Math.abs(invoiceCreated - subscriptionLastUpdated);

      // If invoice was created within 10 minutes of subscription update, skip it
      if (timeDifference < 600) {
        // 600 seconds = 10 minutes
        console.log(
          '⏭️ Skipping immediate charge invoice (handled by subscription change):',
          invoice.id
        );
        return;
      }
    } catch (error) {
      console.error('Error checking subscription timing:', error);
    }
  }

  // Check if this invoice is already recorded (to avoid duplicates)
  const { data: existingBilling } = await supabase
    .from('billing_history')
    .select('id')
    .eq('stripe_invoice_id', invoice.id)
    .single();

  if (existingBilling) {
    console.log('✅ Invoice already recorded in billing history:', invoice.id);
    return;
  }

  // Get subscription data (might not exist yet for new subscriptions)
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  // If subscription not found, try to find user by customer_id (for new subscriptions)
  let userId = subscription?.user_id;
  let subscriptionDbId = subscription?.id;

  if (subError && subError.code === 'PGRST116') {
    console.log(
      'Subscription not found in DB yet, looking up user by customer_id'
    );

    const customerId = invoice.customer as string;
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (profileError) {
      console.error('Error finding user by customer_id:', profileError);
      return;
    }

    userId = userProfile?.id;
    subscriptionDbId = null; // Will be null for initial subscription payments
  } else if (subError) {
    console.error('Error finding subscription:', subError);
    return;
  }

  if (userId) {
    const billingRecord: Omit<BillingHistoryRecord, 'subscription_id'> & {
      subscription_id: string | null;
    } = {
      user_id: userId,
      subscription_id: subscriptionDbId, // Will be null for initial payments, filled for renewals
      stripe_invoice_id: invoice.id || null,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      action: 'payment', // Use 'payment' for both initial and renewal payments
      status: 'paid',
      invoice_url: invoice.hosted_invoice_url || null,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: billingError } = await supabase
      .from('billing_history')
      .insert(billingRecord);

    if (billingError) {
      console.error('Error inserting billing history:', billingError);
    } else {
      console.log(`✅ Payment billing history created for user: ${userId}`);
    }
  } else {
    console.error('No user found for subscription:', subscriptionId);
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = invoice.parent?.subscription_details
    ?.subscription as string;

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
    .select('id, user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (subError) {
    console.error('Error finding subscription for failed payment:', subError);
    return;
  }

  if (subscription) {
    const billingRecord: Omit<BillingHistoryRecord, 'subscription_id'> & {
      subscription_id: string;
    } = {
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id || null,
      amount: invoice.amount_due,
      currency: invoice.currency,
      action: 'payment',
      status: 'failed',
      invoice_url: invoice.hosted_invoice_url || null,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    const { error: billingError } = await supabase
      .from('billing_history')
      .insert(billingRecord);

    if (billingError) {
      console.error('Error inserting failed billing history:', billingError);
    } else {
      console.log('✅ Failed payment recorded for user:', subscription.user_id);
    }
  }
}
