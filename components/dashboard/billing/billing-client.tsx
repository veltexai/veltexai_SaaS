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
} from 'lucide-react';
import { toast } from 'sonner';
import { PricingPlans } from '@/components/pricing/pricing-plans';
import { useEffect } from 'react';
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

  useEffect(() => {
    // Check for error from middleware redirect
    const error = searchParams.get('error');
    if (error === 'subscription_required') {
      toast.error('You need an active subscription to create proposals');
    }
  }, [searchParams]);

  const currentPlan = plans?.find(
    (plan) => plan.name === initialUsage?.subscriptionPlan
  );
  const usagePercentage =
    initialUsage && initialUsage.proposalLimit > 0
      ? (initialUsage.currentUsage / initialUsage.proposalLimit) * 100
      : 0;
  const isTrialActive =
    initialUsage?.isTrial &&
    initialUsage?.trialEndAt &&
    new Date(initialUsage.trialEndAt) > new Date();
  const trialDaysRemaining = initialUsage?.trialEndAt
    ? getDaysRemaining(initialUsage.trialEndAt)
    : 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and track usage
          </p>
        </div>
        <ChangePlanButton
          plans={plans}
          initialBillingHistory={initialBillingHistory}
          currentPlan={currentPlan}
          className="flex gap-2"
        />
      </div>

      {/* Trial Alert */}
      {isTrialActive && (
        <Alert className="border-blue-200 bg-blue-50">
          <Gift className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Welcome to your free trial!</strong> You have{' '}
            {initialUsage.remainingProposals} of 3 free proposals remaining.
            Your trial ends in {trialDaysRemaining} days. Choose a plan below to
            continue creating proposals after your trial.
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expired Alert */}
      {initialUsage?.isTrial && !isTrialActive && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Your trial has expired.</strong> Please choose a
            subscription plan to continue creating proposals.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan & Usage */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
            {initialUsage?.isTrial ? (
              <Gift className="h-4 w-4 text-blue-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {initialUsage?.isTrial
                ? 'Free Trial'
                : initialUsage?.subscriptionPlan || 'No Plan'}
            </div>
            <p className="text-xs text-muted-foreground">
              {initialUsage?.isTrial
                ? `${initialUsage.proposalLimit} free proposals`
                : currentPlan
                ? formatCurrency(currentPlan.price_monthly) + '/month'
                : 'No active subscription'}
            </p>
            {initialUsage && (
              <Badge
                className={`mt-2 ${getStatusColor(
                  initialUsage.subscriptionStatus
                )}`}
              >
                {initialUsage.isTrial
                  ? 'Trial'
                  : initialUsage.subscriptionStatus}
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
              {initialUsage?.currentUsage || 0}
              {initialUsage?.proposalLimit === -1 ? (
                <span className="text-sm text-muted-foreground"> / ∞</span>
              ) : (
                initialUsage?.proposalLimit &&
                initialUsage.proposalLimit > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {' '}
                    / {initialUsage.proposalLimit}
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {initialUsage?.proposalLimit === -1
                ? 'Unlimited'
                : `${initialUsage?.remainingProposals || 0} remaining`}
            </p>
            {initialUsage && initialUsage.proposalLimit > 0 && (
              <Progress value={usagePercentage} className="mt-2" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {initialUsage?.isTrial ? 'Trial Ends' : 'Next Billing'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {initialUsage?.isTrial && initialUsage?.trialEndAt
                ? formatDate(initialUsage.trialEndAt)
                : initialSubscription?.current_period_end
                ? formatDate(initialSubscription.current_period_end)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {initialUsage?.isTrial
                ? `${trialDaysRemaining} days remaining`
                : currentPlan
                ? formatCurrency(currentPlan.price_monthly) + ' due'
                : 'No upcoming charges'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Warning */}
      {initialUsage &&
        initialUsage.proposalLimit > 0 &&
        usagePercentage > 80 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center gap-2 pt-6">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                You've used {Math.round(usagePercentage)}% of your{' '}
                {initialUsage.isTrial ? 'trial' : 'monthly'} proposal limit.
                {initialUsage.isTrial
                  ? ' Choose a plan below to continue creating proposals.'
                  : ' Consider upgrading your plan to avoid interruptions.'}
              </p>
            </CardContent>
          </Card>
        )}

      {/* Pricing Plans - Show for trial users or when no active subscription */}
      {(initialUsage?.isTrial || !initialSubscription) && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              {initialUsage?.isTrial
                ? 'Select a plan to continue creating proposals after your trial'
                : 'Get started with a subscription plan'}
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

      {/* Billing History - Only show for subscribed users */}
      {!initialUsage?.isTrial && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your recent invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {initialBillingHistory.length > 0 ? (
              <div className="space-y-4">
                {initialBillingHistory.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDate(invoice.invoice_date)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invoice #{invoice.stripe_invoice_id.slice(-8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No billing history available
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
