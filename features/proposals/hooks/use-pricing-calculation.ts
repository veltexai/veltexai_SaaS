import { useFormContext } from "react-hook-form";
import { CalculatedPricing } from "../types/pricing";
import { ProposalFormData } from "@/lib/validations/proposal";
import { usePricingSettings } from "@/hooks/use-pricing-settings";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AREA_FREQUENCY_COST_FACTORS,
  PRICING_DEFAULTS,
} from "../constants/pricing";

interface UsePricingCalculationParams {
  serviceType: string;
  enabled: boolean;
  proposalId: string | undefined;
  existingPricingData: CalculatedPricing | null;
  onEnabledChange: (enabled: boolean) => void;
}

export function usePricingCalculation({
  serviceType,
  enabled,
  existingPricingData,
  onEnabledChange,
}: UsePricingCalculationParams) {
  const form = useFormContext<ProposalFormData>();
  const { settings } = usePricingSettings();

  const [calculatedPricing, setCalculatedPricing] =
    useState<CalculatedPricing | null>(() => {
      if (existingPricingData) return existingPricingData;
      const persisted = form.getValues("pricing_data");
      return (persisted as CalculatedPricing) ?? null;
    });

  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationTrigger, setLastCalculationTrigger] = useState("");

  // Sync if existingPricingData arrives after mount (e.g. async load)
  useEffect(() => {
    if (existingPricingData && !calculatedPricing) {
      setCalculatedPricing(existingPricingData);
    }
  }, [existingPricingData, calculatedPricing]);

  const setFormPricing = useCallback(
    (pricing: CalculatedPricing | undefined) => {
      form.setValue("pricing_data", pricing, {
        shouldValidate: false,
        shouldTouch: false,
        shouldDirty: false,
      });
    },
    [form],
  );

  const calculatePricing = useCallback(async () => {
    setIsCalculating(true);
    onEnabledChange(true);

    try {
      const formData = form.getValues();
      const facilitySize = formData.global_inputs?.facility_size;
      const globalFrequency = formData.global_inputs?.service_frequency;
      const serviceSpecificData = formData.service_specific_data;
      const areasIncluded: string[] =
        formData.service_scope?.areas_included ?? [];
      const frequencyDetails = (formData.service_scope?.frequency_details ??
        {}) as Record<string, string>;

      const hasAreaFrequencies =
        areasIncluded.length > 0 && Object.keys(frequencyDetails).length > 0;

      if (!facilitySize || facilitySize <= 0) {
        toast.error(
          "Please enter a valid facility size before calculating pricing",
        );
        return;
      }

      if (!globalFrequency && !hasAreaFrequencies) {
        toast.error(
          "Please select a service frequency or add areas with frequencies",
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

      const serviceTypeRates =
        (settings?.service_type_rates as Record<string, number>) ??
        PRICING_DEFAULTS.serviceTypeRates;

      const frequencyMultipliers =
        (settings?.frequency_multipliers as Record<string, number>) ??
        PRICING_DEFAULTS.frequencyMultipliers;

      const laborRate = settings?.labor_rate ?? PRICING_DEFAULTS.laborRate;
      const overheadPercentage =
        settings?.overhead_percentage ?? PRICING_DEFAULTS.overheadPercentage;
      const marginPercentage =
        settings?.margin_percentage ?? PRICING_DEFAULTS.marginPercentage;

      const parsedFacilitySize = parseFloat(String(facilitySize));
      const windowCount =
        (formData.service_specific_data?.window_count as number) ?? 1;

      let basePrice: number;
      let laborHours: number;

      if (serviceType === "window") {
        basePrice =
          windowCount *
          (serviceTypeRates[serviceType] ??
            PRICING_DEFAULTS.serviceTypeRates.window);
        laborHours = Math.ceil(
          windowCount / PRICING_DEFAULTS.windowsPerLaborHour,
        );
      } else {
        basePrice =
          parsedFacilitySize *
          (serviceTypeRates[serviceType] ??
            PRICING_DEFAULTS.serviceTypeRates.commercial);
        laborHours = Math.ceil(
          parsedFacilitySize / PRICING_DEFAULTS.sqFtPerLaborHour,
        );
      }

      let effectiveMultiplier: number;

      if (hasAreaFrequencies) {
        const multipliers = areasIncluded.map((area) => {
          const areaFreq = frequencyDetails[area] ?? "1x_weekly";
          return (
            AREA_FREQUENCY_COST_FACTORS[areaFreq] ??
            frequencyMultipliers[areaFreq] ??
            1.0
          );
        });
        effectiveMultiplier =
          multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
      } else {
        effectiveMultiplier = frequencyMultipliers[globalFrequency!] ?? 1.0;
      }

      const adjustedPrice = basePrice * effectiveMultiplier;
      const laborCost = laborHours * laborRate;
      const overhead = adjustedPrice * (overheadPercentage / 100);
      const margin = adjustedPrice * (marginPercentage / 100);
      const totalPrice = adjustedPrice + laborCost + overhead + margin;

      const pricing: CalculatedPricing = {
        price_range: {
          low: totalPrice * PRICING_DEFAULTS.priceRangeLowFactor,
          high: totalPrice * PRICING_DEFAULTS.priceRangeHighFactor,
        },
        hours_estimate: {
          min: laborHours,
          max: Math.ceil(laborHours * 1.5),
        },
        assumptions: {
          labor_rate: laborRate,
          overhead_percentage: overheadPercentage,
          margin_percentage: marginPercentage,
          production_rate: { min: 50, max: 100 },
        },
      };

      setCalculatedPricing(pricing);
      setFormPricing(pricing);
      toast.success("Pricing calculated successfully");
    } catch (err) {
      console.error("Error calculating pricing:", err);
      toast.error("Failed to calculate pricing");
    } finally {
      setIsCalculating(false);
    }
  }, [form, serviceType, settings, onEnabledChange, setFormPricing]);

  // Auto-recalculate when watched values change
  const watchedValues = form.watch([
    "global_inputs.facility_size",
    "global_inputs.service_frequency",
    "service_specific_data",
    "service_scope.areas_included",
    "service_scope.frequency_details",
  ]);

  useEffect(() => {
    const [
      facilitySize,
      frequency,
      serviceSpecificData,
      areasIncluded,
      frequencyDetails,
    ] = watchedValues;

    const currentTrigger = `${facilitySize ?? 0}-${frequency ?? "one-time"}-${JSON.stringify(serviceSpecificData ?? {})}-${JSON.stringify(areasIncluded ?? [])}-${JSON.stringify(frequencyDetails ?? {})}`;

    const hasFrequencyInput =
      frequency ||
      (Array.isArray(areasIncluded) &&
        areasIncluded.length > 0 &&
        Object.keys((frequencyDetails as Record<string, string>) ?? {}).length >
          0);

    const parsedSize = parseFloat(String(facilitySize ?? 0));

    if (
      enabled &&
      serviceType &&
      parsedSize > 0 &&
      hasFrequencyInput &&
      currentTrigger !== lastCalculationTrigger &&
      !isCalculating
    ) {
      setLastCalculationTrigger(currentTrigger);
      const timer = setTimeout(calculatePricing, 1000);
      return () => clearTimeout(timer);
    }
  }, [
    watchedValues,
    enabled,
    serviceType,
    lastCalculationTrigger,
    isCalculating,
    calculatePricing,
  ]);

  const clearPricing = useCallback(() => {
    setCalculatedPricing(null);
    setFormPricing(undefined);
  }, [setFormPricing]);

  return { calculatedPricing, isCalculating, calculatePricing, clearPricing };
}
