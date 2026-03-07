'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionMetricsCards } from './subscription-metrics';
import { SubscriptionFilters } from './subscription-filters';
import { SubscriptionsTable } from './subscriptions-table';
import { BillingHistoryTable } from './billing-history-table';
import {
  SubscriptionMetrics,
  Subscription,
  BillingRecord,
} from '@/types/subscription';

interface SubscriptionAnalyticsClientProps {
  initialMetrics?: SubscriptionMetrics;
  initialSubscriptions?: Subscription[];
  initialBillingHistory?: BillingRecord[];
}

export function SubscriptionAnalyticsClient({
  initialMetrics,
  initialSubscriptions = [],
  initialBillingHistory = [],
}: SubscriptionAnalyticsClientProps) {
  const [metrics, setMetrics] = useState<SubscriptionMetrics | null>(
    initialMetrics || null
  );
  const [subscriptions, setSubscriptions] =
    useState<Subscription[]>(initialSubscriptions);
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>(
    initialBillingHistory
  );
  const [loading, setLoading] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, subscriptionsRes, billingRes] = await Promise.all([
        fetch('/api/admin/subscription-metrics'),
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/billing-history'),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        console.log('🚀 ~ fetchData ~ metricsData:', metricsData);
        setMetrics(metricsData);
      }

      if (subscriptionsRes.ok) {
        const subscriptionsData = await subscriptionsRes.json();
        setSubscriptions(subscriptionsData);
      }

      if (billingRes.ok) {
        const billingData = await billingRes.json();
        setBillingHistory(billingData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      !initialMetrics ||
      !initialSubscriptions.length ||
      !initialBillingHistory.length
    ) {
      fetchData();
    }
  }, []);

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesSearch =
      searchTerm === '' ||
      subscription.user_email
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      subscription.stripe_customer_id
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan =
      planFilter === 'all' || subscription.plan === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {metrics && <SubscriptionMetricsCards metrics={metrics} />}

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          <SubscriptionFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            planFilter={planFilter}
            onSearchChange={setSearchTerm}
            onStatusChange={setStatusFilter}
            onPlanChange={setPlanFilter}
            onRefresh={fetchData}
          />

          <SubscriptionsTable subscriptions={filteredSubscriptions} />
        </TabsContent>

        <TabsContent value="billing">
          <BillingHistoryTable billingHistory={billingHistory} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
