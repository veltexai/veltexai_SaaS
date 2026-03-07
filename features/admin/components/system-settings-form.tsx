'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Settings,
  Save,
  Upload,
  Palette,
  Mail,
  Shield,
  Database,
  Bell,
  Globe,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import EnhancedBrandingSettings from './enhanced-branding-settings';
import { SystemSettings } from '@/types/database';

interface SystemSettingsFormProps {
  initialSettings: SystemSettings;
  defaultSettings: SystemSettings;
  currentUserId: string;
}

const currencies = [
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
  { value: 'CAD', label: 'Canadian Dollar (C$)' },
  { value: 'AUD', label: 'Australian Dollar (A$)' },
];

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
];

export default function SystemSettingsForm({
  initialSettings,
  defaultSettings,
  currentUserId,
}: SystemSettingsFormProps) {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings]);

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // In a real implementation, you would save to a system_settings table
      const { error } = await supabase.from('system_settings').upsert(settings);

      if (error) throw error;

      // Log admin action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'update_system_settings',
        resource_type: 'system_settings',
        details: { updated_at: new Date().toISOString() },
      });

      toast.success('System settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save system settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    try {
      setSettings(defaultSettings);

      // In a real implementation, you would reset in the database
      const { error } = await supabase
        .from('system_settings')
        .upsert(defaultSettings);

      if (error) throw error;

      // Log admin action
      await supabase.from('audit_logs').insert({
        user_id: currentUserId,
        action: 'reset_system_settings',
        resource_type: 'system_settings',
        details: { reset_at: new Date().toISOString() },
      });

      toast.success('Settings reset to defaults');
      setHasChanges(false);
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    }
  };

  const testEmailSettings = async () => {
    console.log('🚀 ~ testEmailSettings ~ settings:', settings);
    try {
      // In a real implementation, you would test the SMTP connection
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp_host: settings.smtp_host,
          smtp_port: settings.smtp_port,
          smtp_username: settings.smtp_username,
          smtp_password: settings.smtp_password,
        }),
      });

      if (response.ok) {
        toast.success('Email settings test successful');
      } else {
        toast.error('Email settings test failed');
      }
    } catch (error) {
      toast.error('Email settings test failed');
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Defaults</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all system settings to their default values.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetToDefaults}>
                Reset Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button onClick={saveSettings} disabled={!hasChanges || saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Business
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding" className="space-y-6">
          <EnhancedBrandingSettings
            initialSettings={settings}
            currentUserId={currentUserId}
            onSettingsChange={(newSettings) => {
              setSettings(prev => ({ ...prev, ...newSettings }));
              setHasChanges(true);
            }}
          />
        </TabsContent>

        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SMTP Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_host">SMTP Host</Label>
                  <Input
                    id="smtp_host"
                    value={settings.smtp_host || ''}
                    onChange={(e) => updateSetting('smtp_host', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_port">SMTP Port</Label>
                  <Input
                    id="smtp_port"
                    type="number"
                    value={settings.smtp_port || 587}
                    onChange={(e) =>
                      updateSetting('smtp_port', parseInt(e.target.value))
                    }
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp_username">SMTP Username</Label>
                  <Input
                    id="smtp_username"
                    value={settings.smtp_username || ''}
                    onChange={(e) =>
                      updateSetting('smtp_username', e.target.value)
                    }
                    placeholder="your-email@gmail.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp_password">SMTP Password</Label>
                  <Input
                    id="smtp_password"
                    type="password"
                    value={settings.smtp_password || ''}
                    onChange={(e) =>
                      updateSetting('smtp_password', e.target.value)
                    }
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_from_address">From Email</Label>
                  <Input
                    id="email_from_address"
                    value={settings.email_from_address}
                    onChange={(e) =>
                      updateSetting('email_from_address', e.target.value)
                    }
                    placeholder="noreply@veltexservices.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_from_name">From Name</Label>
                  <Input
                    id="email_from_name"
                    value={settings.email_from_name}
                    onChange={(e) =>
                      updateSetting('email_from_name', e.target.value)
                    }
                    placeholder="Veltex Services"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={testEmailSettings}>
                  <Mail className="mr-2 h-4 w-4" />
                  Test Email Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="session_timeout">
                    Session Timeout (minutes)
                  </Label>
                  <Input
                    id="session_timeout"
                    type="number"
                    value={settings.session_timeout}
                    onChange={(e) =>
                      updateSetting('session_timeout', parseInt(e.target.value))
                    }
                    min="5"
                    max="480"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password_min_length">
                    Minimum Password Length
                  </Label>
                  <Input
                    id="password_min_length"
                    type="number"
                    value={settings.password_min_length}
                    onChange={(e) =>
                      updateSetting(
                        'password_min_length',
                        parseInt(e.target.value)
                      )
                    }
                    min="6"
                    max="32"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_login_attempts">Max Login Attempts</Label>
                  <Input
                    id="max_login_attempts"
                    type="number"
                    value={settings.max_login_attempts}
                    onChange={(e) =>
                      updateSetting(
                        'max_login_attempts',
                        parseInt(e.target.value)
                      )
                    }
                    min="3"
                    max="10"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="require_2fa"
                    checked={settings.require_2fa}
                    onCheckedChange={(checked) =>
                      updateSetting('require_2fa', checked)
                    }
                  />
                  <Label htmlFor="require_2fa">
                    Require Two-Factor Authentication
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="ai_enabled">
                      AI Enabled
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI-powered features for proposals
                    </p>
                  </div>
                  <Switch
                    id="ai_enabled"
                    checked={settings.ai_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting('ai_enabled', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pdf_generation_enabled">PDF Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable PDF generation for proposals
                    </p>
                  </div>
                  <Switch
                    id="pdf_generation_enabled"
                    checked={settings.pdf_generation_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting('pdf_generation_enabled', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email_notifications_enabled">
                      Email Notifications
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Send email notifications to users
                    </p>
                  </div>
                  <Switch
                    id="email_notifications_enabled"
                    checked={settings.email_notifications_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting('email_notifications_enabled', checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="analytics_enabled">
                      Analytics
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Enable analytics and tracking
                    </p>
                  </div>
                  <Switch
                    id="analytics_enabled"
                    checked={settings.analytics_enabled}
                    onCheckedChange={(checked) =>
                      updateSetting('analytics_enabled', checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_timezone">Business Timezone</Label>
                  <Select
                    value={settings.business_timezone}
                    onValueChange={(value) =>
                      updateSetting('business_timezone', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((timezone) => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_hours_start">
                    Business Hours Start
                  </Label>
                  <Input
                    id="business_hours_start"
                    type="time"
                    value={settings.business_hours_start}
                    onChange={(e) =>
                      updateSetting('business_hours_start', e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_hours_end">Business Hours End</Label>
                  <Input
                    id="business_hours_end"
                    type="time"
                    value={settings.business_hours_end}
                    onChange={(e) =>
                      updateSetting('business_hours_end', e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Maintenance Mode
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="maintenance_mode">
                    Enable Maintenance Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, only admins can access the system
                  </p>
                </div>
                <Switch
                  id="maintenance_mode"
                  checked={settings.maintenance_mode}
                  onCheckedChange={(checked) =>
                    updateSetting('maintenance_mode', checked)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance_message">Maintenance Message</Label>
                <Textarea
                  id="maintenance_message"
                  value={settings.maintenance_message || ''}
                  onChange={(e) =>
                    updateSetting('maintenance_message', e.target.value)
                  }
                  placeholder="Enter the message to display during maintenance"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
