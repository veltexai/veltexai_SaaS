'use client';

import React, { useState, useEffect } from 'react';
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
import { createClient } from '@/lib/supabase/client';

interface UsageInfo {
  can_create_proposal: boolean;
  is_trial: boolean;
  remaining_proposals: number;
  current_usage: number;
  proposal_limit: number;
  subscription_plan: string;
  subscription_status: string;
  trial_end_at: string | null;
}

const ChangePlanButton = ({
  plans,
  initialBillingHistory,
  currentPlan,
  className = '',
  onPlanChanged,
}: {
  plans: SubscriptionPlan[];
  initialBillingHistory: BillingHistory[];
  currentPlan: SubscriptionPlan | undefined;
  onPlanChanged?: () => Promise<void>;
  className?: string;
}) => {
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);

  // Fetch user usage info when component mounts
  useEffect(() => {
    const fetchUsageInfo = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data, error } = await supabase
            .rpc('get_user_usage_info', { user_uuid: user.id })
            .single();

          if (error) {
            console.error('Error fetching usage info:', error);
          } else {
            setUsageInfo(data as UsageInfo);
          }
        }
      } catch (error) {
        console.error('Error fetching usage info:', error);
      }
    };

    fetchUsageInfo();
  }, []);

  const handlePlanChange = async (plan: SubscriptionPlan) => {
    if (!plan.stripe_price_id_monthly) {
      toast.error('Invalid plan selected');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/upgrade-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPriceId: plan.stripe_price_id_monthly,
          newPlan: plan.name,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        let message = `Successfully changed to ${plan.name} plan!`;

        if (data.isUpgrade && data.chargeAmount > 0) {
          message += ` You've been charged $${data.chargeAmount.toFixed(
            2
          )} immediately.`;
        } else if (data.isDowngrade && data.creditAmount > 0) {
          message += ` You'll receive a $${data.creditAmount.toFixed(
            2
          )} credit on your next billing cycle.`;
        }

        toast.success(message);

        // Close dialog and refresh data
        setPlanDialogOpen(false);

        // Call parent refresh function if provided
        if (onPlanChanged) {
          await onPlanChanged();
        }
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
              <Button variant="outline" className={className}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Choose Your Plan</DialogTitle>
                <DialogDescription>
                  {usageInfo?.remaining_proposals &&
                  usageInfo.remaining_proposals > 0
                    ? `You have ${usageInfo.remaining_proposals} proposal${
                        usageInfo.remaining_proposals !== 1 ? 's' : ''
                      } remaining in your current plan. Changing plans will reset your usage and you'll lose these remaining proposals.`
                    : 'Select a new plan to upgrade or downgrade your subscription. Your usage will be reset with the new plan.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pb-2">
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
                        disabled={plan.name === currentPlan?.name || loading}
                        onClick={() => handlePlanChange(plan)}
                      >
                        {plan.name === currentPlan?.name
                          ? 'Current Plan'
                          : loading
                          ? 'Processing...'
                          : 'Select Plan'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default ChangePlanButton;
