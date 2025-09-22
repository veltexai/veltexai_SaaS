'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { SubscriptionPlan } from '@/types/database';

export function PricingPlans({
  plans,
  isLoading,
  error,
}: {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
}) {
  console.log('🚀 ~ PricingPlans ~ plans:', plans);
  const [isAnnual, setIsAnnual] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { createCheckoutSession } = useSubscription();

  if (isLoading) {
    return <div className="text-center">Loading plans...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error loading plans</div>;
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center text-red-500">
        No subscription plans found
      </div>
    );
  }

  const handleGetStarted = async (planName: string) => {
    setCheckoutLoading(true);
    await createCheckoutSession(planName);
    setCheckoutLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            {plan.name === 'professional' && (
              <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-xl capitalize">{plan.name}</CardTitle>
              <div className="text-3xl font-bold">
                ${isAnnual ? plan.price_annual : plan.price_monthly}
                <span className="text-sm font-normal text-muted-foreground">
                  /{isAnnual ? 'year' : 'month'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 h-[calc(100%_-_118px)] flex flex-col justify-between">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                size="lg"
                variant={plan.name === 'professional' ? 'default' : 'outline'}
                onClick={() => handleGetStarted(plan.name)}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Loading...' : 'Get Started'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
