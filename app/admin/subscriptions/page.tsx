import { SubscriptionAnalyticsClient } from '@/components/admin/subscription-analytics-client';

export default function AdminSubscriptionsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Analytics</h1>
        <p className="text-muted-foreground">
          Monitor subscription metrics and revenue
        </p>
      </div>

      <SubscriptionAnalyticsClient />
    </div>
  );
}
