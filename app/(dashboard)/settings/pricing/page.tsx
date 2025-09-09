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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { usePricingSettings } from '@/hooks/use-pricing-settings';
import { toast } from 'sonner';
import {
  Loader2,
  Save,
  RotateCcw,
  DollarSign,
  Percent,
  Clock,
  Wrench,
} from 'lucide-react';
import LoadingPage from '@/components/ui/loading-page';

const SERVICE_TYPES = {
  residential: 'Residential Cleaning',
  commercial: 'Commercial Cleaning',
  carpet: 'Carpet Cleaning',
  window: 'Window Cleaning',
  floor: 'Floor Cleaning',
};

const FREQUENCY_OPTIONS = {
  one_time: 'One Time',
  weekly: 'Weekly',
  bi_weekly: 'Bi-Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};

export default function PricingSettingsPage() {
  const {
    settings,
    loading,
    updateBaseRates,
    updateFrequencyMultipliers,
    updateServiceAdjustments,
    updateLaborSettings,
    resetToDefaults,
  } = usePricingSettings();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('base-rates');

  // Local state for form inputs
  const [baseRates, setBaseRates] = useState<Record<string, number>>({});
  const [frequencyMultipliers, setFrequencyMultipliers] = useState<
    Record<string, number>
  >({});
  const [serviceAdjustments, setServiceAdjustments] = useState<
    Record<string, Record<string, number>>
  >({});
  const [laborSettings, setLaborSettings] = useState({
    laborRate: 0,
    overheadPercentage: 0,
    marginPercentage: 0,
  });

  // Initialize local state when settings load
  useState(() => {
    if (settings) {
      setBaseRates(
        (settings.service_type_rates as Record<string, number>) || {}
      );
      setFrequencyMultipliers(
        (settings.frequency_multipliers as Record<string, number>) || {}
      );
      setServiceAdjustments(
        (settings.service_type_rates as Record<
          string,
          Record<string, number>
        >) || {}
      );
      setLaborSettings({
        laborRate: settings.labor_rate || 0,
        overheadPercentage: settings.overhead_percentage || 0,
        marginPercentage: settings.margin_percentage || 0,
      });
    }
  });

  const handleSaveBaseRates = async () => {
    try {
      setSaving(true);
      await updateBaseRates(baseRates);
    } catch (error) {
      console.error('Failed to save base rates:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFrequencyMultipliers = async () => {
    try {
      setSaving(true);
      await updateFrequencyMultipliers(frequencyMultipliers);
    } catch (error) {
      console.error('Failed to save frequency multipliers:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveServiceAdjustments = async (serviceType: string) => {
    try {
      setSaving(true);
      await updateServiceAdjustments(serviceAdjustments[serviceType] || {});
    } catch (error) {
      console.error('Failed to save service adjustments:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLaborSettings = async () => {
    try {
      setSaving(true);
      await updateLaborSettings(
        laborSettings.laborRate,
        laborSettings.overheadPercentage,
        laborSettings.marginPercentage
      );
    } catch (error) {
      console.error('Failed to save labor settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setSaving(true);
      await resetToDefaults();
      toast.success('Settings reset to defaults');
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="space-y-6 container mx-auto py-6 ">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Pricing Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your pricing rates, multipliers, and service adjustments
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset to Default Settings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will reset all your pricing settings to the default values.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetToDefaults}
                disabled={saving}
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reset Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="base-rates" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Base Rates
          </TabsTrigger>
          <TabsTrigger value="frequency" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Frequency
          </TabsTrigger>
          <TabsTrigger value="adjustments" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Adjustments
          </TabsTrigger>
          <TabsTrigger value="labor" className="flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Labor & Overhead
          </TabsTrigger>
        </TabsList>

        <TabsContent value="base-rates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base Rates per Square Foot</CardTitle>
              <CardDescription>
                Set the base pricing rates for each service type. These rates
                are multiplied by facility size.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(SERVICE_TYPES).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`base-rate-${key}`}>{label}</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={`base-rate-${key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseRates[key] || 0}
                        onChange={(e) =>
                          setBaseRates((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {key === 'window' ? 'Per window' : 'Per sq ft'}
                    </p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveBaseRates} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Base Rates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frequency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Frequency Multipliers</CardTitle>
              <CardDescription>
                Adjust pricing based on service frequency. Values below 1.0
                offer discounts for regular service.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(FREQUENCY_OPTIONS).map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`frequency-${key}`}>{label}</Label>
                    <div className="relative">
                      <Input
                        id={`frequency-${key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={frequencyMultipliers[key] || 1}
                        onChange={(e) =>
                          setFrequencyMultipliers((prev) => ({
                            ...prev,
                            [key]: parseFloat(e.target.value) || 1,
                          }))
                        }
                        placeholder="1.00"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Badge
                          variant={
                            frequencyMultipliers[key] < 1
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {frequencyMultipliers[key] < 1
                            ? 'Discount'
                            : 'Standard'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveFrequencyMultipliers}
                  disabled={saving}
                >
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Frequency Multipliers
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-6">
          {Object.entries(SERVICE_TYPES).map(([serviceKey, serviceLabel]) => (
            <Card key={serviceKey}>
              <CardHeader>
                <CardTitle>{serviceLabel} Adjustments</CardTitle>
                <CardDescription>
                  Additional charges for special requirements or conditions (in
                  dollars).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(serviceAdjustments[serviceKey] || {}).map(
                    ([adjustmentKey, value]) => (
                      <div key={adjustmentKey} className="space-y-2">
                        <Label
                          htmlFor={`adjustment-${serviceKey}-${adjustmentKey}`}
                        >
                          {adjustmentKey
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id={`adjustment-${serviceKey}-${adjustmentKey}`}
                            type="number"
                            step="0.01"
                            min="0"
                            value={value || 0}
                            onChange={(e) =>
                              setServiceAdjustments((prev) => ({
                                ...prev,
                                [serviceKey]: {
                                  ...prev[serviceKey],
                                  [adjustmentKey]:
                                    parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            className="pl-10"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button
                    onClick={() => handleSaveServiceAdjustments(serviceKey)}
                    disabled={saving}
                  >
                    {saving && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    <Save className="h-4 w-4 mr-2" />
                    Save {serviceLabel} Adjustments
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="labor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Labor Rate & Business Overhead</CardTitle>
              <CardDescription>
                Configure your hourly labor rate and business overhead
                percentages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="labor-rate">Hourly Labor Rate</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="labor-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={laborSettings.laborRate}
                      onChange={(e) =>
                        setLaborSettings((prev) => ({
                          ...prev,
                          laborRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="pl-10"
                      placeholder="35.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Base hourly rate for labor
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="overhead-percentage">
                    Overhead Percentage
                  </Label>
                  <div className="relative">
                    <Input
                      id="overhead-percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={laborSettings.overheadPercentage}
                      onChange={(e) =>
                        setLaborSettings((prev) => ({
                          ...prev,
                          overheadPercentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="15.0"
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Business overhead costs
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="margin-percentage">Profit Margin</Label>
                  <div className="relative">
                    <Input
                      id="margin-percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={laborSettings.marginPercentage}
                      onChange={(e) =>
                        setLaborSettings((prev) => ({
                          ...prev,
                          marginPercentage: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="25.0"
                    />
                    <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Desired profit margin
                  </p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Effective Hourly Rate</h4>
                <p className="text-2xl font-bold text-primary">
                  $
                  {(
                    laborSettings.laborRate *
                    (1 + laborSettings.overheadPercentage / 100) *
                    (1 + laborSettings.marginPercentage / 100)
                  ).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Labor rate including overhead and margin
                </p>
              </div>

              <Separator />
              <div className="flex justify-end">
                <Button onClick={handleSaveLaborSettings} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Labor Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
