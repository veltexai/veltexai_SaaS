'use client';

import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  Gift,
  Clock,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { PricingPlans } from '@/components/pricing/pricing-plans';
import { useCallback, useEffect, useState } from 'react';
import type { SubscriptionPlan } from '@/types/database';
import {
  UsageData,
  SubscriptionData,
  BillingHistory,
} from '@/types/subscription';
import {
  formatCurrency,
  formatDate,
  getDaysRemaining,
  getStatusColor,
} from '@/lib/utils';
import ChangePlanButton from '@/components/buttons/change-plan';
import CancelSubscriptionButton from '@/components/buttons/cancel-subscription';
import FreeTrialInfoBanner from '@/components/ui/free-trial-info-banner';

interface BillingClientProps {
  initialUsage: UsageData | null;
  initialSubscription: SubscriptionData | null;
  initialBillingHistory: BillingHistory[];
  plans: SubscriptionPlan[];
  plansError?: string | null;
}

export function BillingClient({
  initialUsage,
  initialSubscription,
  initialBillingHistory,
  plans,
  plansError,
}: BillingClientProps) {
  const searchParams = useSearchParams();

  // Add state for dynamic data
  const [usage, setUsage] = useState<UsageData | null>(initialUsage);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    initialSubscription
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>(
    initialBillingHistory
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch function to refresh all billing data
  const refreshBillingData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Fetch usage data
      const usageResponse = await fetch('/api/usage/check');
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
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
      console.error('Error refreshing billing data:', error);
      toast.error('Failed to refresh billing information');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Use dynamic data instead of initial props
  const currentPlan = plans?.find(
    (plan) => plan.name === usage?.subscriptionPlan
  );
  const usagePercentage =
    usage && usage.proposalLimit > 0
      ? (usage.currentUsage / usage.proposalLimit) * 100
      : 0;
  const isTrialActive =
    usage?.isTrial &&
    usage?.trialEndAt &&
    new Date(usage.trialEndAt) > new Date();
  const trialDaysRemaining = usage?.trialEndAt
    ? getDaysRemaining(usage.trialEndAt)
    : 0;
  
  // Check if user is in pending state (new user who hasn't selected a plan yet)
  const isPending = usage?.subscriptionStatus === 'pending' || 
    (usage?.subscriptionPlan === 'none' && !subscription);
  
  // Check for welcome parameter (new user redirected after signup)
  const isWelcome = searchParams.get('welcome') === 'true';
  const trialStarted = searchParams.get('trial_started') === 'true';

  // Sync subscription from Stripe if returning from checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    if (sessionId && trialStarted) {
      // Sync subscription data from Stripe (fallback for when webhooks don't fire)
      const syncSubscription = async () => {
        try {
          const response = await fetch('/api/stripe/sync-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          
          if (response.ok) {
            console.log('✅ Subscription sync completed, refreshing billing data');
            // Always refresh billing data after sync to ensure we have the latest
            refreshBillingData();
          }
        } catch (error) {
          console.error('Error syncing subscription:', error);
        }
      };
      
      syncSubscription();
    }
  }, [searchParams, trialStarted, refreshBillingData]);

  useEffect(() => {
    // Check for error from middleware redirect
    const error = searchParams.get('error');
    if (error === 'subscription_required') {
      toast.error('You need an active subscription to create proposals');
    }
    
    // Show success toast if trial just started
    if (trialStarted) {
      toast.success('🎉 Your 7-day free trial has started! You have 3 proposals to try.');
    }
  }, [searchParams, trialStarted]);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="sm:flex-row items-start flex-col flex justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and track usage
          </p>
        </div>
        {currentPlan && (
          <div className="flex gap-3">
            <ChangePlanButton
              plans={plans}
              initialBillingHistory={billingHistory}
              currentPlan={currentPlan}
              onPlanChanged={refreshBillingData}
            />
            <CancelSubscriptionButton
              onCancellationChanged={refreshBillingData}
              isAlreadyCancelled={!!subscription?.canceled_at}
            />
          </div>
        )}
      </div>

      {/* Welcome Alert for New Users (Pending Status) */}
      {isPending && (
        <FreeTrialInfoBanner component="pricing" />
      )}

      {/* Trial Alert (for users with active trial) */}
      {isTrialActive && !isPending && (
        <Alert className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <Gift className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Welcome to your 7-day free trial!</strong> You have{' '}
            <strong>{usage?.remainingProposals}</strong> of 3 free proposals remaining
            {trialDaysRemaining > 0 && <> and <strong>{trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}</strong> left</>}.
            <br />
            <span className="text-sm">
              Trial ends when either time runs out or you&apos;ve used all 3 proposals (whichever comes first).
              Cancel anytime before trial ends - no charge!
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expired Alert */}
      {usage?.isTrial && !isTrialActive && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Your free trial has ended.</strong> You&apos;ve either used all 3 free proposals
            or your 7-day trial period has expired. Choose a subscription plan below to continue 
            creating professional proposals for your cleaning business.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan & Usage */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            {usage?.isTrial ? (
              <Gift className="h-4 w-4 text-blue-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {usage?.isTrial
                ? 'Free Trial'
                : usage?.subscriptionPlan || 'No Plan'}
            </div>
            <p className="text-xs text-muted-foreground">
              {usage?.isTrial
                ? `${usage.proposalLimit} free proposals`
                : currentPlan
                ? formatCurrency(currentPlan.price_monthly) + '/month'
                : 'No active subscription'}
            </p>
            {usage && (
              <Badge
                className={`mt-2 ${getStatusColor(usage.subscriptionStatus)}`}
              >
                {usage.isTrial ? 'Trial' : usage.subscriptionStatus}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Proposals Used
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.currentUsage || 0}
              {usage?.proposalLimit === -1 ? (
                <span className="text-sm text-muted-foreground"> / ∞</span>
              ) : (
                usage?.proposalLimit &&
                usage.proposalLimit > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {' '}
                    / {usage.proposalLimit}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {usage?.proposalLimit === -1
                ? 'Unlimited'
                : `${usage?.remainingProposals || 0} remaining`}
            </p>
            {usage && usage.proposalLimit > 0 && (
              <Progress value={usagePercentage} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isPending
                ? 'Trial Status'
                : usage?.isTrial
                ? 'Trial Ends'
                : subscription?.canceled_at
                ? 'Access Ends'
                : 'Next Billing'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isPending
                ? 'Not Started'
                : usage?.isTrial && usage?.trialEndAt
                ? formatDate(usage.trialEndAt)
                : subscription?.current_period_end
                ? formatDate(subscription.current_period_end)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isPending
                ? 'Choose a plan to start your free trial'
                : usage?.isTrial
                ? `${trialDaysRemaining} days remaining`
                : subscription?.canceled_at
                ? 'Subscription will end'
                : currentPlan
                ? formatCurrency(currentPlan.price_monthly) + ' due'
                : 'No upcoming charges'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Warning */}
      {usage && usage.proposalLimit > 0 && usagePercentage > 80 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              You've used {Math.round(usagePercentage)}% of your{' '}
              {usage.isTrial ? 'trial' : 'monthly'} proposal limit.
              {usage.isTrial
                ? ' Choose a plan below to continue creating proposals.'
                : ' Consider upgrading your plan to avoid interruptions.'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pricing Plans - Show for pending, trial users or when no active subscription */}
      {/* Show pricing plans only when user is pending (needs to select a plan) */}
      {isPending && (
        <Card className="border-2 border-emerald-300 shadow-lg">
          <CardHeader>
            <CardTitle>
              🚀 Choose Your Plan to Start Free Trial
            </CardTitle>
            <CardDescription>
              Select any plan below to begin your 7-day free trial with 3 proposals. Credit card required but you won&apos;t be charged until trial ends.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingPlans
              plans={plans}
              isLoading={false}
              error={plansError ? new Error(plansError) : null}
            />
          </CardContent>
        </Card>
      )}

      {/* Show upgrade options after trial ends (expired trial or no subscription) */}
      {!isPending && !usage?.isTrial && !subscription && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Get started with a subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingPlans
              plans={plans}
              isLoading={false}
              error={plansError ? new Error(plansError) : null}
            />
          </CardContent>
        </Card>
      )}

      {/* Billing History - Show for all users with payment history */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>
            {usage?.isTrial 
              ? 'Your billing will start after the free trial ends'
              : 'Your recent invoices and payments'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.filter(b => b.amount > 0 || b.status === 'pending').length > 0 ? (
            <div className="space-y-4">
              {billingHistory
                .filter(b => b.amount > 0 || b.status === 'pending')
                .map((invoice) => {
                  // Determine description based on action and status
                  const getDescription = () => {
                    const action = invoice.action;
                    const isPending = invoice.status === 'pending';
                    
                    if (action === 'subscription_start') {
                      if (isPending) {
                        return `Subscription to ${invoice.new_plan || 'plan'} (pending trial end)`;
                      }
                      return `First payment - ${invoice.new_plan || 'Subscription'} plan`;
                    }
                    
                    if (action === 'upgrade' || action === 'downgrade') {
                      if (isPending) {
                        return `Plan change to ${invoice.new_plan || 'new plan'} (pending trial end)`;
                      }
                      return `Plan change to ${invoice.new_plan || 'new plan'}`;
                    }
                    
                    if (invoice.stripe_invoice_id) {
                      return `Invoice #${invoice.stripe_invoice_id.slice(-8)}`;
                    }
                    
                    return isPending ? 'Pending charge' : 'Payment';
                  };
                  
                  return (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="font-medium">
                          {formatDate(invoice.invoice_date)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getDescription()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {invoice.status === 'pending'
                            ? formatCurrency(invoice.amount / 100, invoice.currency) + ' (pending)'
                            : formatCurrency(invoice.amount / 100, invoice.currency)
                          }
                        </p>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {usage?.isTrial 
                ? 'No charges yet - you\'re on a free trial'
                : 'No billing history available'
              }
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
