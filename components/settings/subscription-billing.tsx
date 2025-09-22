'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export function SubscriptionBilling() {
  const {
    subscription,
    createPortalSession,
    loading: subscriptionLoading,
  } = useSubscription();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();

  const handleManageBilling = async () => {
    await createPortalSession();
  };

  const currentPlan = plans?.find((plan) => plan.name === subscription?.plan);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <CardTitle>Subscription & Billing</CardTitle>
        </div>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription ? (
          <>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Plan</span>
                <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  {subscription.status}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentPlan?.name}
              </p>
              <p className="text-gray-600">
                ${currentPlan?.price_monthly}/month
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Current period ends:</span>
                <span className="font-medium">
                  {formatDate(subscription.current_period_end)}
                </span>
              </div>
              {subscription.canceled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Canceled on:</span>
                  <span className="font-medium text-red-600">
                    {formatDate(subscription.canceled_at)}
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleManageBilling}
              disabled={subscriptionLoading}
              className="w-full"
            >
              {subscriptionLoading ? 'Loading...' : 'Manage Billing'}
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No active subscription</p>
            <Button asChild>
              <Link href="/pricing">Choose a Plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
