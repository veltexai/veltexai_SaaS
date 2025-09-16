'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  RotateCcw,
  Clock,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface PricingSettings {
  id: string;
  user_id: string;
  labor_rate: number;
  production_rates: {
    [key: string]: number;
  };
  created_at: string;
  updated_at: string;
}

interface PricingSettingsFormProps {
  initialSettings: PricingSettings;
  currentUserId: string;
  defaultProductionRates: { [key: string]: number };
}

export default function PricingSettingsForm({
  initialSettings,
  currentUserId,
  defaultProductionRates,
}: PricingSettingsFormProps) {
  const [settings, setSettings] = useState<PricingSettings | null>(
    initialSettings.id ? initialSettings : null
  );
  const [saving, setSaving] = useState(false);

  // Form state
  const [laborRate, setLaborRate] = useState(initialSettings.labor_rate);
  const [productionRates, setProductionRates] = useState<{
    [key: string]: number;
  }>({
    ...defaultProductionRates,
    ...initialSettings.production_rates,
  });

  const supabase = createClient();

  const savePricingSettings = async () => {
    try {
      setSaving(true);

      const settingsData = {
        user_id: currentUserId,
        labor_rate: laborRate,
        production_rates: productionRates,
      };

      let result;
      if (settings) {
        // Update existing settings
        result = await supabase
          .from('pricing_settings')
          .update(settingsData)
          .eq('id', settings.id)
          .select()
          .single();
      } else {
        // Create new settings
        result = await supabase
          .from('pricing_settings')
          .insert(settingsData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Log admin action
      await supabase.from('admin_audit_log').insert({
        admin_id: currentUserId,
        action: settings
          ? 'pricing_settings_updated'
          : 'pricing_settings_created',
        details: { labor_rate: laborRate, production_rates: productionRates },
      });

      setSettings(result.data);
      toast.success('Pricing settings saved successfully');
    } catch (error) {
      console.error('Error saving pricing settings:', error);
      toast.error('Failed to save pricing settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setLaborRate(75);
    setProductionRates(defaultProductionRates);
    toast.info('Settings reset to defaults');
  };

  const updateProductionRate = (item: string, rate: number) => {
    setProductionRates((prev) => ({
      ...prev,
      [item]: rate,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Save Pricing Settings</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to save these pricing settings? This
                will affect all future proposal calculations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={savePricingSettings}>
                Save Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Labor Rate Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Labor Rate
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="labor-rate">Hourly Rate ($)</Label>
              <Input
                id="labor-rate"
                type="number"
                min="0"
                step="0.01"
                value={laborRate}
                onChange={(e) =>
                  setLaborRate(parseFloat(e.target.value) || 0)
                }
                placeholder="75.00"
              />
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                Current rate:{' '}
                <span className="font-medium">
                  {formatCurrency(laborRate)}/hour
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Rates Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Production Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(productionRates).map(([item, rate]) => (
              <div key={item} className="space-y-2">
                <Label htmlFor={`rate-${item}`}>
                  {item
                    .replace('_', ' ')
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id={`rate-${item}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={rate}
                    onChange={(e) =>
                      updateProductionRate(
                        item,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    placeholder="0.00"
                  />
                  <span className="text-sm text-muted-foreground">
                    each
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}