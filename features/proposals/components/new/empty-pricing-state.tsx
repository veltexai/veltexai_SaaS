import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";

interface EmptyPricingStateProps {
  onCalculate: () => void;
  isCalculating: boolean;
}

export function EmptyPricingState({
  onCalculate,
  isCalculating,
}: EmptyPricingStateProps) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Complete the service details to calculate pricing</p>
      <Button
        type="button"
        onClick={onCalculate}
        disabled={isCalculating}
        className="mt-4"
      >
        {isCalculating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Calculating...
          </>
        ) : (
          "Calculate Pricing"
        )}
      </Button>
    </div>
  );
}
