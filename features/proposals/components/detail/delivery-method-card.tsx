import { RadioGroupItem } from "@/components/ui/radio-group";
import { DeliveryMethodOption } from "../../constants/delivery-methods";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DeliveryMethodCardProps {
  option: DeliveryMethodOption;
}

export function DeliveryMethodCard({ option }: DeliveryMethodCardProps) {
  const Icon = option.icon;
  return (
    <div
      className={cn(
        "flex items-center space-x-2 border rounded-lg p-4",
        option.disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <RadioGroupItem
        value={option.value}
        id={option.value}
        disabled={option.disabled}
      />
      <div className="flex-1">
        <Label
          htmlFor={option.value}
          className={cn(
            "flex items-center gap-2 font-medium",
            option.disabled && "text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
          {option.label}
          {option.phase && (
            <Badge variant="outline" className="ml-2">
              {option.phase}
            </Badge>
          )}
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          {option.description}
        </p>
      </div>
    </div>
  );
}
