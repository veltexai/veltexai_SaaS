'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ReactivateSubscriptionProps {
  onReactivationChanged?: () => void;
  subscription?: {
    plan: string;
    current_period_end: string;
    canceled_at?: string;
  };
  className?: string;
}

export default function ReactivateSubscription({
  onReactivationChanged,
  subscription,
  className,
}: ReactivateSubscriptionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReactivate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stripe/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      toast.success('Subscription reactivated successfully!', {
        description: 'Your subscription is now active and auto-renewal is enabled.',
      });

      setIsOpen(false);
      onReactivationChanged?.();
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast.error('Failed to reactivate subscription', {
        description: error instanceof Error ? error.message : 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const daysUntilExpiration = subscription?.current_period_end 
    ? Math.ceil((new Date(subscription.current_period_end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpiringSoon = daysUntilExpiration <= 7;
  const hasExpired = daysUntilExpiration <= 0;

  if (hasExpired) {
    return null; // Don't show reactivation button for expired subscriptions
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          className={className}
          disabled={!subscription?.canceled_at}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reactivate Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Reactivate Your Subscription
          </DialogTitle>
          <DialogDescription>
            Restore your {subscription?.plan} subscription and continue enjoying all features.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isExpiringSoon && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Act quickly!</strong> Your subscription expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">What happens when you reactivate:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Immediate access to all {subscription?.plan} features</li>
                <li>• Auto-renewal will be enabled</li>
                <li>• Your next billing date: {subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}</li>
                <li>• No interruption to your service</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Your subscription details:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <div><strong>Plan:</strong> {subscription?.plan}</div>
                <div><strong>Current period ends:</strong> {subscription?.current_period_end ? formatDate(subscription.current_period_end) : 'N/A'}</div>
                <div><strong>Status:</strong> Scheduled for cancellation</div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            You can cancel again at any time if you change your mind. No additional charges will apply until your next billing cycle.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleReactivate}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Reactivate Subscription
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}