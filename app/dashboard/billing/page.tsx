'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useSubscriptionPlans } from '@/hooks/use-subscription-plans';

interface UsageData {
  currentUsage: number;
  proposalLimit: number;
  canCreateProposal: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  remainingProposals: number;
  isTrial: boolean;
  trialEndAt: string | null;
}

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  stripe_customer_id: string;
}

interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoice_date: string;
  stripe_invoice_id: string;
}

export default function BillingPage() {
  const {
    data: plans,
    isLoading: plansLoading,
    error: plansError,
  } = useSubscriptionPlans();
  const searchParams = useSearchParams();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  );
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetchBillingData();

    // Check for error from middleware redirect
    const error = searchParams.get('error');
    if (error === 'subscription_required') {
      toast.error('You need an active subscription to create proposals');
    }
  }, [searchParams]);

  const fetchBillingData = async () => {
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
      console.error('Error fetching billing data:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'usd') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Billing &amp; Usage</h1>
          <p className="text-muted-foreground">
            Manage your subscription and track usage
          </p>
        </div>
        {!usage?.isTrial && (
          <Button onClick={handleManageBilling} disabled={portalLoading}>
            <CreditCard className="mr-2 h-4 w-4" />
            {portalLoading ? 'Loading...' : 'Manage Billing'}
          </Button>
        )}
      </div>

      {/* Trial Alert */}
      {isTrialActive && (
        <Alert className="border-blue-200 bg-blue-50">
          <Gift className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Welcome to your free trial!</strong> You have{' '}
            {usage.remainingProposals} of 3 free proposals remaining. Your trial
            ends in {trialDaysRemaining} days. Choose a plan below to continue
            creating proposals after your trial.
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expired Alert */}
      {usage?.isTrial && !isTrialActive && (
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
            {usage?.isTrial ? (
              <Gift className="h-4 w-4 text-blue-600" />
            ) : (
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {usage?.isTrial ? 'Free Trial' : currentPlan?.name || 'No Plan'}
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
              {usage?.proposalLimit && usage.proposalLimit > 0 && (
                <span className="text-sm text-muted-foreground">
                  {' '}
                  / {usage.proposalLimit}
                </span>
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
              {usage?.isTrial ? 'Trial Ends' : 'Next Billing'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usage?.isTrial && usage?.trialEndAt
                ? formatDate(usage.trialEndAt)
                : subscription?.current_period_end
                ? formatDate(subscription.current_period_end)
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {usage?.isTrial
                ? `${trialDaysRemaining} days remaining`
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

      {/* Pricing Plans - Show for trial users or when no active subscription */}
      {(usage?.isTrial || !subscription) && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              {usage?.isTrial
                ? 'Select a plan to continue creating proposals after your trial'
                : 'Get started with a subscription plan'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PricingPlans
              plans={plans}
              isLoading={plansLoading}
              error={plansError}
            />
          </CardContent>
        </Card>
      )}

      {/* Billing History - Only show for subscribed users */}
      {!usage?.isTrial && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your recent invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {billingHistory.length > 0 ? (
              <div className="space-y-4">
                {billingHistory.map((invoice) => (
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
