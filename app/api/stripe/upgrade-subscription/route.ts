import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { getUser } from '@/lib/auth/auth-helpers';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { newPriceId, newPlan } = await request.json();

    const supabase = await createClient();

    // Get current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .single();

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Get current plan details
    const { data: currentPlanData } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', subscription.plan)
      .single();

    const { data: newPlanData } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', newPlan)
      .single();
    if (!currentPlanData || !newPlanData) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Determine if upgrade or downgrade
    const isUpgrade = newPlanData.price_monthly > currentPlanData.price_monthly;
    const isDowngrade =
      newPlanData.price_monthly < currentPlanData.price_monthly;

    // Check if subscription is in trial period
    const isTrialing = subscription.status === 'trialing';

    // Calculate the exact difference for immediate charging (only if not trialing)
    const priceDifference =
      newPlanData.price_monthly - currentPlanData.price_monthly;
    const immediateChargeAmount = Math.abs(priceDifference);

    let prorationAmount = 0;
    let chargeResult = null;

    // IMPORTANT: During trial, NO charges and NO proration
    // When trial ends (either 3 proposals used OR 7 days pass):
    // - Stripe will charge the FULL price of whatever plan is active
    // - NOT (new price - old price) because user hasn't paid anything yet
    // This is handled by proration_behavior: 'none' below
    if (isUpgrade && !isTrialing) {
      // For upgrades: charge the exact difference immediately
      try {
        // Get the customer's default payment method
        const customer = await stripe.customers.retrieve(
          subscription.stripe_customer_id
        );

        // Check if customer is deleted
        if (customer.deleted) {
          throw new Error('Customer account has been deleted');
        }

        let defaultPaymentMethod =
          customer.invoice_settings?.default_payment_method;

        // If no default payment method, try to get the first available payment method
        if (!defaultPaymentMethod) {
          const paymentMethods = await stripe.paymentMethods.list({
            customer: subscription.stripe_customer_id,
            type: 'card',
            limit: 1,
          });

          if (paymentMethods.data.length === 0) {
            throw new Error('No payment method found for customer');
          }

          defaultPaymentMethod = paymentMethods.data[0].id;
        }

        // Create an immediate charge for the price difference
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(immediateChargeAmount * 100), // Convert to cents
          currency: 'usd',
          customer: subscription.stripe_customer_id,
          payment_method:
            typeof defaultPaymentMethod === 'string'
              ? defaultPaymentMethod
              : defaultPaymentMethod.id,
          description: `Upgrade from ${currentPlanData.name} to ${newPlanData.name} - Immediate charge for difference`,
          metadata: {
            subscription_id: subscription.stripe_subscription_id,
            upgrade_from: currentPlanData.name,
            upgrade_to: newPlanData.name,
            price_difference: immediateChargeAmount.toString(),
          },
          confirm: true,
          off_session: true, // Indicates this is for an existing customer
        });

        if (paymentIntent.status === 'succeeded') {
          prorationAmount = paymentIntent.amount;
          chargeResult = paymentIntent;
        } else {
          throw new Error(
            `Payment failed with status: ${paymentIntent.status}`
          );
        }
      } catch (chargeError) {
        console.error('❌ Immediate charge failed:', chargeError);
        return NextResponse.json(
          { error: 'Failed to process immediate upgrade charge' },
          { status: 400 }
        );
      }
    }

    // Update subscription in Stripe
    // During trial: no proration needed (no charges until trial ends)
    // For active upgrades: no proration since we charged separately
    // For active downgrades: use proration to handle credits
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        items: [
          {
            id: (
              await stripe.subscriptions.retrieve(
                subscription.stripe_subscription_id
              )
            ).items.data[0].id,
            price: newPriceId,
          },
        ],
        // During trial: no proration (user hasn't paid yet)
        // Active upgrade: no proration (charged separately)
        // Active downgrade: create prorations for credits
        proration_behavior: isTrialing ? 'none' : (isUpgrade ? 'none' : 'create_prorations'),
        billing_cycle_anchor: 'unchanged', // Keep current billing cycle
      }
    );

    // For downgrades (not during trial), get the proration credit
    if (isDowngrade && !isTrialing) {
      // Wait a moment for Stripe to process the proration
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get the most recent invoice after the update
      const invoices = await stripe.invoices.list({
        subscription: subscription.stripe_subscription_id,
        limit: 3,
      });

      // Find the proration invoice - check for proration line items
      const prorationInvoice = invoices.data.find((invoice) =>
        invoice.lines.data.some((line) => (line as any).proration === true)
      );

      prorationAmount = prorationInvoice?.amount_paid || 0;
    }

    // Update subscription in database
    await supabase
      .from('subscriptions')
      .update({
        plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    // Update user profile
    await supabase
      .from('profiles')
      .update({
        subscription_plan: newPlan,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Add billing history record
    // During trial: amount is 0 since no charge was made
    const billingHistoryData = {
      user_id: user.id,
      subscription_id: subscription.id,
      action: isUpgrade ? 'upgrade' : 'downgrade',
      previous_plan: subscription.plan,
      new_plan: newPlan,
      amount: isTrialing 
        ? 0 // No charge during trial
        : isUpgrade
          ? Math.round(immediateChargeAmount * 100)
          : prorationAmount, // Use actual charge amount for upgrades
      currency: 'usd',
      status: isTrialing ? 'pending' : (isUpgrade ? (chargeResult ? 'paid' : 'failed') : 'paid'),
      stripe_invoice_id: isUpgrade && !isTrialing ? chargeResult?.id : null,
      invoice_url: null,
      invoice_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    // Use service client for billing history insertion to bypass RLS (like initial subscriptions)
    const serviceSupabase = await createServiceClient();
    const { data: billingHistoryResult, error: billingHistoryError } =
      await serviceSupabase.from('billing_history').insert(billingHistoryData);

    if (billingHistoryError) {
      console.error('❌ Billing history insert error:', billingHistoryError);
    } else {
      console.log(
        '✅ Billing history inserted successfully:',
        billingHistoryResult
      );
    }

    // Build response message based on trial status
    let responseMessage: string;
    if (isTrialing) {
      responseMessage = `Successfully changed to ${newPlan} plan! You won't be charged until your free trial ends.`;
    } else if (isUpgrade) {
      responseMessage = `Successfully upgraded to ${newPlan}! Charged $${immediateChargeAmount.toFixed(2)} immediately.`;
    } else if (isDowngrade) {
      responseMessage = `Successfully downgraded to ${newPlan}! Credit will be applied to your next billing cycle.`;
    } else {
      responseMessage = `Successfully changed to ${newPlan} plan!`;
    }

    return NextResponse.json({
      success: true,
      newPlan,
      isUpgrade,
      isDowngrade,
      isTrialing,
      chargeAmount: isUpgrade && !isTrialing ? immediateChargeAmount : 0,
      creditAmount: isDowngrade && !isTrialing ? Math.abs(prorationAmount / 100) : 0,
      prorationAmount: isTrialing ? 0 : prorationAmount / 100, // Return in dollars for display
      invoiceId: isUpgrade && !isTrialing ? chargeResult?.id : null,
      paymentIntentId: isUpgrade && !isTrialing ? chargeResult?.id : null,
      message: responseMessage,
      usageLimitChanges: {
        unrestrictedCount: 0,
        restrictedCount: 0,
      },
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade subscription' },
      { status: 500 }
    );
  }
}
