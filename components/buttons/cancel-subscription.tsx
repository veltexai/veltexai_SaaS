'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { XCircle, RotateCcw } from 'lucide-react';
import { useConfirmation } from '../providers/confirmation-provider';
import { toast } from 'sonner';

interface CancelSubscriptionButtonProps {
  className?: string;
  onCancellationChanged?: () => Promise<void>;
  isAlreadyCancelled?: boolean;
}

const CancelSubscriptionButton = ({
  className = '',
  onCancellationChanged,
  isAlreadyCancelled = false,
}: CancelSubscriptionButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { confirm } = useConfirmation();

  const handleSubscriptionAction = async () => {
    const isCancelling = !isAlreadyCancelled;

    const confirmed = await confirm({
      title: isCancelling ? 'Cancel Subscription' : 'Reactivate Subscription',
      message: isCancelling
        ? 'Are you sure you want to cancel your subscription? You will continue to have access until the end of your current billing period.'
        : 'Are you sure you want to reactivate your subscription? You will be charged for the next billing period.',
      confirmText: isCancelling ? 'Yes, Cancel' : 'Yes, Reactivate',
      cancelText: isCancelling ? 'Keep Subscription' : 'Keep Cancelled',
      variant: isCancelling ? 'destructive' : 'default',
      illustration: 'Cancel-bro.svg',
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: isCancelling,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          isCancelling
            ? 'Subscription cancelled successfully. You will continue to have access until the end of your billing period.'
            : 'Subscription reactivated successfully. You will be charged for the next billing period.'
        );

        // Call parent refresh function if provided
        if (onCancellationChanged) {
          await onCancellationChanged();
        }
      } else {
        toast.error(
          data.error ||
            `Failed to ${isCancelling ? 'cancel' : 'reactivate'} subscription`
        );
      }
    } catch (error) {
      console.error(
        `Error ${isCancelling ? 'cancelling' : 'reactivating'} subscription:`,
        error
      );
      toast.error(
        `Failed to ${isCancelling ? 'cancel' : 'reactivate'} subscription`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isAlreadyCancelled ? 'outline' : 'destructive'}
      onClick={handleSubscriptionAction}
      disabled={loading}
      className={className}
    >
      {isAlreadyCancelled ? (
        <RotateCcw className="mr-2 h-4 w-4" />
      ) : (
        <XCircle className="mr-2 h-4 w-4" />
      )}
      {loading
        ? isAlreadyCancelled
          ? 'Reactivating...'
          : 'Cancelling...'
        : isAlreadyCancelled
        ? 'Reactivate Subscription'
        : 'Cancel Subscription'}
    </Button>
  );
};

export default CancelSubscriptionButton;
