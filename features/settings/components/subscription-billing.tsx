import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import ManageBillingButton from '../buttons/manage-billing';
import { getSubscriptionPlans, getUserSubscription } from '@/lib/stripe';
import ChangePlanButton from '../buttons/change-plan';
import EnhancedCancelSubscription from '../buttons/enhanced-cancel-subscription';
import ReactivateSubscription from '../buttons/reactivate-subscription';

export async function SubscriptionBilling({ userId }: { userId: string }) {
  const plans = await getSubscriptionPlans();
  const subscription = await getUserSubscription(userId);

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
            {/* Plan Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Current Plan</span>
                <div className="flex items-center gap-2">
                  {/* Auto-renewal status */}
                  {subscription.auto_renewal !== false && !subscription.canceled_at && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Auto-renew
                    </Badge>
                  )}
                  
                  {/* Main status */}
                  <Badge
                    variant={subscription.canceled_at ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {subscription.canceled_at ? 'Cancelled' : subscription.status}
                  </Badge>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                {currentPlan?.name}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                {subscription.canceled_at
                  ? 'Access until period end'
                  : `$${currentPlan?.price_monthly}/month`}
              </p>
            </div>

            {/* Cancellation Alert */}
            {subscription.canceled_at && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Subscription Cancelled</p>
                    <p className="text-sm">
                      You'll continue to have access until {formatDate(subscription.current_period_end)}.
                      You can reactivate anytime before then.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Grace Period Alert */}
            {subscription.grace_period_end && new Date(subscription.grace_period_end) > new Date() && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Grace Period Active</p>
                    <p className="text-sm">
                      Extended access until {formatDate(subscription.grace_period_end)}.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Subscription Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {subscription.canceled_at
                    ? 'Access ends:'
                    : 'Current period ends:'}
                </span>
                <span className="font-medium">
                  {formatDate(subscription.current_period_end)}
                </span>
              </div>
              
              {subscription.canceled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Canceled on:</span>
                  <span className="font-medium text-red-600">
                    {formatDate(subscription.canceled_at)}
                  </span>
                </div>
              )}

              {subscription.cancellation_reason && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Reason:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {subscription.cancellation_reason.replace(/_/g, ' ')}
                  </span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Auto-renewal:</span>
                <span className="font-medium">
                  {subscription.auto_renewal !== false ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <ChangePlanButton
                plans={plans}
                initialBillingHistory={[]}
                currentPlan={currentPlan}
                className="w-full"
              />
              
              {subscription.canceled_at ? (
                <ReactivateSubscription
                  subscription={{
                    plan: currentPlan?.name || subscription.plan,
                    current_period_end: subscription.current_period_end,
                    canceled_at: subscription.canceled_at,
                  }}
                  className="w-full"
                />
              ) : (
                <EnhancedCancelSubscription
                  isAlreadyCancelled={false}
                  subscription={{
                    plan: currentPlan?.name || subscription.plan,
                    current_period_end: subscription.current_period_end,
                    canceled_at: subscription.canceled_at,
                    auto_renewal: subscription.auto_renewal,
                  }}
                  className="w-full"
                />
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No active subscription</p>
            <Button asChild>
              <Link href="/dashboard/billing">Choose a Plan</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
