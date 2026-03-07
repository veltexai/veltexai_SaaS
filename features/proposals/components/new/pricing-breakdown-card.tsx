import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { CalculatedPricing } from "../../types/pricing";
import { PricingRow } from "./pricing-row";

interface PricingBreakdownCardProps {
  pricing: CalculatedPricing;
}

export function PricingBreakdownCard({ pricing }: PricingBreakdownCardProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <PricingRow
            label="Price Range (Low)"
            value={formatCurrency(pricing.price_range.low)}
          />
          <PricingRow
            label="Price Range (High)"
            value={formatCurrency(pricing.price_range.high)}
          />
        </div>
        <div className="space-y-2">
          <PricingRow
            label="Hours Estimate (Min)"
            value={`${pricing.hours_estimate.min}h`}
          />
          <PricingRow
            label="Hours Estimate (Max)"
            value={`${pricing.hours_estimate.max}h`}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <h4 className="font-medium text-sm">Pricing Assumptions:</h4>
        <div className="grid grid-cols-2 gap-4">
          <PricingRow
            label="Labor Rate"
            value={`${formatCurrency(pricing.assumptions.labor_rate)}/h`}
          />
          <PricingRow
            label="Overhead"
            value={`${pricing.assumptions.overhead_percentage}%`}
          />
          <PricingRow
            label="Margin"
            value={`${pricing.assumptions.margin_percentage}%`}
          />
          <PricingRow
            label="Production Rate"
            value={`${pricing.assumptions.production_rate.min}–${pricing.assumptions.production_rate.max} sq ft/h`}
          />
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
        <span className="text-lg font-semibold">Estimated Price Range:</span>
        <span className="text-2xl font-bold text-primary">
          {formatCurrency(pricing.price_range.low)} –{" "}
          {formatCurrency(pricing.price_range.high)}
        </span>
      </div>
    </div>
  );
}
