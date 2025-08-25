import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
})

export const getStripeJs = async () => {
  const stripeJs = await import('@stripe/stripe-js')
  return stripeJs.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for freelancers and small teams',
    price: 29,
    priceId: process.env.STRIPE_STARTER_PRICE_ID!,
    features: [
      'Up to 10 proposals/month',
      'AI-powered content generation',
      'Basic templates',
      'PDF export',
    ],
  },
  professional: {
    name: 'Professional',
    description: 'Best for growing businesses',
    price: 79,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID!,
    features: [
      'Up to 50 proposals/month',
      'Advanced AI features',
      'Premium templates',
      'Team collaboration',
      'Analytics dashboard',
      'Priority support',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    description: 'For large organizations',
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    features: [
      'Unlimited proposals',
      'Custom AI training',
      'White-label solution',
      'Advanced integrations',
      'Dedicated support',
      'Custom contracts',
    ],
  },
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS