import { type AiTone } from "@/types/proposal";
import { useCallback, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Calculator, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import { type ProposalFormData } from "@/lib/validations/proposal";
import { AIContentGenerator } from "./ai-content-generator";
import { AddonItem, CalculatedPricing } from "../../types/pricing";
import { usePricingSettings } from "@/hooks/use-pricing-settings";
import { usePricingCalculation } from "../../hooks/use-pricing-calculation";
import { usePricingAddons } from "../../hooks/use-pricing-addons";
import { deriveBasePrice } from "../../utils/derive-base-price";
import { isValidPricingData } from "../../utils/is-valid-pricing-data";
import { PricingBreakdownCard } from "./pricing-breakdown-card";
import { EmptyPricingState } from "./empty-pricing-state";
import { FinalPricingCard } from "./final-pricing-card";

interface PricingSectionProps {
  proposalId?: string;
  serviceType: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onPricingCalculated?: (pricing: CalculatedPricing) => void;
  currentStep?: number;
  onGeneratingChange?: (generating: boolean) => void;
  selectedTone?: AiTone;
  onToneChange?: (tone: AiTone) => void;
  existingPricingData?: CalculatedPricing | null;
}

export function PricingSection({
  proposalId,
  serviceType,
  enabled,
  onEnabledChange,
  onGeneratingChange,
  selectedTone = "professional",
  onToneChange,
  existingPricingData = null,
}: PricingSectionProps) {
  const form = useFormContext<ProposalFormData>();
  const { loading: isLoadingPricingSettings } = usePricingSettings();

  const { calculatedPricing, isCalculating, calculatePricing, clearPricing } =
    usePricingCalculation({
      serviceType,
      enabled,
      proposalId,
      existingPricingData,
      onEnabledChange,
    });

  const { addons } = usePricingAddons(proposalId);

  const formSelectedAddons =
    (form.getValues(
      "selected_addons" as keyof ProposalFormData,
    ) as AddonItem[]) ?? [];
  const sourceAddons: AddonItem[] = proposalId ? addons : formSelectedAddons;

  const basePrice = useMemo(
    () => deriveBasePrice(calculatedPricing),
    [calculatedPricing],
  );

  const monthlyAddonsTotal = useMemo(() => {
    return sourceAddons.reduce((sum, addon) => {
      if (
        addon.monthly_amount !== null &&
        Number.isFinite(Number(addon.monthly_amount))
      ) {
        return sum + Number(addon.monthly_amount);
      }
      const freq = String(addon.frequency ?? "").toLowerCase();
      const subtotal = Number.isFinite(Number(addon.subtotal))
        ? Number(addon.subtotal)
        : (Number(addon.rate) || 0) * (Number(addon.qty) || 0);

      if (freq === "monthly") return sum + subtotal;
      if (freq === "quarterly") return sum + subtotal / 3;
      if (freq === "annual") return sum + subtotal / 12;
      if (freq === "one_time") return sum + subtotal / 12;
      return sum;
    }, 0);
  }, [sourceAddons]);

  const oneTimeAddons = useMemo(() => {
    return sourceAddons.filter((addon) => {
      const freq = String(addon.frequency ?? "").toLowerCase();
      return (
        freq === "one_time" ||
        (addon.monthly_amount === null &&
          !["monthly", "quarterly", "annual"].includes(freq))
      );
    });
  }, [sourceAddons]);

  const handlePricingToggle = useCallback(
    (checked: boolean) => {
      onEnabledChange(checked);
      form.setValue("pricing_enabled", checked, {
        shouldValidate: false,
        shouldTouch: false,
        shouldDirty: false,
      });
      if (!checked) clearPricing();
    },
    [onEnabledChange, form, clearPricing],
  );

  const handleContentGenerated = useCallback(
    (content: string) => {
      form.setValue("generated_content", content, {
        shouldValidate: false,
        shouldTouch: false,
        shouldDirty: false,
      });
    },
    [form],
  );

  const handleContentError = useCallback((error: string) => {
    toast.error(error);
  }, []);

  const hasPricingData =
    isValidPricingData(existingPricingData) ||
    isValidPricingData(calculatedPricing);

  if (isLoadingPricingSettings) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading pricing settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
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
          <Switch checked={enabled} onCheckedChange={handlePricingToggle} />
        </div>
      </div>

      {enabled && (
        <>
          {/* Pricing Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Pricing Breakdown</span>
                {isValidPricingData(calculatedPricing) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={calculatePricing}
                    disabled={isCalculating}
                    className="ml-auto"
                    aria-label="Recalculate pricing"
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
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isValidPricingData(calculatedPricing) ? (
                <PricingBreakdownCard pricing={calculatedPricing} />
              ) : (
                <EmptyPricingState
                  onCalculate={calculatePricing}
                  isCalculating={isCalculating}
                />
              )}
            </CardContent>
          </Card>

          {/* Final Pricing */}
          <FinalPricingCard
            basePrice={basePrice}
            monthlyAddonsTotal={monthlyAddonsTotal}
            oneTimeAddons={oneTimeAddons}
            pricing={calculatedPricing}
          />
        </>
      )}

      {/* AI Generator — always visible */}
      <Card>
        <AIContentGenerator
          form={form.getValues()}
          selectedAddons={sourceAddons}
          generatedContent={form.watch("generated_content") || ""}
          onContentGenerated={handleContentGenerated}
          onError={handleContentError}
          onGeneratingChange={onGeneratingChange}
          selectedTone={selectedTone}
          onToneChange={onToneChange}
          pricingEnabled={enabled}
        />
      </Card>
    </div>
  );
}
