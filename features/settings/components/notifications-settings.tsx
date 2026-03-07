'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Bell } from 'lucide-react';

export function NotificationsSettings() {
  const [preferences, setPreferences] = useState({
    email: true,
    marketing: false,
    billing: true,
  });

  const handleSavePreferences = () => {
    // TODO: Implement save preferences logic
    console.log('Saving preferences:', preferences);
  };

  return (
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
            <input
              type="checkbox"
              checked={preferences.email}
              onChange={(e) =>
                setPreferences({ ...preferences, email: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing Emails</Label>
              <p className="text-sm text-gray-600">
                Receive tips and product updates
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.marketing}
              onChange={(e) =>
                setPreferences({ ...preferences, marketing: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Billing Notifications</Label>
              <p className="text-sm text-gray-600">
                Receive billing and payment updates
              </p>
            </div>
            <input
              type="checkbox"
              checked={preferences.billing}
              onChange={(e) =>
                setPreferences({ ...preferences, billing: e.target.checked })
              }
              className="rounded"
            />
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={handleSavePreferences}>
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}
