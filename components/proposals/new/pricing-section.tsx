'use client';

import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { type ProposalFormData } from '@/lib/validations/proposal';
import {
  Calculator,
  DollarSign,
  Clock,
  Users,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { usePricingSettings } from '@/hooks/use-pricing-settings';
import { AIContentGenerator } from './ai-content-generator';

interface PricingSectionProps {
  serviceType: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPricingCalculated?: (pricing: any) => void;
  currentStep?: number;
  onGeneratingChange?: (generating: boolean) => void;
}

export function PricingSection({
  serviceType,
  enabled,
  onEnabledChange,
  currentStep,
  onGeneratingChange,
}: PricingSectionProps) {
  const form = useFormContext<ProposalFormData>();
  const { settings } = usePricingSettings();
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculatedPricing, setCalculatedPricing] = useState<any>(null);
  const [lastCalculationTrigger, setLastCalculationTrigger] =
    useState<string>('');

  const watchedValues = form.watch([
    'global_inputs.facility_size',
    'global_inputs.service_frequency',
    'service_specific_data',
  ]);

  const calculatePricing = async () => {
    setIsCalculating(true);
    try {
      const formData = form.getValues();

      // Basic pricing calculation logic
      const baseRates: Record<string, number> = {
        residential: 0.15, // per sq ft
        commercial: 0.12,
        carpet: 0.25,
        window: 8.0, // per window
        floor: 0.2,
      };

      const frequencyMultipliers: Record<string, number> = {
        one_time: 1.0,
        weekly: 0.9,
        bi_weekly: 0.95,
        monthly: 1.0,
        quarterly: 1.1,
      };

      // Use the serviceType prop instead of form data
      const facilitySize = parseFloat(
        String(formData.global_inputs?.facility_size || 0)
      );
      const frequency = formData.global_inputs?.service_frequency || 'one_time';

      let basePrice = 0;
      let laborHours = 0;
      const windowCount = formData.service_specific_data?.window_count || 1;

      if (serviceType === 'window') {
        basePrice = windowCount * baseRates[serviceType];
        laborHours = Math.ceil(windowCount / 10); // 10 windows per hour
      } else {
        basePrice = facilitySize * baseRates[serviceType];
        laborHours = Math.ceil(facilitySize / 500); // 500 sq ft per hour base
      }

      // Apply frequency multiplier
      const frequencyMultiplier = frequencyMultipliers[frequency] || 1.0;
      basePrice *= frequencyMultiplier;

      // Add service-specific adjustments
      let adjustments = 0;
      const serviceData = formData.service_specific_data || {};

      if (serviceType === 'residential') {
        if (serviceData.pets) adjustments += 25;
        if (!serviceData.cleaning_supplies_provided) adjustments += 15;
      } else if (serviceType === 'commercial') {
        if (serviceData.cleaning_schedule_preference === 'after_hours')
          adjustments += 50;
        if (serviceData.employee_count > 50) adjustments += 75;
      } else if (serviceType === 'carpet') {
        if (serviceData.pet_odors) adjustments += 50;
        if (serviceData.protection_treatment) adjustments += 35;
      } else if (serviceType === 'window') {
        if (serviceData.screen_cleaning) adjustments += windowCount * 2;
        if (serviceData.sill_cleaning) adjustments += windowCount * 1.5;
        if (serviceData.story_height === 'two') adjustments += basePrice * 0.25;
        if (serviceData.story_height === 'three_plus')
          adjustments += basePrice * 0.5;
      } else if (serviceType === 'floor') {
        if (serviceData.furniture_moving) adjustments += 75;
        if (serviceData.drying_time_preference === 'quick_dry')
          adjustments += 25;
      }

      const subtotal = basePrice + adjustments;
      const laborRate = 35; // Default labor rate
      const laborCost = laborHours * laborRate;
      const overhead = subtotal * 0.15; // 15% overhead
      const margin = subtotal * 0.25; // 25% margin
      const total = subtotal + overhead + margin;

      const totalPrice = basePrice + adjustments;
      const pricing = {
        price_range: {
          low: Math.round(totalPrice * 0.9 * 100) / 100,
          high: Math.round(totalPrice * 1.1 * 100) / 100,
        },
        hours_estimate: {
          min: Math.ceil((facilitySize * 0.5) / 60),
          max: Math.ceil((facilitySize * 0.8) / 60),
        },
        assumptions: {
          labor_rate: settings?.labor_rate || 25,
          overhead_percentage: settings?.overhead_percentage || 20,
          margin_percentage: settings?.margin_percentage || 15,
          production_rate: {
            min: 50,
            max: 100,
          },
        },
      };

      setCalculatedPricing(pricing);
      // Use setValue with { shouldValidate: false, shouldTouch: false } to prevent triggering submission
      form.setValue('pricing_data', pricing, { shouldValidate: false, shouldTouch: false });
      
      toast.success('Pricing calculated successfully');
    } catch (error) {
      console.error('Error calculating pricing:', error);
      toast.error('Failed to calculate pricing');
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when key values change
  useEffect(() => {
    const [facilitySize, frequency, serviceSpecificData] = watchedValues;

    // Create a trigger string to detect if values actually changed
    const currentTrigger = `${facilitySize}-${frequency}-${JSON.stringify(
      serviceSpecificData
    )}`;

    if (
      enabled &&
      serviceType &&
      facilitySize &&
      frequency &&
      currentTrigger !== lastCalculationTrigger &&
      !isCalculating
    ) {
      setLastCalculationTrigger(currentTrigger);
  
      // Add a flag to prevent auto-submission during calculation
      const timer = setTimeout(() => {
        calculatePricing();
      }, 1000); // Increase debounce time
  
      return () => clearTimeout(timer);
    }
  }, [
    watchedValues,
    enabled,
    serviceType,
    lastCalculationTrigger,
    isCalculating,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePricingToggle = (checked: boolean) => {
    onEnabledChange(checked);
    form.setValue('pricing_enabled', checked);
    if (!checked) {
      setCalculatedPricing(null);
      form.setValue('pricing_data', undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Pricing Calculation</h2>
          <p className="text-muted-foreground">
            Review and adjust the calculated pricing for this proposal.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Enable Pricing</span>
          <Switch checked={enabled} onCheckedChange={handlePricingToggle} />
        </div>
      </div>

      {enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Pricing Breakdown</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={calculatePricing}
                  disabled={isCalculating}
                  className="ml-auto"
                >
                  {isCalculating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Recalculate
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {calculatedPricing ? (
                <div className="space-y-4">
                  {/* Price Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Price Range (Low):
                        </span>
                        <span className="font-medium">
                          {formatCurrency(calculatedPricing.price_range.low)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Price Range (High):
                        </span>
                        <span className="font-medium">
                          {formatCurrency(calculatedPricing.price_range.high)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Hours Estimate (Min):
                        </span>
                        <span className="font-medium">
                          {calculatedPricing.hours_estimate.min}h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Hours Estimate (Max):
                        </span>
                        <span className="font-medium">
                          {calculatedPricing.hours_estimate.max}h
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Assumptions */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      Pricing Assumptions:
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Labor Rate:
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            calculatedPricing.assumptions.labor_rate
                          )}
                          /h
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Overhead:
                        </span>
                        <span className="font-medium">
                          {calculatedPricing.assumptions.overhead_percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Margin:
                        </span>
                        <span className="font-medium">
                          {calculatedPricing.assumptions.margin_percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Production Rate:
                        </span>
                        <span className="font-medium">
                          {calculatedPricing.assumptions.production_rate.min}-
                          {calculatedPricing.assumptions.production_rate.max} sq
                          ft/h
                        </span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Estimated Total */}
                  <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                    <span className="text-lg font-semibold">
                      Estimated Price Range:
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(calculatedPricing.price_range.low)} -{' '}
                      {formatCurrency(calculatedPricing.price_range.high)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Complete the service details to calculate pricing</p>
                  <Button
                    type="button"
                    onClick={calculatePricing}
                    disabled={isCalculating}
                    className="mt-4"
                  >
                    Calculate Pricing
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <AIContentGenerator
          form={form.getValues()}
          generatedContent={form.watch('generated_content') || ''}
          onContentGenerated={(content) => {
            form.setValue('generated_content', content);
          }}
          onError={(error) => {
            toast.error(error);
          }}
          onGeneratingChange={onGeneratingChange}
        />
      </Card>
    </div>
  );
}
