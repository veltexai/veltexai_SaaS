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
      
      // Get plan name from database by price ID
      const { data: planFromPrice } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('stripe_price_id_monthly', priceId)
        .single();
      
      if (planFromPrice) {
        planName = planFromPrice.name;
        console.log('📋 Mapped plan name from database:', planName);
      } else {
        console.log('⚠️ Unknown price ID:', priceId, '- not found in subscription_plans table');
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

    // Check if this is a trial subscription
    const isTrialing = subscription.status === 'trialing';
    const trialEnd = (subscription as any).trial_end 
      ? new Date((subscription as any).trial_end * 1000)
      : null;

    console.log('📋 Subscription status:', subscription.status, 'Is trialing:', isTrialing);
    if (trialEnd) {
      console.log('📋 Trial ends at:', trialEnd.toISOString());
    }

    // Create subscription record
    const subscriptionData = {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer as string,
      status: subscription.status as
        | 'active'
        | 'trialing'
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
      // If it's a duplicate key error, the subscription already exists - continue to ensure usage record exists
      if (subscriptionError.code === '23505') {
        console.log('ℹ️ Subscription already exists, continuing to ensure usage record exists');
      } else {
        console.error('❌ Error creating subscription:', subscriptionError);
        return;
      }
    }

    // Update user profile based on subscription status
    const profileUpdateData: any = {
      subscription_status: isTrialing ? 'trialing' : 'active',
      subscription_plan: planName,
      updated_at: new Date().toISOString(),
    };

    // Set trial_end_at if this is a trial subscription
    if (isTrialing && trialEnd) {
      profileUpdateData.trial_end_at = trialEnd.toISOString();
      console.log('📋 Setting trial_end_at to:', trialEnd.toISOString());
      
      // Check if usage record already exists before creating
      const { data: existingUsage } = await supabase
        .from('usage')
        .select('id')
        .eq('user_id', userId)
        .gte('period_end', new Date().toISOString())
        .limit(1)
        .maybeSingle();
      
      if (!existingUsage) {
        // Create usage record for trial period using subscription dates for consistency
        // This ensures increment_user_usage can find and update this record
        const { error: usageError } = await supabase
          .from('usage')
          .insert({
            user_id: userId,
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
        console.log('ℹ️ Usage record already exists, skipping creation');
      }
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdateData)
      .eq('id', userId);
    
    if (profileUpdateError) {
      console.error('❌ Error updating profile:', profileUpdateError);
    } else {
      console.log('✅ Profile updated with status:', profileUpdateData.subscription_status);
    }

    // Create billing history record for trial subscription
    // During trial: status is 'pending' (no payment yet)
    // Will be updated to 'paid' when invoice.payment_succeeded fires
    if (isTrialing) {
      console.log('📝 Creating billing record for trial subscription, userId:', userId);
      
      // Delete ALL old billing records for this user when starting a new trial
      // This ensures a clean slate - no duplicate records from previous tests
      const { data: oldRecords, error: selectError } = await supabase
        .from('billing_history')
        .select('id, status, action, stripe_invoice_id')
        .eq('user_id', userId);
      
      if (selectError) {
        console.error('❌ Error checking old billing records:', selectError);
      } else {
        console.log('📝 Found', oldRecords?.length || 0, 'existing billing records:', oldRecords);
      }
      
      if (oldRecords && oldRecords.length > 0) {
        console.log('🧹 Cleaning up', oldRecords.length, 'old billing records for new trial');
        const { error: deleteError } = await supabase
          .from('billing_history')
          .delete()
          .eq('user_id', userId);
        
        if (deleteError) {
          console.error('❌ Error deleting old billing records:', deleteError);
        } else {
          console.log('✅ Successfully deleted old billing records');
        }
      }

      // Create fresh pending billing record for this trial
      const billingData = {
        user_id: userId,
        stripe_invoice_id: null, // No invoice yet during trial
        amount: planData.price_monthly * 100, // Amount that WILL be charged
        currency: 'usd',
        status: 'pending' as const, // Pending until trial ends and payment is made
        action: 'subscription_start' as const,
        new_plan: planName,
        invoice_url: null,
        invoice_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      console.log('📝 Inserting new billing record:', billingData);
      const { error: insertError } = await supabase.from('billing_history').insert(billingData);
      if (insertError) {
        console.error('❌ Error creating pending billing record:', insertError);
      } else {
        console.log('✅ Created pending billing record for trial subscription');
      }
      
      // Verify what's in the database after insert
      const { data: verifyRecords } = await supabase
        .from('billing_history')
        .select('id, status, action, stripe_invoice_id, created_at')
        .eq('user_id', userId);
      console.log('📝 Billing records after insert:', verifyRecords);
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
      
      // Get plan name from database by price ID
      const { data: planFromPrice } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('stripe_price_id_monthly', priceId)
        .single();
      
      if (planFromPrice) {
        newPlanName = planFromPrice.name;
        console.log('📋 Mapped plan name from database:', newPlanName);
      } else {
        console.log('⚠️ Unknown price ID:', priceId, '- not found in subscription_plans table');
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
    const oldStatus = currentSub.status;
    const newStatus = subscription.status;

    // Check if transitioning from trial to active (trial ended)
    const isTrialEnding = oldStatus === 'trialing' && newStatus === 'active';
    
    if (isTrialEnding) {
      console.log('🎉 Trial ended! Transitioning to active subscription');
      
      // Reset usage count for the new billing period
      const periodStart = (subscription as any).current_period_start 
        ? new Date((subscription as any).current_period_start * 1000).toISOString()
        : new Date().toISOString();
      const periodEnd = (subscription as any).current_period_end 
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      // IMPORTANT: Delete ALL old usage records for this user
      // Then create a fresh one with 0 count for the new billing period
      const { error: deleteError } = await supabase
        .from('usage')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('❌ Error deleting old usage records:', deleteError);
      } else {
        console.log('✅ Deleted old usage records');
      }
      
      // Insert fresh usage record with count 0
      const { error: insertError } = await supabase
        .from('usage')
        .insert({
          user_id: userId,
          proposal_count: 0,
          period_start: periodStart,
          period_end: periodEnd,
        });
      
      if (insertError) {
        console.error('❌ Error inserting usage record:', insertError);
      } else {
        console.log('✅ Usage reset to 0 (created new record for period:', periodStart, 'to', periodEnd, ')');
      }
      
      // Clear trial_end_at in profile since trial is over
      await supabase
        .from('profiles')
        .update({
          trial_end_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }

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
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        subscription_plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('❌ Error updating profile in subscription update:', profileUpdateError);
    } else {
      console.log('✅ Profile updated with plan:', newPlan, 'status:', subscription.status);
    }

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
    console.log('💰 Invoice amount_paid:', invoice.amount_paid, 'subscription:', (invoice as any).subscription, 'customer:', invoice.customer);

    // Skip $0 invoices FIRST (trial period invoices - no actual payment)
    if (invoice.amount_paid === 0) {
      console.log('ℹ️ Invoice amount is $0 (trial period), skipping - no payment made');
      return;
    }

    let userId: string | undefined;
    let subscription: any = null;
    let planName: string | undefined;

    // Try to get subscription from invoice
    if ((invoice as any).subscription) {
      subscription = await stripe.subscriptions.retrieve(
        (invoice as any).subscription as string
      );
      userId = subscription.metadata.userId;
      planName = subscription.metadata.plan;
      console.log('📋 Found subscription from invoice:', subscription.id);
    }
    
    // Fallback: Look up user by customer ID if subscription not found on invoice
    if (!userId && invoice.customer) {
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;
      console.log('🔍 Looking up user by customer ID:', customerId);
      
      // Find user by stripe_customer_id in subscriptions table
      const { data: subFromCustomer } = await supabase
        .from('subscriptions')
        .select('user_id, plan, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subFromCustomer) {
        userId = subFromCustomer.user_id;
        planName = subFromCustomer.plan;
        console.log('✅ Found user from customer ID:', userId, 'plan:', planName);
        
        // Also retrieve the full subscription from Stripe if we have the ID
        if (subFromCustomer.stripe_subscription_id && !subscription) {
          try {
            subscription = await stripe.subscriptions.retrieve(subFromCustomer.stripe_subscription_id);
          } catch (e) {
            console.log('⚠️ Could not retrieve subscription from Stripe, continuing...');
          }
        }
      }
    }

    if (!userId) {
      console.error('❌ Could not determine userId from subscription or customer');
      return;
    }

    // Get plan name from subscription if not already set
    if (!planName && subscription?.items?.data?.length > 0) {
      const priceId = subscription.items.data[0].price.id;
      
      // Get plan name from database by price ID
      const { data: planFromPrice } = await supabase
        .from('subscription_plans')
        .select('name')
        .eq('stripe_price_id_monthly', priceId)
        .single();
      
      planName = planFromPrice?.name;
    }
    
    console.log('📋 Processing payment for user:', userId, 'plan:', planName);

    // First, check if there are pending billing records to update (from trial)
    // Update ALL pending records for this user to 'paid' when first real payment comes in
    const { data: pendingRecords } = await supabase
      .from('billing_history')
      .select('id, action')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (pendingRecords && pendingRecords.length > 0) {
      // Update pending subscription_start record with actual payment info
      const subscriptionStartRecord = pendingRecords.find((r: any) => r.action === 'subscription_start');
      if (subscriptionStartRecord) {
        await supabase
          .from('billing_history')
          .update({
            status: 'paid',
            stripe_invoice_id: invoice.id,
            amount: invoice.amount_paid,
            invoice_url: invoice.hosted_invoice_url,
            invoice_date: new Date(invoice.created * 1000).toISOString(),
          })
          .eq('id', subscriptionStartRecord.id);
        console.log('✅ Updated subscription_start record to paid');
      }

      // Update pending plan change records
      const planChangeRecords = pendingRecords.filter((r: any) => 
        r.action === 'upgrade' || r.action === 'downgrade'
      );
      for (const record of planChangeRecords) {
        await supabase
          .from('billing_history')
          .update({
            status: 'paid',
            invoice_date: new Date(invoice.created * 1000).toISOString(),
          })
          .eq('id', record.id);
        console.log('✅ Updated plan change record to paid');
      }

      console.log('✅ Updated', pendingRecords.length, 'pending billing records to paid');
      return; // Don't create a new record, we updated existing ones
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

    // Create new billing history record (for recurring payments after trial)
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
      new_plan: planName || null,
    };

    const { error: billingError } = await supabase.from('billing_history').insert(billingData);
    
    if (billingError) {
      console.error('❌ Error creating billing history:', billingError);
    } else {
      console.log('✅ Billing history created for invoice payment:', {
        amount: invoice.amount_paid / 100,
        plan: planName,
        invoiceId: invoice.id
      });
    }
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
