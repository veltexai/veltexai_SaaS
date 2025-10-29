'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { XCircle, RotateCcw, AlertTriangle, Calendar, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface EnhancedCancelSubscriptionProps {
  className?: string;
  onCancellationChanged?: () => Promise<void>;
  isAlreadyCancelled?: boolean;
  subscription?: {
    plan: string;
    current_period_end: string;
    canceled_at?: string;
    auto_renewal?: boolean;
  };
}

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive' },
  { value: 'not_using_enough', label: 'Not using it enough' },
  { value: 'missing_features', label: 'Missing features I need' },
  { value: 'found_alternative', label: 'Found a better alternative' },
  { value: 'temporary_pause', label: 'Temporary pause' },
  { value: 'technical_issues', label: 'Technical issues' },
  { value: 'other', label: 'Other reason' },
];

export function EnhancedCancelSubscription({
  className = '',
  onCancellationChanged,
  isAlreadyCancelled = false,
  subscription,
}: EnhancedCancelSubscriptionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleSubscriptionAction = async () => {
    const isCancelling = !isAlreadyCancelled;

    if (isCancelling && !reason) {
      toast.error('Please select a reason for cancellation');
      return;
    }

    if (isCancelling && reason === 'other' && !customReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelAtPeriodEnd: isCancelling,
          reason: isCancelling ? (reason === 'other' ? customReason : reason) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(
          isCancelling
            ? 'Subscription cancelled successfully. You will continue to have access until the end of your billing period.'
            : 'Subscription reactivated successfully. You will be charged for the next billing period.'
        );

        setOpen(false);
        setReason('');
        setCustomReason('');

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

  const renderCancellationDialog = () => (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Cancel Subscription
        </DialogTitle>
        <DialogDescription>
          We're sorry to see you go. Please help us understand why you're cancelling.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Current Plan Info */}
        {subscription && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Current Plan: {subscription.plan}</p>
                <p className="text-sm text-muted-foreground">
                  You'll keep access until {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Cancellation Reason */}
        <div className="space-y-2">
          <Label htmlFor="reason">Reason for cancellation *</Label>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger>
              <SelectValue placeholder="Please select a reason" />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_REASONS.map((reasonOption) => (
                <SelectItem key={reasonOption.value} value={reasonOption.value}>
                  {reasonOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Reason */}
        {reason === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="custom-reason">Please specify *</Label>
            <Textarea
              id="custom-reason"
              placeholder="Tell us more about your reason for cancelling..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        {/* What happens next */}
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">What happens next:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Your subscription will be cancelled at the end of the current billing period</li>
                <li>You'll continue to have full access until then</li>
                <li>No further charges will be made</li>
                <li>You can reactivate anytime before the period ends</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Keep Subscription
        </Button>
        <Button
          variant="destructive"
          onClick={handleSubscriptionAction}
          disabled={loading || !reason || (reason === 'other' && !customReason.trim())}
        >
          {loading ? 'Cancelling...' : 'Cancel Subscription'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const renderReactivationDialog = () => (
    <DialogContent className="sm:max-w-[450px]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-green-500" />
          Reactivate Subscription
        </DialogTitle>
        <DialogDescription>
          Welcome back! Your subscription will be reactivated immediately.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {subscription && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Plan: {subscription.plan}</p>
                <p className="text-sm text-muted-foreground">
                  Billing resumes on {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">What happens next:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                <li>Your subscription will be reactivated immediately</li>
                <li>Billing will resume at the end of your current period</li>
                <li>All features will remain available</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubscriptionAction} disabled={loading}>
          {loading ? 'Reactivating...' : 'Reactivate Subscription'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={isAlreadyCancelled ? 'outline' : 'destructive'}
          className={className}
        >
          {isAlreadyCancelled ? (
            <RotateCcw className="mr-2 h-4 w-4" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          {isAlreadyCancelled ? 'Reactivate Subscription' : 'Cancel Subscription'}
        </Button>
      </DialogTrigger>

      {isAlreadyCancelled ? renderReactivationDialog() : renderCancellationDialog()}
    </Dialog>
  );
}

export default EnhancedCancelSubscription;