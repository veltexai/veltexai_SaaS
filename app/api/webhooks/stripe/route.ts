import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionChange(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCancellation(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSuccess(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailure(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price.id

  // Get customer email from Stripe
  const customer = await stripe.customers.retrieve(customerId)
  const email = (customer as Stripe.Customer).email

  if (!email) {
    console.error('No email found for customer:', customerId)
    return
  }

  // Find user by email
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!user) {
    console.error('No user found for email:', email)
    return
  }

  // Determine plan based on price ID
  let plan = 'starter'
  if (priceId === process.env.STRIPE_PROFESSIONAL_PRICE_ID) {
    plan = 'professional'
  } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
    plan = 'enterprise'
  }

  // Update or create subscription
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status as 'active' | 'cancelled' | 'past_due' | 'unpaid',
      plan: plan as 'starter' | 'professional' | 'enterprise',
      current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
      current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    })

  if (error) {
    console.error('Error updating subscription:', error)
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error canceling subscription:', error)
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = (invoice as any).subscription as string

  // Record successful payment
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    await supabase.from('billing_history').insert({
      user_id: subscription.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: 'paid',
      invoice_date: new Date(invoice.created * 1000).toISOString(),
    })
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string

  // Record failed payment
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single()

  if (subscription) {
    await supabase.from('billing_history').insert({
      user_id: subscription.user_id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due / 100, // Convert from cents
      currency: invoice.currency,
      status: 'failed',
      invoice_date: new Date(invoice.created * 1000).toISOString(),
    })
  }
}