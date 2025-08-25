import Stripe from 'stripe';
import { SUBSCRIPTION_PLANS as CLIENT_SUBSCRIPTION_PLANS } from '@/lib/constants/subscription-plans';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-07-30.basil',
  typescript: true,
});

// Subscription plans configuration with Stripe price IDs
export const SUBSCRIPTION_PLANS = {
  starter: {
    ...CLIENT_SUBSCRIPTION_PLANS.starter,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || 'price_temp_starter',
  },
  professional: {
    ...CLIENT_SUBSCRIPTION_PLANS.professional,
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_temp_professional',
  },
  enterprise: {
    ...CLIENT_SUBSCRIPTION_PLANS.enterprise,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_temp_enterprise',
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;
