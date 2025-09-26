'use client';

import React from 'react';
import { Button } from '../ui/button';
import { useSubscription } from '@/lib/hooks/use-subscription';

const ManageBillingButton = () => {
  const {
    subscription,
    createPortalSession,
    loading: subscriptionLoading,
  } = useSubscription();

  const handleManageBilling = async () => {
    await createPortalSession();
  };
  return (
    <Button
      onClick={handleManageBilling}
      disabled={subscriptionLoading}
      className="w-full"
    >
      {subscriptionLoading ? 'Loading...' : 'Manage Billing'}
    </Button>
  );
};

export default ManageBillingButton;
