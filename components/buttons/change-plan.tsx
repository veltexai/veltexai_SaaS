'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Check, TrendingUp } from 'lucide-react';
import { SubscriptionPlan } from '@/types/database';
import {
  UsageData,
  SubscriptionData,
  BillingHistory,
} from '@/types/subscription';
import { toast } from 'sonner';

const ChangePlanButton = ({
  plans,
  initialBillingHistory,
  currentPlan,
  className = '',
}: {
  plans: SubscriptionPlan[];
  initialBillingHistory: BillingHistory[];
  currentPlan: SubscriptionPlan | undefined;
  className?: string;
}) => {
  const [portalLoading, setPortalLoading] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>(
    initialBillingHistory
  );

  const fetchBillingData = async () => {
    console.log('Fetching billing data...');
    try {
      // Fetch usage data
      const usageResponse = await fetch('/api/usage/check');
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        console.log('🚀 ~ fetchBillingData ~ usageData:', usageData);
        setUsage(usageData);
      }

      // Fetch subscription data
      const subResponse = await fetch('/api/billing/subscription');
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData);
      }

      // Fetch billing history
      const historyResponse = await fetch('/api/billing/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setBillingHistory(historyData);
      }
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (plan: SubscriptionPlan) => {
    console.log('Plan change requested:', plan);

    if (!plan.stripe_price_id_monthly) {
      console.error('Missing stripe_price_id_monthly for plan:', plan.name);
      toast.error('Plan configuration error. Please contact support.');
      return;
    }

    if (plan.name === currentPlan?.name) {
      toast.info('You are already on this plan');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending upgrade request:', {
        newPriceId: plan.stripe_price_id_monthly,
        newPlan: plan.name,
      });

      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPriceId: plan.stripe_price_id_monthly,
          newPlan: plan.name,
        }),
      });

      const data = await response.json();
      console.log('Upgrade response:', data);

      if (data.success) {
        const isUpgrade = data.isUpgrade;
        const isDowngrade = data.isDowngrade;

        let message = 'Plan changed successfully!';

        if (isUpgrade) {
          message = `Plan upgraded to ${data.newPlan}! `;
          if (data.prorationAmount > 0) {
            message += `You'll be charged $${Math.abs(
              data.prorationAmount
            ).toFixed(2)} for the remaining period.`;
          }
          if (data.usageLimitChanges?.unrestrictedCount > 0) {
            message += ` ${data.usageLimitChanges.unrestrictedCount} previously restricted proposal(s) have been reactivated.`;
          }
        } else if (isDowngrade) {
          message = `Plan changed to ${data.newPlan}. `;
          if (data.prorationAmount < 0) {
            message += `You'll receive a credit of $${Math.abs(
              data.prorationAmount
            ).toFixed(2)}.`;
          }
          if (data.usageLimitChanges?.restrictedCount > 0) {
            message += ` ${data.usageLimitChanges.restrictedCount} proposal(s) have been temporarily restricted due to the new plan limits.`;
          }
        } else {
          if (data.prorationAmount > 0) {
            message += ` You'll be charged $${Math.abs(
              data.prorationAmount
            ).toFixed(2)} for the remaining period.`;
          } else if (data.prorationAmount < 0) {
            message += ` You'll receive a credit of $${Math.abs(
              data.prorationAmount
            ).toFixed(2)}.`;
          }
        }

        toast.success(message);

        // Refresh subscription data
        setPlanDialogOpen(false);
        await fetchBillingData();
      } else {
        toast.error(data.error || 'Failed to change plan');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      toast.error('Failed to change plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {!usage?.isTrial && (
        <>
          <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Choose Your Plan</DialogTitle>
                <DialogDescription>
                  Select a plan that fits your needs. Changes will be prorated.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {plans?.map((plan) => (
                  <Card
                    key={plan.name}
                    className={`relative ${
                      plan.name === usage?.subscriptionPlan
                        ? 'ring-2 ring-blue-500'
                        : ''
                    }`}
                  >
                    {plan.name === currentPlan?.name && (
                      <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        Current Plan
                      </Badge>
                    )}
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}
                        {plan.name === 'pro' && (
                          <Badge variant="secondary">Popular</Badge>
                        )}
                      </CardTitle>
                      <div className="text-3xl font-bold">
                        ${plan.price_monthly}
                        <span className="text-sm font-normal text-muted-foreground">
                          /month
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 h-[calc(100%_-_114px)] flex flex-col justify-between">
                      <ul className="space-y-2 mb-6">
                        {plan.features?.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className="w-full"
                        variant={
                          plan.name === currentPlan?.name
                            ? 'secondary'
                            : 'default'
                        }
                        disabled={
                          plan.name === currentPlan?.name || portalLoading
                        }
                        onClick={() => handlePlanChange(plan)}
                      >
                        {plan.name === currentPlan?.name
                          ? 'Current Plan'
                          : portalLoading
                          ? 'Processing...'
                          : 'Select Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          {/* <Button onClick={handleManageBilling} disabled={portalLoading}>
                <CreditCard className="mr-2 h-4 w-4" />
                {portalLoading ? 'Loading...' : 'Manage Billing'}
              </Button> */}
        </>
      )}
    </div>
  );
};

export default ChangePlanButton;
