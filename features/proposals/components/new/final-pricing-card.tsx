import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/utils";
import { DollarSign, Info } from "lucide-react";
import { PricingRow } from "./pricing-row";
import { Separator } from "@/components/ui/separator";
import { AddonItem, CalculatedPricing } from "../../types/pricing";

interface FinalPricingCardProps {
  basePrice: number;
  monthlyAddonsTotal: number;
  oneTimeAddons: AddonItem[];
  pricing: CalculatedPricing | null;
}

export function FinalPricingCard({
  basePrice,
  monthlyAddonsTotal,
  oneTimeAddons,
  pricing,
}: FinalPricingCardProps) {
  const tooltipText = pricing?.price_range
    ? `The base price is calculated as the midpoint of the estimated range (${formatCurrency(pricing.price_range.low)} – ${formatCurrency(pricing.price_range.high)}).`
    : "This is the estimated monthly price including base service and monthly add-ons.";

  return (
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
                  <p>{tooltipText}</p>
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
            <PricingRow
              label="Base Service (Monthly)"
              value={formatCurrency(basePrice)}
            />
            <PricingRow
              label="Monthly Add-ons"
              value={formatCurrency(monthlyAddonsTotal)}
            />
            <Separator />
          </div>
        )}

        {oneTimeAddons.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">One-Time Charges</h4>
            <div className="space-y-2">
              {oneTimeAddons.map((addon) => (
                <div key={addon.id} className="flex justify-between text-sm">
                  <span>{addon.label}</span>
                  <span className="font-medium">
                    {formatCurrency(addon.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
