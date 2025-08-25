import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

export function SecuritySettings() {
  return (
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
  );
}