'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth/use-auth';
import { useSubscription } from '@/lib/hooks/use-subscription';
import { SUBSCRIPTION_PLANS } from '@/lib/stripe';
import { formatDate } from '@/lib/utils';
import { CreditCard, User, Bell, Shield } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, profile, updateProfile } = useAuth();
  const {
    subscription,
    createPortalSession,
    loading: subscriptionLoading,
  } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    company_name: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        company_name: profile.company_name || '',
      });
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await updateProfile(formData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update profile. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    await createPortalSession();
  };

  const currentPlan = subscription
    ? SUBSCRIPTION_PLANS[
        subscription.plan_name as keyof typeof SUBSCRIPTION_PLANS
      ]
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {message && (
        <Alert
          className={
            message.type === 'error'
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }
        >
          <AlertDescription
            className={
              message.type === 'error' ? 'text-red-800' : 'text-green-800'
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>
              Update your personal information and company details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Email cannot be changed. Contact support if needed.
                </p>
              </div>

              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData({ ...formData, company_name: e.target.value })
                  }
                  placeholder="Enter your company name (optional)"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Subscription & Billing */}
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
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Current Plan</span>
                    <span className="text-sm px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      {subscription.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentPlan?.name}
                  </p>
                  <p className="text-gray-600">${currentPlan?.price}/month</p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current period ends:</span>
                    <span className="font-medium">
                      {formatDate(subscription.current_period_end)}
                    </span>
                  </div>
                  {subscription.canceled_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Canceled on:</span>
                      <span className="font-medium text-red-600">
                        {formatDate(subscription.canceled_at)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleManageBilling}
                  disabled={subscriptionLoading}
                  className="w-full"
                >
                  {subscriptionLoading ? 'Loading...' : 'Manage Billing'}
                </Button>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600 mb-4">No active subscription</p>
                <Button asChild>
                  <Link href="/pricing">Choose a Plan</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>
              Manage your account security settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Password</Label>
              <p className="text-sm text-gray-600">Last updated: Never</p>
              <Button variant="outline" size="sm">
                Change Password
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
              <Button variant="outline" size="sm" disabled>
                Enable 2FA (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure your notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Receive updates about your proposals
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Marketing Emails</Label>
                  <p className="text-sm text-gray-600">
                    Receive tips and product updates
                  </p>
                </div>
                <input type="checkbox" className="rounded" />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Billing Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Receive billing and payment updates
                  </p>
                </div>
                <input type="checkbox" defaultChecked className="rounded" />
              </div>
            </div>

            <Button variant="outline" size="sm">
              Save Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
