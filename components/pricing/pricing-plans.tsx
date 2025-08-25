'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/lib/auth/use-auth';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/constants/subscription-plans';

export function PricingPlans() {
  const { user } = useAuth();
  const { subscription, createCheckoutSession, loading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planKey: string) => {
    if (!user) {
      window.location.href = '/auth/signup';
      return;
    }

    setSelectedPlan(planKey);
    await createCheckoutSession(planKey);
    setSelectedPlan(null);
  };

  const isCurrentPlan = (planKey: string) => {
    return (
      subscription?.plan_name === planKey && subscription?.status === 'active'
    );
  };

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the perfect plan for your business needs. Upgrade or
            downgrade at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
            const isPopular = key === 'professional';
            const isCurrent = isCurrentPlan(key);
            const isLoading = selectedPlan === key && loading;

            return (
              <Card
                key={key}
                className={`relative ${
                  isPopular ? 'border-blue-500 border-2' : ''
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="text-base">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(key)}
                    disabled={isCurrent || isLoading}
                  >
                    {isCurrent
                      ? 'Current Plan'
                      : isLoading
                      ? 'Processing...'
                      : user
                      ? 'Upgrade Now'
                      : 'Get Started'}
                  </Button>

                  {isCurrent && (
                    <p className="text-center text-sm text-gray-600 mt-2">
                      You are currently on this plan
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}