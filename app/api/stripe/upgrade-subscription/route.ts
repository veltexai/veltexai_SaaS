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

    const { newPriceId, newPlan } = await request.json();
    console.log('🚀 ~ POST ~ newPlan:', newPlan);
    console.log('🚀 ~ POST ~ newPriceId:', newPriceId);
    const supabase = await createClient();

    // Get current subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
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

    // Update subscription in Stripe with proration
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
        proration_behavior: 'always_invoice',
        billing_cycle_anchor: 'unchanged', // Keep current billing cycle
      }
    );

    // Wait a moment for Stripe to process the proration
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the most recent invoice after the update
    const invoices = await stripe.invoices.list({
      subscription: subscription.stripe_subscription_id,
      limit: 3,
      status: 'paid',
    });

    // Find the proration invoice - check for proration line items
    const prorationInvoice = invoices.data.find((invoice) =>
      invoice.lines.data.some((line) => (line as any).proration === true)
    );

    const prorationAmount = prorationInvoice?.amount_paid || 0;

    // Determine if upgrade or downgrade
    const isUpgrade = newPlanData.price_monthly > currentPlanData.price_monthly;
    const isDowngrade =
      newPlanData.price_monthly < currentPlanData.price_monthly;

    // For upgrades, charge immediately
    if (isUpgrade) {
      try {
        // Create and finalize invoice immediately for upgrades
        const invoice = await stripe.invoices.create({
          customer: subscription.stripe_customer_id,
          subscription: subscription.stripe_subscription_id,
          auto_advance: true, // Automatically finalize and attempt payment
        });

        // Check if invoice was created successfully before proceeding
        if (invoice?.id) {
          await stripe.invoices.finalizeInvoice(invoice.id);
          await stripe.invoices.pay(invoice.id);
          console.log('✅ Immediate charge successful for upgrade');
        } else {
          console.error('❌ Invoice creation failed - no invoice ID');
        }
      } catch (chargeError) {
        console.error('❌ Immediate charge failed:', chargeError);
        // Continue with the subscription update even if immediate charge fails
      }
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
    // await supabase.from('billing_history').insert({
    //   user_id: user.id,
    //   subscription_id: subscription.id,
    //   action: isUpgrade ? 'upgrade' : 'downgrade',
    //   previous_plan: subscription.plan,
    //   new_plan: newPlan,
    //   amount: prorationAmount, // Keep in cents for consistency
    //   currency: 'usd',
    //   status: prorationInvoice?.status === 'paid' ? 'paid' : 'pending',
    //   stripe_invoice_id: prorationInvoice?.id || null,
    //   invoice_url: prorationInvoice?.hosted_invoice_url || null,
    //   invoice_date: prorationInvoice?.created
    //     ? new Date(prorationInvoice.created * 1000).toISOString()
    //     : new Date().toISOString(),
    //   created_at: new Date().toISOString(),
    // });

    return NextResponse.json({
      success: true,
      newPlan,
      isUpgrade,
      isDowngrade,
      prorationAmount: prorationAmount / 100, // Return in dollars for display
      invoiceId: prorationInvoice?.id,
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
