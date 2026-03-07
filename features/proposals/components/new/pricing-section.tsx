"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { type ProposalFormData } from "@/lib/validations/proposal";
import {
  Calculator,
  DollarSign,
  Clock,
  Users,
  Loader2,
  RefreshCw,
  Info,
} from "lucide-react";
``;
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePricingSettings } from "@/hooks/use-pricing-settings";
import { AIContentGenerator } from "./ai-content-generator";
import { createClient } from "@/lib/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiTone } from "@/types/proposal";

interface PricingSectionProps {
  proposalId?: string;
  serviceType: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPricingCalculated?: (pricing: any) => void;
  currentStep?: number;
  onGeneratingChange?: (generating: boolean) => void;
  selectedTone?: AiTone;
  onToneChange?: (tone: AiTone) => void;
  existingPricingData?: any; // Add prop for existing pricing data
}

export function PricingSection({
  proposalId,
  serviceType,
  enabled,
  onEnabledChange,
  currentStep,
  onGeneratingChange,
  selectedTone = "professional",
  onToneChange,
  existingPricingData, // Add the new prop
}: PricingSectionProps) {
  const form = useFormContext<ProposalFormData>();
  const { settings, loading, error } = usePricingSettings();
  const [isCalculating, setIsCalculating] = useState(false);
  // Initialize from existingPricingData prop OR from the form's persisted pricing_data.
  // This ensures pricing survives unmount/remount during step navigation (Back/Next).
  const [calculatedPricing, setCalculatedPricing] = useState<any>(() => {
    if (existingPricingData) return existingPricingData;
    const formPricingData = form.getValues("pricing_data");
    return formPricingData ?? null;
  });
  const [lastCalculationTrigger, setLastCalculationTrigger] =
    useState<string>("");
  const supabase = createClient();
  const [addons, setAddons] = useState<any[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);

  // Sync calculatedPricing if existingPricingData prop changes after mount
  useEffect(() => {
    if (existingPricingData && !calculatedPricing) {
      setCalculatedPricing(existingPricingData);
    }
  }, [existingPricingData, calculatedPricing]);

  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoadingAddons(true);
        const { data, error } = await supabase
          .from("proposal_additional_services")
          .select("*")
          .eq("proposal_id", proposalId)
          .order("created_at", { ascending: true });
        if (error) return;
        setAddons(data || []);
      } finally {
        setLoadingAddons(false);
      }
    };
    if (proposalId) fetchAddons();
  }, [proposalId, supabase]);

  const watchedValues = form.watch([
    "global_inputs.facility_size",
    "global_inputs.service_frequency",
    "service_specific_data",
  ]);

  // Default pricing settings to use when user settings are not available
  const defaultPricingSettings = {
    labor_rate: 35.0,
    overhead_percentage: 15.0,
    margin_percentage: 25.0,
    service_type_rates: {
      residential: 0.15,
      commercial: 0.12,
      carpet: 0.25,
      window: 8.0,
      floor: 0.2,
    },
    frequency_multipliers: {
      one_time: 1.0,
      weekly: 0.9,
      bi_weekly: 0.95,
      monthly: 1.0,
      quarterly: 1.1,
    },
  };

  const calculatePricing = async () => {
    setIsCalculating(true);
    onEnabledChange(true);
    try {
      const formData = form.getValues();
      const facilitySize = formData.global_inputs?.facility_size;
      const frequency = formData.global_inputs?.service_frequency;
      const serviceSpecificData = formData.service_specific_data;

      // Enhanced validation with better error messages
      if (!facilitySize || facilitySize <= 0) {
        toast.error(
          "Please enter a valid facility size before calculating pricing",
        );
        return;
      }

      if (!frequency) {
        toast.error(
          "Please select a service frequency before calculating pricing",
        );
        return;
      }

      if (
        !serviceSpecificData ||
        Object.keys(serviceSpecificData).length === 0
      ) {
        toast.error(
          "Please fill in service-specific details before calculating pricing",
        );
        return;
      }

      // Use settings if available, otherwise use defaults
      const pricingSettings = settings || defaultPricingSettings;

      // Basic pricing calculation logic
      const baseRates: Record<string, number> =
        (pricingSettings.service_type_rates as Record<string, number>) || {
          residential: 0.15, // per sq ft
          commercial: 0.12,
          carpet: 0.25,
          window: 8.0, // per window
          floor: 0.2,
        };

      const frequencyMultipliers: Record<string, number> =
        (pricingSettings.frequency_multipliers as Record<string, number>) || {
          one_time: 1.0,
          weekly: 0.9,
          bi_weekly: 0.95,
          monthly: 1.0,
          quarterly: 1.1,
        };

      // Parse facility size for calculations
      const parsedFacilitySize = parseFloat(String(facilitySize || 0));

      let basePrice = 0;
      let laborHours = 0;
      const windowCount = formData.service_specific_data?.window_count || 1;

      if (serviceType === "window") {
        basePrice = windowCount * baseRates[serviceType];
        laborHours = Math.ceil(windowCount / 10); // 10 windows per hour
      } else {
        basePrice = parsedFacilitySize * baseRates[serviceType];
        laborHours = Math.ceil(parsedFacilitySize / 1000); // 1000 sq ft per hour
      }

      const frequencyMultiplier = frequencyMultipliers[frequency] || 1.0;
      const adjustedPrice = basePrice * frequencyMultiplier;

      // Calculate overhead and margin
      const laborCost = laborHours * (pricingSettings.labor_rate || 35);
      const overhead =
        adjustedPrice * ((pricingSettings.overhead_percentage || 15) / 100);
      const margin =
        adjustedPrice * ((pricingSettings.margin_percentage || 25) / 100);

      const totalPrice = adjustedPrice + laborCost + overhead + margin;
      const lowPrice = totalPrice * 0.9; // 10% lower
      const highPrice = totalPrice * 1.1; // 10% higher

      const pricing = {
        price_range: {
          low: lowPrice,
          high: highPrice,
        },
        hours_estimate: {
          min: laborHours,
          max: Math.ceil(laborHours * 1.5),
        },
        assumptions: {
          labor_rate: pricingSettings.labor_rate || 35,
          overhead_percentage: pricingSettings.overhead_percentage || 15,
          margin_percentage: pricingSettings.margin_percentage || 25,
          production_rate: {
            min: 50,
            max: 100,
          },
        },
      };

      setCalculatedPricing(pricing);
      // Fix: Use setValue with proper options to prevent triggering form validation and submission
      form.setValue("pricing_data", pricing, {
        shouldValidate: false,
        shouldTouch: false,
        shouldDirty: false,
      });

      toast.success("Pricing calculated successfully");
    } catch (error) {
      console.error("Error calculating pricing:", error);
      toast.error("Failed to calculate pricing");
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when key values change
  useEffect(() => {
    const [facilitySize, frequency, serviceSpecificData] = watchedValues;

    // Safely handle potential null/undefined values
    const safeFacilitySize = facilitySize || 0;
    const safeFrequency = frequency || "one-time";
    const safeServiceSpecificData = serviceSpecificData || {};

    // Create a trigger string to detect if values actually changed
    const currentTrigger = `${safeFacilitySize}-${safeFrequency}-${JSON.stringify(
      safeServiceSpecificData,
    )}`;

    if (
      enabled &&
      serviceType &&
      safeFacilitySize > 0 && // Only auto-calculate if facility size is greater than 0
      safeFrequency &&
      currentTrigger !== lastCalculationTrigger &&
      !isCalculating
    ) {
      setLastCalculationTrigger(currentTrigger);

      // Add a flag to prevent auto-submission during calculation
      const timer = setTimeout(() => {
        calculatePricing();
      }, 1000);

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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const basePrice = useMemo(() => {
    const p = calculatedPricing || existingPricingData || null;
    if (!p) return 0;
    if (typeof p.total === "number") return p.total;
    if (typeof p.enhanced_total === "number") return p.enhanced_total;
    const low = p.price_range?.low;
    const high = p.price_range?.high;
    if (typeof low === "number" && typeof high === "number")
      return (low + high) / 2;
    if (typeof low === "number") return low;
    if (typeof high === "number") return high;
    return 0;
  }, [calculatedPricing, existingPricingData]);

  const selectedAddons = form.getValues("selected_addons" as any) || [];
  const sourceAddons = proposalId ? addons : selectedAddons;

  // Calculate monthly total for recurring addons (monthly, quarterly, annual)
  // This properly handles amortization for quarterly and annual frequencies
  const monthlyAddonsTotal = useMemo(() => {
    return (sourceAddons as any[]).reduce((sum, a) => {
      // If monthly_amount is already calculated, use it
      const m = a.monthly_amount;
      if (m !== null && m !== undefined && Number.isFinite(Number(m))) {
        return sum + Number(m);
      }

      // Calculate monthly equivalent based on frequency
      const freq = String(a.frequency || "").toLowerCase();
      const subtotal = Number.isFinite(Number(a.subtotal))
        ? Number(a.subtotal)
        : (Number(a.rate) || 0) * (Number(a.qty) || 0);

      // Only include recurring frequencies in monthly total
      if (freq === "monthly") {
        return sum + subtotal;
      } else if (freq === "quarterly") {
        return sum + subtotal / 3;
      } else if (freq === "annual") {
        return sum + subtotal / 12;
      } else if (freq === "one_time") {
        return sum + subtotal / 12;
      }

      // One-time addons are not included in monthly total
      return sum;
    }, 0);
  }, [sourceAddons]);

  // Filter one-time addons for separate display
  const oneTimeAddons = useMemo(() => {
    return (sourceAddons as any[]).filter((a) => {
      const freq = String(a.frequency || "").toLowerCase();
      return (
        freq === "one_time" ||
        (a.monthly_amount === null &&
          !["monthly", "quarterly", "annual"].includes(freq))
      );
    });
  }, [sourceAddons]);

  const handlePricingToggle = (checked: boolean) => {
    onEnabledChange(checked);
    // Fix: Prevent validation triggers when toggling pricing
    form.setValue("pricing_enabled", checked, {
      shouldValidate: false,
      shouldTouch: false,
      shouldDirty: false,
    });
    if (!checked) {
      setCalculatedPricing(null);
      form.setValue("pricing_data", undefined, {
        shouldValidate: false,
        shouldTouch: false,
        shouldDirty: false,
      });
    }
  };

  // Show loading state while pricing settings are being fetched
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading pricing settings...</span>
        </div>
      </div>
    );
  }

  // Helper function to check if calculatedPricing is a valid object with data
  const isValidPricingData = (pricing: any): boolean => {
    if (!pricing || typeof pricing !== "object") return false;

    // Check if it's an empty object
    if (Object.keys(pricing).length === 0) return false;

    // Check if it has the required structure
    return !!(
      pricing.price_range?.low !== undefined &&
      pricing.price_range?.high !== undefined &&
      pricing.hours_estimate?.min !== undefined &&
      pricing.hours_estimate?.max !== undefined
    );
  };

  // Determine if pricing can be enabled (either has existing data or can calculate new)
  const hasPricingData =
    isValidPricingData(existingPricingData) ||
    isValidPricingData(calculatedPricing);

  return (
    <div className="space-y-6">
      <div className="flex sm:flex-row flex-col items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Pricing Calculation</h2>
          <p className="text-muted-foreground">
            {hasPricingData
              ? "Review labor + margin modeling for this client-ready output."
              : "Complete scope & frequency to run labor + margin modeling."}
          </p>
        </div>
        <div className="flex items-center sm:w-auto w-full justify-end space-x-2">
          <span className="text-sm font-medium">Enable Pricing</span>
          <Switch
            checked={enabled}
            onCheckedChange={handlePricingToggle}
            // disabled={hasPricingData}
          />
        </div>
      </div>

      {enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Pricing Breakdown</span>
                {/* <Button
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
                </Button> */}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isValidPricingData(calculatedPricing) ? (
                <div className="space-y-4">
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
                            calculatedPricing.assumptions.labor_rate,
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

                  <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                    <span className="text-lg font-semibold">
                      Estimated Price Range:
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(calculatedPricing.price_range.low)} -{" "}
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Final Pricing</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    Monthly Total (Base + Add-ons)
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          This is the estimated monthly price including base
                          service and monthly add-ons.
                          {calculatedPricing?.price_range?.low &&
                            calculatedPricing?.price_range?.high &&
                            ` The base price is calculated as the midpoint of the estimated range (${formatCurrency(calculatedPricing.price_range.low)} - ${formatCurrency(calculatedPricing.price_range.high)}).`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(basePrice + monthlyAddonsTotal)}
                </span>
              </div>

              {monthlyAddonsTotal > 0 && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Base Service (Monthly)</span>
                    <span className="font-medium">
                      {formatCurrency(basePrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Monthly Add-ons</span>
                    <span className="font-medium">
                      {formatCurrency(monthlyAddonsTotal)}
                    </span>
                  </div>
                  <Separator />
                </div>
              )}

              {oneTimeAddons.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">One-Time Charges</h4>
                  <div className="space-y-2">
                    {oneTimeAddons.map((a: any) => (
                      <div key={a.id} className="flex justify-between text-sm">
                        <span>{a.label}</span>
                        <span className="font-medium">
                          {formatCurrency(a.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <AIContentGenerator
          form={form.getValues()}
          selectedAddons={sourceAddons as any[]}
          generatedContent={form.watch("generated_content") || ""}
          onContentGenerated={(content) => {
            // Fix: Prevent validation triggers when setting generated content
            form.setValue("generated_content", content, {
              shouldValidate: false,
              shouldTouch: false,
              shouldDirty: false,
            });
          }}
          onError={(error) => {
            toast.error(error);
          }}
          onGeneratingChange={onGeneratingChange}
          selectedTone={selectedTone}
          onToneChange={onToneChange}
          pricingEnabled={enabled}
        />
      </Card>
    </div>
  );
}
