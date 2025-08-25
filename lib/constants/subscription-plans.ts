export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    description: 'Perfect for freelancers and small teams',
    price: 29,
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
    features: [
      'Unlimited proposals',
      'Custom AI training',
      'White-label solution',
      'Advanced integrations',
      'Dedicated support',
      'Custom contracts',
    ],
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;