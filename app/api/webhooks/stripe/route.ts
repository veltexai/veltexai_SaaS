import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { EmailService } from '@/lib/email/service';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature found');
      return NextResponse.json(
        { error: 'No signature found' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('✅ Received Stripe webhook event:', event.type);

    const supabase = await createServiceClient();

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabase
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      default:
        console.log(`🔄 Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    console.log('🆕 Processing subscription created:', subscription.id);

    const userId = subscription.metadata.userId;
    let planName = subscription.metadata.plan;

    if (!userId) {
      console.error('❌ Missing userId in subscription metadata');
      return;
    }

    // If plan not in metadata, try to get it from subscription items
    if (!planName && subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      console.log('💰 Price ID from subscription items:', priceId);
      
      // Map price IDs to plan names (hardcoded mapping based on actual Stripe data)
      const priceIdToPlan: { [key: string]: string } = {
        'price_1SAqrMQ4KodTerz4O94nMNom': 'starter',     // $19.90
        'price_1SAqpnQ4KodTerz4CXyEd6CC': 'professional', // $39.90
        // Add more mappings as needed
      };
      
      planName = priceIdToPlan[priceId];
      
      if (planName) {
        console.log('📋 Mapped plan name from price ID:', planName);
      } else {
        console.log('⚠️ Unknown price ID:', priceId);
        // Fallback: try to get plan name from database by price ID
        const { data: planFromPrice } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('stripe_price_id_monthly', priceId)
          .single();
        
        if (planFromPrice) {
          planName = planFromPrice.name;
          console.log('📋 Mapped plan name from database:', planName);
        }
      }
    }

    if (!planName) {
      console.error('❌ Could not determine plan name');
      return;
    }

    // Get plan details
    const { data: planData } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .single();

    if (!planData) {
      console.error('❌ Plan not found:', planName);
      return;
    }

    // Create subscription record
    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status as
        | 'active'
        | 'cancelled'
        | 'past_due'
        | 'unpaid',
      plan: planName as 'starter' | 'professional' | 'enterprise',
      current_period_start: (subscription as any).current_period_start 
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : new Date().toISOString(),
      current_period_end: (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to 30 days from now
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('❌ Error creating subscription:', subscriptionError);
      return;
    }

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: planName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Create billing history record (check for duplicates first)
    const { data: existingBilling } = await supabase
      .from('billing_history')
      .select('id')
      .eq('user_id', userId)
      .eq('stripe_invoice_id', subscription.latest_invoice)
      .single();

    if (!existingBilling) {
      const billingData = {
        user_id: userId,
        stripe_invoice_id: subscription.latest_invoice as string,
        amount: planData.price_monthly * 100, // Convert to cents
        currency: 'usd',
        status: 'paid' as const,
        action: 'payment' as const,
        invoice_url: null,
        invoice_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await supabase.from('billing_history').insert(billingData);
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profile) {
      // Send welcome email
      await EmailService.sendSubscriptionEmail({
        userEmail: profile.email,
        userName: profile.full_name || 'Valued Customer',
        planName: planData.display_name || planName,
        isNewSubscription: true,
      });

      console.log('✅ Welcome email sent to:', profile.email);
    }

    console.log('✅ Subscription created successfully');
  } catch (error) {
    console.error('❌ Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    console.log('🔄 Processing subscription updated:', subscription.id);

    const userId = subscription.metadata.userId;
    let newPlanName: string | undefined;

    if (!userId) {
      console.error('❌ Missing userId in subscription metadata');
      return;
    }

    // Always check the price ID from subscription items first (metadata doesn't update during plan changes)
    if (subscription.items.data.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      console.log('💰 Price ID from subscription items:', priceId);
      
      // Map price IDs to plan names (hardcoded mapping based on actual Stripe data)
      const priceIdToPlan: { [key: string]: string } = {
        'price_1SAqrMQ4KodTerz4O94nMNom': 'starter',     // $19.90
        'price_1SAqpnQ4KodTerz4CXyEd6CC': 'professional', // $39.90
        // Add more mappings as needed
      };
      
      newPlanName = priceIdToPlan[priceId];
      
      if (newPlanName) {
        console.log('📋 Mapped plan name from price ID:', newPlanName);
      } else {
        console.log('⚠️ Unknown price ID:', priceId);
        // Fallback: try to get plan name from database by price ID
        const { data: planFromPrice } = await supabase
          .from('subscription_plans')
          .select('name')
          .eq('stripe_price_id_monthly', priceId)
          .single();
        
        if (planFromPrice) {
          newPlanName = planFromPrice.name;
          console.log('📋 Mapped plan name from database:', newPlanName);
        }
      }
    }

    // Fallback to metadata if price ID mapping failed
    if (!newPlanName) {
      newPlanName = subscription.metadata.plan;
      console.log('📋 Using plan from metadata as fallback:', newPlanName);
    }

    if (!newPlanName) {
      console.error('❌ Could not determine plan name');
      return;
    }

    // Get current subscription from database
    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('stripe_subscription_id', subscription.id)
      .single();

    if (!currentSub) {
      console.error('❌ Subscription not found in database');
      return;
    }

    const oldPlan = currentSub.plan;
    const newPlan = newPlanName || oldPlan;

    // Update subscription in database
    await supabase
      .from('subscriptions')
      .update({
        status: subscription.status,
        plan: newPlan,
        current_period_start: (subscription as any).current_period_start 
          ? new Date((subscription as any).current_period_start * 1000).toISOString()
          : new Date().toISOString(),
        current_period_end: (subscription as any).current_period_end 
          ? new Date((subscription as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        canceled_at: (subscription as any).canceled_at
          ? new Date((subscription as any).canceled_at * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        subscription_plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // If plan changed, send email notification
    if (oldPlan !== newPlan) {
      const { data: newPlanData } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', newPlan)
        .single();

      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      if (profile && newPlanData) {
        // Determine if upgrade or downgrade
        const { data: oldPlanData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('name', oldPlan)
          .single();

        const isUpgrade =
          oldPlanData && newPlanData.price_monthly > oldPlanData.price_monthly;

        await EmailService.sendSubscriptionEmail({
          userEmail: profile.email,
          userName: profile.full_name || 'Valued Customer',
          planName: newPlanData.display_name || newPlan,
          isUpgrade: isUpgrade,
          isDowngrade: !isUpgrade,
          previousPlan: oldPlanData?.display_name || oldPlan,
        });

        console.log(`✅ ${isUpgrade ? 'Upgrade' : 'Downgrade'} email sent to:`, profile.email);
      }
    }

    console.log('✅ Subscription updated successfully');
  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
  }
}

async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    console.log('💰 Processing invoice payment succeeded:', invoice.id);

    if (!(invoice as any).subscription) {
      console.log('ℹ️ Invoice not associated with subscription, skipping');
      return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription as string
    );
    const userId = subscription.metadata.userId;

    if (!userId) {
      console.error('❌ Missing userId in subscription metadata');
      return;
    }

    // Check if billing history already exists to prevent duplicates
    const { data: existingBilling } = await supabase
      .from('billing_history')
      .select('id')
      .eq('user_id', userId)
      .eq('stripe_invoice_id', invoice.id)
      .single();

    if (existingBilling) {
      console.log('ℹ️ Billing history already exists for invoice:', invoice.id);
      return;
    }

    // Create billing history record
    const billingData = {
      user_id: userId,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid' as const,
      action: 'payment' as const,
      invoice_url: invoice.hosted_invoice_url,
      invoice_date: new Date(invoice.created * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };

    await supabase.from('billing_history').insert(billingData);

    console.log('✅ Billing history created for invoice payment');
  } catch (error) {
    console.error('❌ Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  try {
    console.log('❌ Processing invoice payment failed:', invoice.id);

    if (!(invoice as any).subscription) {
      console.log('ℹ️ Invoice not associated with subscription, skipping');
      return;
    }

    // Get subscription details
    const subscription = await stripe.subscriptions.retrieve(
      (invoice as any).subscription as string
    );
    const userId = subscription.metadata.userId;

    if (!userId) {
      console.error('❌ Missing userId in subscription metadata');
      return;
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profile) {
      // Send payment failure email
      await EmailService.sendPaymentFailureEmail({
          userEmail: profile.email,
          userName: profile.full_name || 'Valued Customer',
          amount: (invoice as any).amount_due / 100,
          invoiceUrl: (invoice as any).hosted_invoice_url,
        });

      console.log('✅ Payment failure email sent to:', profile.email);
    }

    console.log('✅ Payment failure handled');
  } catch (error) {
    console.error('❌ Error handling invoice payment failed:', error);
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  try {
    console.log('🗑️ Processing subscription deleted:', subscription.id);

    const userId = subscription.metadata.userId;

    if (!userId) {
      console.error('❌ Missing userId in subscription metadata');
      return;
    }

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Get user profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profile) {
      // Send cancellation email
      await EmailService.sendCancellationEmail({
        userEmail: profile.email,
        userName: profile.full_name || 'Valued Customer',
        endDate: new Date((subscription as any).current_period_end * 1000),
      });

      console.log('✅ Cancellation email sent to:', profile.email);
    }

    console.log('✅ Subscription cancellation handled');
  } catch (error) {
    console.error('❌ Error handling subscription deleted:', error);
  }
}
