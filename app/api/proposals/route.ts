import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/queries/user';
import { proposalFormSchema } from '@/lib/validations/proposal';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { user } = await getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Check if user can create proposals using get_user_usage_info (more reliable)
    const { data: usageInfo, error: checkError } = await supabase
      .rpc('get_user_usage_info', { user_uuid: user.id })
      .single();

    const usage = usageInfo as { 
      current_usage?: number; 
      proposal_limit?: number; 
      can_create_proposal?: boolean;
      subscription_status?: string;
      remaining_proposals?: number;
    } | null;

    console.log('🔍 User usage info:', usage);

    if (checkError) {
      console.error('❌ Error checking proposal limit:', checkError);
      return NextResponse.json(
        {
          error: 'Error checking proposal limit. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!usage?.can_create_proposal) {
      console.log('🚫 User cannot create proposal:', {
        userId: user.id,
        usageInfo: usage,
      });

      return NextResponse.json(
        {
          error: `You have reached your proposal limit (${usage?.current_usage || 0}/${usage?.proposal_limit || 0}). Please upgrade your plan.`,
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = proposalFormSchema.parse(body);

    // Transform the data to match database schema
    const proposalData = {
      user_id: user.id,
      title: validatedData.title,
      service_type: validatedData.service_type,
      template_id: validatedData.template_id,
      // Extract fields from global_inputs to match database columns
      client_name: validatedData.global_inputs.client_name,
      client_email: validatedData.global_inputs.client_email,
      client_company: validatedData.global_inputs.client_company,
      contact_phone: validatedData.global_inputs.contact_phone,
      service_location: validatedData.global_inputs.service_location,
      facility_size: validatedData.global_inputs.facility_size,
      service_frequency: validatedData.global_inputs.service_frequency,
      regional_location: validatedData.global_inputs.regional_location,
      // Keep nested data as JSON
      global_inputs: validatedData.global_inputs,
      service_specific_data: validatedData.service_specific_data,
      pricing_enabled: validatedData.pricing_enabled,
      pricing_data: validatedData.pricing_data,
      generated_content: validatedData.generated_content,
      status: validatedData.status,
      // Include enhanced fields
      facility_details: validatedData.facility_details,
      traffic_analysis: validatedData.traffic_analysis,
      service_scope: validatedData.service_scope,
      special_requirements: validatedData.special_requirements,
      ai_tone: validatedData.ai_tone,
    };

    // Create the proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .insert(proposalData)
      .select()
      .single();

    if (proposalError) {
      console.error('Error creating proposal:', proposalError);
      return NextResponse.json(
        { error: 'Failed to create proposal' },
        { status: 500 }
      );
    }

    // Insert selected add-ons if provided
    const selectedAddons = Array.isArray(body.selected_addons)
      ? body.selected_addons
      : [];
    if (selectedAddons.length > 0) {
      const rows = selectedAddons.map((a: any) => ({
        proposal_id: proposal.id,
        sku: a.sku,
        label: a.label,
        unit_type: a.unit_type,
        rate: a.rate,
        qty: a.qty,
        min_qty: a.min_qty,
        frequency: a.frequency,
        monthly_amount: a.monthly_amount,
        notes: a.notes || null,
      }));
      const { error: addonsError } = await supabase
        .from('proposal_additional_services')
        .insert(rows);
      if (addonsError) {
        console.error('Error inserting add-ons:', addonsError);
      }
    }

    // Increment user's proposal usage
    const { data: usageIncremented, error: usageError } = await supabase.rpc('increment_user_usage', {
      user_uuid: user.id,
    });

    if (usageError) {
      console.error('Error incrementing usage:', usageError);
      // Don't fail the request, just log the error
    } else if (usageIncremented === false) {
      // The function returned FALSE, meaning no subscription was found
      console.warn('⚠️ Usage not incremented - no active subscription found for user:', user.id);
      console.warn('This may happen if Stripe webhook did not fire. Please ensure the subscription is synced.');
    } else {
      console.log('✅ Usage incremented successfully for user:', user.id);
      
      // Check if user just used their 3rd trial proposal - end trial immediately
      const newUsageCount = (usage?.current_usage || 0) + 1;
      
      if (newUsageCount >= 3) {
        // Get subscription to check if trialing
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('stripe_subscription_id, status, plan, current_period_start, current_period_end')
          .eq('user_id', user.id)
          .eq('status', 'trialing')
          .single();
        
        if (subscription?.stripe_subscription_id) {
          console.log('🎯 User used 3rd trial proposal - ending Stripe trial immediately');
          
          try {
            // End the trial immediately - this triggers Stripe to charge the user
            const updatedSubscription = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
              trial_end: 'now',
            });
            
            console.log('✅ Stripe trial ended - user will be charged for their plan');
            
            // IMMEDIATELY reset usage and update database (don't wait for webhook)
            // This ensures usage is reset even if webhook doesn't fire correctly
            
            // Get new period dates from Stripe
            const periodStart = (updatedSubscription as any).current_period_start 
              ? new Date((updatedSubscription as any).current_period_start * 1000).toISOString()
              : new Date().toISOString();
            const periodEnd = (updatedSubscription as any).current_period_end 
              ? new Date((updatedSubscription as any).current_period_end * 1000).toISOString()
              : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            
            // Delete old usage records and create fresh one
            await supabase.from('usage').delete().eq('user_id', user.id);
            await supabase.from('usage').insert({
              user_id: user.id,
              proposal_count: 0,
              period_start: periodStart,
              period_end: periodEnd,
            });
            console.log('✅ Usage reset to 0 for new billing period');
            
            // Update subscription status in database
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                current_period_start: periodStart,
                current_period_end: periodEnd,
                updated_at: new Date().toISOString(),
              })
              .eq('stripe_subscription_id', subscription.stripe_subscription_id);
            
            // Update profile
            await supabase
              .from('profiles')
              .update({
                subscription_status: 'active',
                trial_end_at: null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
            
            console.log('✅ Database updated: subscription active, usage reset');
            
            // NOTE: Don't update billing records here - let the webhook handle it
            // The invoice.payment_succeeded webhook will update pending records to paid
            // with proper invoice details (invoice_id, invoice_url, etc.)
            console.log('ℹ️ Billing records will be updated by webhook when Stripe processes payment');
            
          } catch (stripeError) {
            console.error('❌ Error ending Stripe trial:', stripeError);
            // Don't fail the request - the proposal was already created
          }
        }
      }
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error in proposal creation:', error);
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    );
  }
}
